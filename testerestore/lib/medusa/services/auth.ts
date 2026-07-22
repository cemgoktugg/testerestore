import { medusa } from "../client";
import { MEDUSA_READY } from "../config";
import type { HttpTypes } from "@medusajs/types";

export type StoreCustomer = HttpTypes.StoreCustomer;
export type StoreCustomerAddress = HttpTypes.StoreCustomerAddress;

/**
 * Customer auth wrapper around the Medusa v2 SDK.
 *
 * Medusa v2 auth flow:
 *   1. POST /auth/customer/emailpass            → login (returns JWT)
 *   2. POST /auth/customer/emailpass/register   → register-token (use to create customer)
 *   3. POST /store/customers                    → create customer with the register token
 *   4. POST /auth/customer/emailpass/reset-password    → request reset email
 *   5. POST /auth/customer/emailpass/update           → set new password with token
 *
 * The SDK manages the JWT (auth.type set in client.ts).
 */

export interface RegisterInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Log a customer in. Returns the customer on success, throws on bad creds. */
export async function login(input: LoginInput): Promise<StoreCustomer | null> {
  if (!MEDUSA_READY) return null;
  await medusa.auth.login("customer", "emailpass", input);
  const { customer } = await medusa.store.customer.retrieve();
  return customer as StoreCustomer;
}

/** Register + immediately authenticate. */
export async function register(input: RegisterInput): Promise<StoreCustomer | null> {
  if (!MEDUSA_READY) return null;
  // Step 1: get a register token
  await medusa.auth.register("customer", "emailpass", {
    email: input.email,
    password: input.password,
  });
  // Step 2: create the customer using the same authenticated session
  const { customer } = await medusa.store.customer.create({
    email: input.email,
    first_name: input.first_name || "",
    last_name: input.last_name || "",
    phone: input.phone,
  });
  // Step 3: immediately log them in so the JWT becomes "authenticated" rather than "register"
  await medusa.auth.login("customer", "emailpass", {
    email: input.email,
    password: input.password,
  });
  return customer as StoreCustomer;
}

export async function logout(): Promise<void> {
  if (!MEDUSA_READY) return;
  try {
    await medusa.auth.logout();
  } catch {
    /* ignore — already logged out */
  }
}

/** Returns the current customer or null when not logged in. */
export async function getCurrentCustomer(): Promise<StoreCustomer | null> {
  if (!MEDUSA_READY) return null;
  try {
    const { customer } = await medusa.store.customer.retrieve();
    return (customer as StoreCustomer) || null;
  } catch {
    return null;
  }
}

/** Update customer profile fields (first name, last name, phone, etc). */
export async function updateCustomer(
  data: Partial<Pick<StoreCustomer, "first_name" | "last_name" | "phone" | "company_name">>
): Promise<StoreCustomer | null> {
  if (!MEDUSA_READY) return null;
  const { customer } = await medusa.store.customer.update(data);
  return customer as StoreCustomer;
}

// ---------- Addresses ----------

export interface AddressInput {
  first_name: string;
  last_name: string;
  phone?: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  postal_code?: string;
  country_code: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

export async function listAddresses(): Promise<StoreCustomerAddress[]> {
  if (!MEDUSA_READY) return [];
  const { addresses } = await medusa.store.customer.listAddress();
  return addresses as StoreCustomerAddress[];
}

export async function createAddress(input: AddressInput): Promise<StoreCustomerAddress | null> {
  if (!MEDUSA_READY) return null;
  const { customer } = await medusa.store.customer.createAddress(input);
  const list = customer.addresses as StoreCustomerAddress[];
  return list[list.length - 1] || null;
}

export async function updateAddress(
  id: string,
  input: Partial<AddressInput>
): Promise<void> {
  if (!MEDUSA_READY) return;
  await medusa.store.customer.updateAddress(id, input);
}

export async function deleteAddress(id: string): Promise<void> {
  if (!MEDUSA_READY) return;
  await medusa.store.customer.deleteAddress(id);
}

// ---------- Password reset ----------

/** Send a password reset email. */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!MEDUSA_READY) return;
  await medusa.auth.resetPassword("customer", "emailpass", { identifier: email });
}

/** Complete password reset with token from email. */
export async function completePasswordReset(token: string, password: string): Promise<void> {
  if (!MEDUSA_READY) return;
  await medusa.auth.updateProvider(
    "customer",
    "emailpass",
    { password },
    token
  );
}

// ---------- Orders ----------

export async function listMyOrders(limit = 20): Promise<HttpTypes.StoreOrder[]> {
  if (!MEDUSA_READY) return [];
  try {
    // Türkçe durum etiketi (getOrderStatus) için üç statü alanı da gerekli;
    // list varsayılanlarında yalnızca `status` var, diğerlerini + ile ekle.
    const { orders } = await medusa.store.order.list({
      limit,
      fields: "+status,+payment_status,+fulfillment_status",
    });
    return orders as HttpTypes.StoreOrder[];
  } catch {
    return [];
  }
}

// `+` prefix = varsayılan alanlara EK olarak çek (payment_status, items vb.
// kaybolmasın). Kargo takibi için fulfillment + label'lar (tracking no/url).
const ORDER_DETAIL_EXTRA_FIELDS = [
  // metadata store retrieve varsayılanlarında YOK — açıkça ekle, yoksa
  // widget'ın yazdığı kargo bilgisi (carrier_name/tracking_number) gelmez.
  "+metadata",
  "+fulfillment_status",
  "+*fulfillments",
  "+*fulfillments.labels",
  "+fulfillments.shipped_at",
  "+fulfillments.delivered_at",
  "+fulfillments.packed_at",
].join(",");

export async function getOrder(id: string): Promise<HttpTypes.StoreOrder | null> {
  if (!MEDUSA_READY) return null;
  try {
    const { order } = await medusa.store.order.retrieve(id, {
      fields: ORDER_DETAIL_EXTRA_FIELDS,
    });
    return (order as HttpTypes.StoreOrder) || null;
  } catch {
    return null;
  }
}

/**
 * Müşterinin kendi siparişini iptal etmesi. Backend sahiplik + uygunluk
 * kontrolü yapar; ödeme alındıysa iyzico iadesi otomatik tetiklenir.
 * SDK JWT auth'u client.fetch ile otomatik gönderilir.
 */
export async function cancelMyOrder(
  orderId: string
): Promise<{ ok: boolean; message: string }> {
  if (!MEDUSA_READY) return { ok: false, message: "Bağlantı kurulamadı." };
  try {
    const res = (await medusa.client.fetch(`/store/orders/${orderId}/cancel`, {
      method: "POST",
    })) as { ok?: boolean; message?: string };
    return { ok: true, message: res?.message || "Siparişiniz iptal edildi." };
  } catch (e: unknown) {
    // SDK non-2xx'te throw eder — sunucunun Türkçe mesajını yakalamaya çalış.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    const message =
      err?.message ||
      "Sipariş iptal edilemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.";
    return { ok: false, message: String(message) };
  }
}
