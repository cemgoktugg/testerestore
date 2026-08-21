/**
 * POST /store/advisor-signup
 *
 * Şerit testere danışmanı (chat) üzerinden satın alma akışının sunucu ucu.
 * Sohbette toplanan bilgilerle TEK istekte şunları yapar:
 *
 *   1. Hesap açar (rastgele geçici şifre, `must_change_password: true`)
 *   2. Müşteri adresini kaydeder (varsayılan teslimat + fatura)
 *   3. Sepeti oluşturur, önerilen ürünü ekler (fiyat sunucudan — matris)
 *   4. Kargoyu eşiğe göre seçer (sunucu-güvenli)
 *   5. Geçici şifreyi e-postayla gönderir
 *
 * Ödeme BU AKIŞTA YOK — iyzico 3D Secure kart verisini kendi formunda ister.
 * Sohbet sepeti hazırlar, müşteri /checkout'ta ödemeyi tamamlar.
 *
 * E-posta zaten kayıtlıysa hesap AÇILMAZ ve sepet o müşteriye BAĞLANMAZ
 * (kimliği doğrulanmadan hesabına yazmak hesap ele geçirme olurdu).
 * Sepet misafir sepeti olarak hazırlanır, sohbet "giriş yapın" der.
 *
 * Kötüye kullanıma karşı hız sınırı storefront proxy'sinde
 * (app/api/advisor/purchase/route.ts) — gerçek istemci IP'si orada görünüyor.
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { randomInt } from "crypto";
import {
  createCartWorkflow,
  createCustomerAccountWorkflow,
  createCustomerAddressesWorkflow,
  addToCartWorkflow,
} from "@medusajs/medusa/core-flows";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { computeBladeLine } from "../../../lib/blade-line";
import { applyAutoShipping } from "../../../lib/auto-shipping";
import { MIN_LENGTH_MM, MAX_LENGTH_MM } from "../blade-price/calculate/route";

// ── Doğrulama ────────────────────────────────────────────────────────────
// Telefon: TR cep formatları (05xx…, +905xx…, 5xx…). Rakam dışı her karakter
// atılıyor, sonra tek kalıpla doğrulanıyor. Kalıp storefront'taki PHONE_RE
// ile birebir aynı (app/components/advisor-purchase.ts) — aynı numaranın bir
// tarafta geçip diğerinde takılması diye bir durum olmasın.
const PhoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\D/g, ""))
  .refine((s) => /^(?:90)?0?5\d{9}$/.test(s), {
    message: "Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).",
  });

const ReadyMadeItem = z.object({
  kind: z.literal("ready_made"),
  handle: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
});

const ConfigurableItem = z.object({
  kind: z.literal("configurable"),
  handle: z.string().min(1),
  blade_type: z.string().min(1),
  width_mm: z.coerce.number().positive(),
  thickness_mm: z.coerce.number().positive(),
  tooth_pitch: z.string().min(1).nullable().optional(),
  length_mm: z.coerce
    .number()
    .min(MIN_LENGTH_MM, `Minimum uzunluk ${MIN_LENGTH_MM} mm olmalıdır.`)
    .max(MAX_LENGTH_MM, `Maksimum uzunluk ${MAX_LENGTH_MM} mm olmalıdır.`),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
});

const Schema = z.object({
  first_name: z.string().trim().min(2).max(60),
  last_name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  phone: PhoneSchema,
  address: z.object({
    address_1: z.string().trim().min(5).max(250),
    city: z.string().trim().min(2).max(60),
    province: z.string().trim().max(60).optional().nullable(),
    postal_code: z.string().trim().max(20).optional().nullable(),
  }),
  item: z.discriminatedUnion("kind", [ReadyMadeItem, ConfigurableItem]),
  /** KVKK aydınlatma + üyelik sözleşmesi onayı — sohbette açıkça alınıyor. */
  consent: z.literal(true),
  /** Yalnızca iz sürmek için; müşteri verisi değil. */
  advisor_session_id: z.string().max(80).optional().nullable(),
});

// Karıştırılabilir karakterler (0/O, 1/l/I) bilerek dışarıda: geçici şifre
// e-postadan elle kopyalanıyor, okunabilir olması gerekiyor.
const PW_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PW_ALPHABET[randomInt(0, PW_ALPHABET.length)];
  }
  return out;
}

// ── Hız sınırı (ikinci savunma hattı) ────────────────────────────────────
// Storefront proxy'sinde de sınır var ama oradan geçmek zorunlu değil: yayın
// anahtarı tarayıcı paketinde görünür, yani bu uç doğrudan da çağrılabilir.
// Hesap açan + e-posta gönderen bir uç için tek katman yetmez.
//
// Bellek içi: tek backend instance'ı var. Ölçeklenirse Redis'e taşınmalı
// (backend zaten Redis kullanıyor).
const RL_WINDOW_MS = 60 * 60_000;
const RL_MAX = 5;
const rlBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = rlBuckets.get(ip);
  if (!b || now >= b.resetAt) {
    rlBuckets.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    if (rlBuckets.size > 5000) {
      for (const [k, v] of rlBuckets) if (now >= v.resetAt) rlBuckets.delete(k);
    }
    return false;
  }
  b.count += 1;
  return b.count > RL_MAX;
}

function clientIp(req: MedusaRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  if (raw) return raw.split(",")[0].trim();
  return req.ip || "unknown";
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (rateLimited(clientIp(req))) {
    res.status(429).json({
      message:
        "Çok fazla kayıt denemesi yapıldı. Lütfen biraz bekleyip tekrar deneyin.",
      code: "RATE_LIMITED",
    });
    return;
  }

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Geçersiz bilgi",
      code: "VALIDATION_FAILED",
      errors: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  const data = parsed.data;
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // ── 1. Ürünü çöz ───────────────────────────────────────────────────────
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "status", "thumbnail", "variants.id"],
    filters: { handle: data.item.handle } as never,
  });
  const product = products?.[0];
  if (!product || product.status !== "published") {
    res.status(404).json({
      message: "Önerilen ürün bulunamadı.",
      code: "PRODUCT_NOT_FOUND",
    });
    return;
  }
  const variantId = product.variants?.[0]?.id as string | undefined;
  if (!variantId) {
    res.status(409).json({
      message: "Bu ürün şu anda satın alınabilir durumda değil.",
      code: "VARIANT_NOT_FOUND",
    });
    return;
  }

  // Yapılandırılabilir üründe fiyatı sepete eklemeden ÖNCE doğrula ki
  // fiyatsız kombinasyonda ortada boş hesap + boş sepet bırakmayalım.
  let bladePricing: Awaited<ReturnType<typeof computeBladeLine>> = null;
  if (data.item.kind === "configurable") {
    bladePricing = await computeBladeLine(req.scope, {
      blade_type: data.item.blade_type,
      width_mm: data.item.width_mm,
      thickness_mm: data.item.thickness_mm,
      tooth_pitch: data.item.tooth_pitch ?? null,
      length_mm: data.item.length_mm,
      quantity: data.item.quantity,
    });
    if (!bladePricing) {
      res.status(404).json({
        message: "Bu ölçü için fiyat tanımlı değil. Bizimle iletişime geçin.",
        code: "BLADE_PRICE_NOT_FOUND",
      });
      return;
    }
  }

  // ── 2. Bölge ───────────────────────────────────────────────────────────
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });
  const region =
    regions.find((r) =>
      (r.countries || []).some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => String(c?.iso_2 || "").toLowerCase() === "tr"
      )
    ) || regions[0];
  if (!region) {
    res.status(500).json({
      message: "Mağaza bölgesi tanımlı değil.",
      code: "REGION_NOT_FOUND",
    });
    return;
  }

  // ── 3. Hesap ───────────────────────────────────────────────────────────
  //
  // E-POSTA GÖNDERİLEMİYORSA HESAP AÇMIYORUZ. Geçici şifre bilerek sadece
  // e-postaya gidiyor — log'a da, API cevabına da yazılmıyor. RESEND_API_KEY
  // boşken (notification-resend "DRY RUN" moduna düşer) hesap açmak, müşteriye
  // hiçbir zaman giremeyeceği bir hesap vermek demek olurdu. O yüzden sepeti
  // misafir sepeti olarak hazırlayıp devam ediyoruz: sipariş verilebilir,
  // sadece üyelik oluşmaz.
  //
  // RESEND_API_KEY tanımlanır tanımlanmaz tam akış kendiliğinden devreye girer.
  const emailConfigured = !!process.env.RESEND_API_KEY;

  const authModule = req.scope.resolve(Modules.AUTH);
  let customerId: string | null = null;
  let accountStatus: "created" | "existing" | "email_unavailable" = "created";
  let tempPassword: string | null = null;

  if (!emailConfigured) {
    accountStatus = "email_unavailable";
    logger.warn(
      "[advisor-signup] RESEND_API_KEY tanımlı değil — hesap AÇILMADI, " +
        "misafir sepeti hazırlanıyor. Şifre teslim edilemeyeceği için üyelik atlandı."
    );
  }

  const generated = generateTempPassword();
  const registration = emailConfigured
    ? await authModule.register("emailpass", {
        body: { email: data.email, password: generated },
      })
    : { success: false as const, authIdentity: undefined };

  if (emailConfigured && registration.success && registration.authIdentity) {
    tempPassword = generated;
    try {
      const { result: customer } = await createCustomerAccountWorkflow(
        req.scope
      ).run({
        input: {
          authIdentityId: registration.authIdentity.id,
          customerData: {
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            metadata: {
              // Storefront ilk girişte bunu görüp şifre değiştirme ekranını
              // zorunlu kılıyor (bkz. ForcePasswordChange bileşeni).
              must_change_password: true,
              source: "advisor_chat",
              advisor_session_id: data.advisor_session_id ?? null,
            },
          },
        },
      });
      customerId = customer.id;
    } catch (e) {
      logger.error(
        `[advisor-signup] hesap oluşturulamadı (${data.email}): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      // Kimlik oluştu ama müşteri kaydı olmadı → ortada "sahipsiz" bir auth
      // identity kalır. Temizlemiyoruz çünkü emailpass sağlayıcısı bunu zaten
      // kendi iyileştiriyor: app_metadata boş olan kimlik "sahiplenilebilir"
      // sayılıyor ve sonraki register çağrısı onu güncelleyip başarı dönüyor
      // (auth-emailpass/services/emailpass.js:117). Yani kullanıcı tekrar
      // denediğinde akış normal şekilde tamamlanır.
      res.status(500).json({
        message: "Hesap oluşturulamadı. Lütfen tekrar deneyin.",
        code: "ACCOUNT_CREATE_FAILED",
      });
      return;
    }
  } else if (emailConfigured) {
    // Kimlik zaten var → hesap açmıyoruz, sepeti müşteriye BAĞLAMIYORUZ.
    accountStatus = "existing";
  }

  // ── 4. Adres (yalnızca yeni hesapta) ───────────────────────────────────
  const addressPayload = {
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone,
    address_1: data.address.address_1,
    city: data.address.city,
    province: data.address.province || undefined,
    postal_code: data.address.postal_code || undefined,
    country_code: "tr",
  };

  if (customerId) {
    try {
      await createCustomerAddressesWorkflow(req.scope).run({
        input: {
          addresses: [
            {
              ...addressPayload,
              customer_id: customerId,
              address_name: "Sohbetten kaydedilen adres",
              is_default_shipping: true,
              is_default_billing: true,
            },
          ],
        },
      });
    } catch (e) {
      // Adres kaydı sepeti bloklamamalı — sepetteki adres yine de dolu olacak.
      logger.warn(
        `[advisor-signup] adres kaydedilemedi (${data.email}): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  }

  // ── 5. Sepet ───────────────────────────────────────────────────────────
  // Satış kanalı yayın anahtarından okunuyor. Medusa'nın kendi /store/carts
  // ucu da bunu yapıyor (ensurePublishableKeyAndSalesChannelMatch); aynısını
  // yapmazsak sohbet sepeti mağazanın VARSAYILAN kanalına düşer ve ürün
  // uygunluğu/stok davranışı sitedeki sepetten farklı olabilir.
  // Anahtar birden çok kanala bağlıysa seçim belirsiz — o durumda Medusa'nın
  // varsayılan davranışına bırakıyoruz.
  const pubKeyChannels =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((req as any).publishable_key_context?.sales_channel_ids ?? []) as string[];
  const salesChannelId =
    pubKeyChannels.length === 1 ? pubKeyChannels[0] : undefined;

  let cartId: string;
  try {
    const { result: cart } = await createCartWorkflow(req.scope).run({
      input: {
        region_id: region.id,
        email: data.email,
        ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        ...(customerId ? { customer_id: customerId } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shipping_address: addressPayload as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        billing_address: addressPayload as any,
        // Hazır ürün normal varyant fiyatıyla eklenebilir; yapılandırılabilir
        // ürünün fiyatı matristen geldiği için aşağıda ayrıca ekleniyor.
        ...(data.item.kind === "ready_made"
          ? { items: [{ variant_id: variantId, quantity: data.item.quantity }] }
          : {}),
      },
    });
    cartId = cart.id;
  } catch (e) {
    logger.error(
      `[advisor-signup] sepet oluşturulamadı (${data.email}): ${
        e instanceof Error ? e.message : String(e)
      }`
    );
    res.status(500).json({
      message: "Sepet oluşturulamadı. Lütfen tekrar deneyin.",
      code: "CART_CREATE_FAILED",
    });
    return;
  }

  if (data.item.kind === "configurable" && bladePricing) {
    try {
      await addToCartWorkflow(req.scope).run({
        input: {
          cart_id: cartId,
          items: [
            {
              variant_id: variantId,
              quantity: data.item.quantity,
              unit_price: bladePricing.unit_price,
              metadata: bladePricing.metadata,
            },
          ],
        },
      });
    } catch (e) {
      logger.error(
        `[advisor-signup] ürün sepete eklenemedi (${data.email}): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      res.status(500).json({
        message: "Ürün sepete eklenemedi. Lütfen tekrar deneyin.",
        code: "CART_ADD_FAILED",
      });
      return;
    }
  }

  // ── 6. Kargo ───────────────────────────────────────────────────────────
  const shipping = await applyAutoShipping(req.scope, cartId);
  if (!shipping.ok) {
    // Kargo bağlanamazsa akış ölmesin — müşteri checkout'ta seçebilir.
    logger.warn(
      `[advisor-signup] kargo seçilemedi (${cartId}): ${shipping.message}`
    );
  }

  // ── 7. Hoş geldiniz e-postası ──────────────────────────────────────────
  let emailSent = false;
  if (tempPassword) {
    try {
      const notif = req.scope.resolve(Modules.NOTIFICATION);
      await notif.createNotifications([
        {
          to: data.email,
          channel: "email",
          template: "customer.welcome_chat",
          data: {
            first_name: data.first_name,
            email: data.email,
            temp_password: tempPassword,
          },
        },
      ]);
      emailSent = true;
    } catch (e) {
      // E-posta gidemese bile hesap ve sepet duruyor. Şifreyi LOG'A YAZMA.
      logger.error(
        `[advisor-signup] hoş geldiniz e-postası gönderilemedi (${data.email}): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  }

  logger.info(
    `[advisor-signup] ${accountStatus} | ${data.email} | cart=${cartId} | ` +
      `urun=${product.handle} x${data.item.quantity} | eposta=${emailSent}`
  );

  res.status(201).json({
    ok: true,
    account: accountStatus,
    customer_id: customerId,
    cart_id: cartId,
    email_sent: emailSent,
    product: {
      handle: product.handle,
      title: product.title,
      thumbnail: product.thumbnail,
      quantity: data.item.quantity,
    },
    shipping: shipping.ok
      ? { free: shipping.free, fee: shipping.shipping_fee }
      : null,
  });
}
