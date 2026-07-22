import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
  PaymentSessionStatus,
  PaymentCustomerDTO,
  Logger,
} from "@medusajs/framework/types";

type InjectedDeps = { logger: Logger };
type Options = {
  apiKey?: string;
  secretKey?: string;
  baseUrl?: string;
  callbackUrl?: string;
};

/**
 * Iyzico payment provider for Medusa v2 (Checkout Form / hosted 3DS).
 *
 * NOT: Medusa v2.15 payment provider API'si TÜM metodlara `{ data, context }`
 * şeklinde girdi verir (data = session'da saklanan veri) ve başarısızlıkta
 * dönüş yerine HATA FIRLATILMASINI bekler. Eski "paymentSessionData'yı
 * doğrudan al + PaymentProviderError döndür" imzası artık geçersizdir.
 *
 * Akış:
 *   1. initiatePayment → checkoutFormInitialize → data.token + data.paymentPageUrl
 *   2. Storefront paymentPageUrl'e yönlendirir.
 *   3. 3DS sonrası iyzico, /iyzico/callback'e POST → storefront cart.complete.
 *   4. cart.complete → authorizePayment → checkoutForm.retrieve(token) → SUCCESS
 *      ise { status: "authorized" } → order oluşur.
 *
 * IYZICO_API_KEY + IYZICO_SECRET_KEY yoksa DRY MODE (test-success taklidi).
 */
class IyzicoPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "iyzico";

  protected logger_: Logger;
  protected apiKey_?: string;
  protected secretKey_?: string;
  protected baseUrl_: string;
  protected callbackUrl_: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected iyzipay_: any = null;

  constructor({ logger }: InjectedDeps, options: Options = {}) {
    super({ logger } as never, options);
    this.logger_ = logger;
    this.apiKey_ = options.apiKey || process.env.IYZICO_API_KEY;
    this.secretKey_ = options.secretKey || process.env.IYZICO_SECRET_KEY;
    this.baseUrl_ =
      options.baseUrl ||
      process.env.IYZICO_BASE_URL ||
      "https://sandbox-api.iyzipay.com";
    this.callbackUrl_ =
      options.callbackUrl ||
      process.env.IYZICO_CALLBACK_URL ||
      `${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/iyzico/callback`;

    if (this.apiKey_ && this.secretKey_) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Iyzipay = require("iyzipay");
        this.iyzipay_ = new Iyzipay({
          apiKey: this.apiKey_,
          secretKey: this.secretKey_,
          uri: this.baseUrl_,
        });
        this.logger_.info(
          `[payment-iyzico] initialized (${this.baseUrl_.includes("sandbox") ? "SANDBOX" : "LIVE"})`
        );
      } catch (e) {
        this.logger_.error(
          `[payment-iyzico] iyzipay package missing or failed to init: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    } else {
      this.logger_.warn(
        "[payment-iyzico] IYZICO_API_KEY / IYZICO_SECRET_KEY not set — DRY MODE."
      );
    }
  }

  /**
   * iyzico SDK çağrılarını geçici ağ/DNS hatalarında (ENOTFOUND, ETIMEDOUT,
   * ECONNRESET, EAI_AGAIN…) birkaç kez tekrar dener. authorize sırasında
   * ödeme zaten iyzico'da gerçekleşmiş olduğundan retrieve idempotent'tir;
   * anlık bir DNS takılması yüzünden "ödendi ama sipariş yok" durumunu önler.
   */
  private async withRetry<T>(
    label: string,
    fn: () => Promise<T>,
    attempts = 3
  ): Promise<T> {
    let lastErr: unknown;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const transient =
          /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up|network|getaddrinfo/i.test(
            msg
          );
        if (!transient || i === attempts) throw e;
        this.logger_.warn(
          `[payment-iyzico] ${label} geçici hata (deneme ${i}/${attempts}): ${msg}`
        );
        await new Promise((r) => setTimeout(r, 600 * i));
      }
    }
    throw lastErr;
  }

  // ---- Medusa lifecycle (v2.15 input/output contract) ----

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const amountTl = Number(input.amount) || 0;
    const currency = (input.currency_code || "TRY").toUpperCase();
    const data = (input.data as Record<string, unknown>) || {};
    const customer = input.context?.customer as PaymentCustomerDTO | undefined;
    const billing = (customer?.billing_address as Record<string, unknown>) || {};

    const conversationId = String(
      data.conversationId ||
        data.session_id ||
        customer?.id ||
        `medusa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );

    if (!this.iyzipay_) {
      // DRY MODE — anahtar yok, test başarılı taklidi
      return {
        id: conversationId,
        data: {
          token: `dry-${conversationId}`,
          paymentPageUrl: "",
          conversationId,
          dryMode: true,
        },
      };
    }

    const fullName =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      [billing.first_name, billing.last_name].filter(Boolean).join(" ") ||
      "Müşteri";
    const [firstName, ...restName] = fullName.split(" ");
    const lastName = restName.join(" ") || firstName;
    const address =
      (billing.address_1 as string) || "Bilgi girilmedi";
    const city = (billing.city as string) || "İstanbul";

    const contactInfo = {
      contactName: fullName,
      city,
      country: "Turkey",
      address,
    };

    const req = {
      locale: "tr",
      conversationId,
      price: amountTl.toFixed(2),
      paidPrice: amountTl.toFixed(2),
      currency,
      basketId: conversationId,
      paymentGroup: "PRODUCT",
      callbackUrl: this.callbackUrl_,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: customer?.id || conversationId,
        name: firstName,
        surname: lastName,
        gsmNumber:
          (customer?.phone as string) ||
          (billing.phone as string) ||
          "+905555555555",
        email: customer?.email || "noreply@testerestore.com",
        identityNumber: "11111111111", // sandbox için sahte TC
        registrationAddress: address,
        ip: "85.34.78.112",
        city,
        country: "Turkey",
      },
      shippingAddress: contactInfo,
      billingAddress: contactInfo,
      // Cart line item'ları bu aşamada provider'a iletilmediği için tek kalem
      // = toplam tutar (basketItems toplamı price'a eşit olmak ZORUNDA).
      basketItems: [
        {
          id: "order",
          name: "Şerit Testere Siparişi",
          category1: "Şerit Testere",
          itemType: "PHYSICAL",
          price: amountTl.toFixed(2),
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.withRetry<any>("init", () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Promise<any>((resolve, reject) => {
        this.iyzipay_.checkoutFormInitialize.create(
          req,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err: any, res: any) => {
            if (err) {
              reject(new Error(`Iyzico init failed: ${JSON.stringify(err)}`));
              return;
            }
            if (!res || res.status !== "success") {
              reject(
                new Error(
                  res?.errorMessage ||
                    `Iyzico init rejected (code=${res?.errorCode})`
                )
              );
              return;
            }
            resolve(res);
          }
        );
      })
    );

    this.logger_.info(
      `[payment-iyzico] init OK conv=${conversationId} token=${String(result.token).slice(0, 12)}…`
    );

    return {
      id: result.token,
      data: {
        token: result.token,
        paymentPageUrl: result.paymentPageUrl,
        conversationId,
      },
    };
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const data = (input.data as Record<string, unknown>) || {};
    const token = String(data.token || "");

    if (!this.iyzipay_ || data.dryMode) {
      return {
        status: "authorized" as PaymentSessionStatus,
        data: { ...data, dryAuthorized: true },
      };
    }

    if (!token) {
      throw new Error("[payment-iyzico] authorize: session.data.token yok");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.withRetry<any>("retrieve", () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Promise<any>((resolve, reject) => {
        this.iyzipay_.checkoutForm.retrieve(
          { token },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err: any, res: any) => {
            if (err || !res) {
              reject(
                new Error(
                  `Iyzico retrieve failed: ${JSON.stringify(err || res)}`
                )
              );
              return;
            }
            resolve(res);
          }
        );
      })
    );

    if (result.paymentStatus !== "SUCCESS") {
      this.logger_.error(
        `[payment-iyzico] authorize NON-SUCCESS status=${result.status} paymentStatus=${result.paymentStatus} code=${result.errorCode} msg=${result.errorMessage}`
      );
      throw new Error(
        result.errorMessage ||
          `Iyzico ödeme başarısız (paymentStatus=${result.paymentStatus})`
      );
    }

    this.logger_.info(
      `[payment-iyzico] authorize OK paymentId=${result.paymentId} paidPrice=${result.paidPrice}`
    );

    return {
      status: "authorized" as PaymentSessionStatus,
      data: {
        ...data,
        paymentId: result.paymentId,
        fraudStatus: result.fraudStatus,
        installment: result.installment,
        cardFamily: result.cardFamily,
        cardAssociation: result.cardAssociation,
        paidPrice: result.paidPrice,
        // iyzico işlem kalemleri `itemTransactions` alanında döner (paymentItems DEĞİL).
        // Her kalemin paymentTransactionId'si iade (refund) için gereklidir.
        itemTransactions: result.itemTransactions,
        rawResult: result,
      },
    };
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Checkout Form 3DS başarısında anında çekim yapar → capture no-op.
    return { data: (input.data as Record<string, unknown>) || {} };
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const data = (input.data as Record<string, unknown>) || {};

    // input.amount number/string/BigNumber olabilir — güvenli çözümle.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawAmt = input.amount as any;
    let refundAmount =
      typeof rawAmt === "number"
        ? rawAmt
        : typeof rawAmt === "string"
          ? Number(rawAmt)
          : Number(
              rawAmt?.numeric ?? rawAmt?.value ?? rawAmt?.valueOf?.() ?? rawAmt
            ) || 0;
    // Güvenlik ağı: tutar çözümlenemezse iyzico'nun çektiği tam tutarı kullan.
    if (!(refundAmount > 0)) {
      refundAmount =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Number(data.paidPrice ?? (data.rawResult as any)?.paidPrice) || 0;
    }

    if (!this.iyzipay_ || data.dryMode) {
      return { data: { ...data, refundedAmount: refundAmount } };
    }

    // iyzico paymentTransactionId'yi `itemTransactions`'tan al. rawResult tam
    // retrieve yanıtını taşıdığından eski siparişler için de çalışır.
    const paymentTransactionId = String(
      data.paymentTransactionId ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.itemTransactions as any)?.[0]?.paymentTransactionId ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.rawResult as any)?.itemTransactions?.[0]?.paymentTransactionId ||
        ""
    );
    if (!paymentTransactionId) {
      throw new Error("[payment-iyzico] refund: paymentTransactionId yok");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new Promise<any>((resolve, reject) => {
      this.iyzipay_.refund.create(
        {
          locale: "tr",
          conversationId: String(data.conversationId || ""),
          paymentTransactionId,
          price: refundAmount.toFixed(2),
          currency: "TRY",
          ip: "85.34.78.112",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any, res: any) => {
          if (err || !res || res.status !== "success") {
            reject(
              new Error(`Iyzico refund failed: ${JSON.stringify(err || res)}`)
            );
            return;
          }
          resolve(res);
        }
      );
    });

    return {
      data: { ...data, refundedAmount: refundAmount, refundId: result.paymentId },
    };
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return { data: (input.data as Record<string, unknown>) || {} };
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return { data: (input.data as Record<string, unknown>) || {} };
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: (input.data as Record<string, unknown>) || {} };
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    // Tutar/para birimi değişmiş olabilir → yeniden init et.
    const out = await this.initiatePayment(
      input as unknown as InitiatePaymentInput
    );
    return { data: out.data };
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = (input.data as Record<string, unknown>) || {};
    if (data.paymentId || data.dryAuthorized) {
      return { status: "authorized" as PaymentSessionStatus, data };
    }
    return { status: "pending" as PaymentSessionStatus, data };
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" } as WebhookActionResult;
  }
}

export default IyzicoPaymentProviderService;
