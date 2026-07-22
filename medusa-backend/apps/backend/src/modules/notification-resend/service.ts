import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";
import { Resend } from "resend";

type InjectedDependencies = { logger: Logger };
type Options = {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
};

/**
 * Resend notification provider for Medusa v2.
 *
 * Channel: "email". Template selection is by `template` field on the
 * notification DTO — the subscriber passes the template name and a `data`
 * payload, and this provider renders one of the registered HTML/text
 * templates with that payload.
 *
 * Set RESEND_API_KEY in .env. While unset (dev mode) the provider logs
 * the would-be email instead of sending — no crashes, easy local testing.
 */
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend";

  protected logger_: Logger;
  protected apiKey_?: string;
  protected fromEmail_: string;
  protected fromName_: string;
  protected client_: Resend | null = null;

  constructor({ logger }: InjectedDependencies, options: Options = {}) {
    super();
    this.logger_ = logger;
    this.apiKey_ = options.apiKey || process.env.RESEND_API_KEY;
    this.fromEmail_ =
      options.fromEmail ||
      process.env.RESEND_FROM_EMAIL ||
      "onboarding@resend.dev";
    this.fromName_ =
      options.fromName || process.env.RESEND_FROM_NAME || "Testere Store";
    if (this.apiKey_) {
      this.client_ = new Resend(this.apiKey_);
    } else {
      this.logger_.warn(
        "[notification-resend] RESEND_API_KEY not set — emails will be LOGGED, not sent."
      );
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    if (!notification.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Notification 'to' (recipient email) is required."
      );
    }
    if (notification.channel !== "email") {
      // Bu provider sadece email kanalı için kayıtlı — diğerlerini atla
      return { id: "" };
    }

    const tpl = String(notification.template || "default");
    const data = (notification.data ?? {}) as Record<string, unknown>;
    const { subject, html, text } = renderTemplate(tpl, data);

    const from = `${this.fromName_} <${this.fromEmail_}>`;

    if (!this.client_) {
      this.logger_.info(
        `[notification-resend] (DRY RUN) → ${notification.to} | ${subject}`
      );
      this.logger_.debug(`[notification-resend] html:\n${html}`);
      return { id: "dry-run" };
    }

    try {
      const res = await this.client_.emails.send({
        from,
        to: notification.to,
        subject,
        html,
        text,
        replyTo: this.fromEmail_,
      });
      if (res.error) {
        throw new Error(`${res.error.name}: ${res.error.message}`);
      }
      return { id: res.data?.id ?? "" };
    } catch (e) {
      this.logger_.error(
        `[notification-resend] send failed: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      throw e;
    }
  }
}

// ---------- Template registry ----------

type Rendered = { subject: string; html: string; text: string };

function renderTemplate(tpl: string, data: Record<string, unknown>): Rendered {
  switch (tpl) {
    case "order.placed":
      return orderPlacedTemplate(data);
    case "order.shipped":
      return orderShippedTemplate(data);
    case "cart.abandoned":
      return cartAbandonedTemplate(data);
    case "newsletter.welcome":
      return newsletterWelcomeTemplate(data);
    default:
      return {
        subject: String(data.subject ?? "Bildirim"),
        html: `<p>${escapeHtml(String(data.body ?? ""))}</p>`,
        text: String(data.body ?? ""),
      };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMoneyMinor(amount: number, currency: string): string {
  // Medusa stores money as a number already in main unit (TRY).
  return `${amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency.toUpperCase()}`;
}

function orderPlacedTemplate(data: Record<string, unknown>): Rendered {
  const order = (data.order ?? {}) as {
    id?: string;
    display_id?: number;
    email?: string;
    total?: number;
    currency_code?: string;
    items?: Array<{
      product_title?: string;
      title?: string;
      quantity?: number;
      unit_price?: number;
      metadata?: Record<string, unknown>;
    }>;
    shipping_address?: {
      first_name?: string;
      last_name?: string;
      address_1?: string;
      city?: string;
      province?: string;
      phone?: string;
    };
  };

  const orderNo = order.display_id
    ? `#${order.display_id}`
    : order.id?.slice(-8).toUpperCase() ?? "—";
  const currency = (order.currency_code || "try").toLowerCase();
  const total = typeof order.total === "number" ? order.total : 0;
  const items = order.items || [];

  const rows = items
    .map((it) => {
      const meta = (it.metadata || {}) as Record<string, unknown>;
      const specs: string[] = [];
      if (meta.width) specs.push(`Genişlik: ${meta.width}`);
      if (meta.thickness) specs.push(`Kalınlık: ${meta.thickness}`);
      if (meta.tpi) specs.push(`TPI: ${meta.tpi}`);
      if (typeof meta.length_mm === "number")
        specs.push(`Boy: ${meta.length_mm} mm`);
      else if (typeof meta.custom_length_mm === "number")
        specs.push(`Boy: ${meta.custom_length_mm} mm`);
      const specStr = specs.length
        ? `<div style="font-size:12px;color:#888;margin-top:4px;">${escapeHtml(specs.join(" • "))}</div>`
        : "";
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #eee;">
            <div style="font-weight:600;color:#222;">${escapeHtml(it.product_title || it.title || "Ürün")}</div>
            ${specStr}
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #eee;text-align:center;color:#555;">${it.quantity ?? 1}</td>
          <td style="padding:14px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#222;">${fmtMoneyMinor((it.unit_price ?? 0) * (it.quantity ?? 1), currency)}</td>
        </tr>`;
    })
    .join("");

  const sa = order.shipping_address || {};
  const addrLines = [
    [sa.first_name, sa.last_name].filter(Boolean).join(" "),
    sa.address_1,
    [sa.province, sa.city].filter(Boolean).join(" / "),
    sa.phone,
  ]
    .filter(Boolean)
    .map((l) => escapeHtml(String(l)))
    .join("<br/>");

  const subject = `Siparişiniz alındı — ${orderNo} | Testere Store`;

  const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 32px 16px 32px;background:linear-gradient(135deg,#ff6a00,#ee0979);color:#fff;">
          <div style="font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;opacity:.85;">Testere Store</div>
          <div style="font-size:22px;font-weight:700;margin-top:6px;">Siparişiniz Alındı ✓</div>
          <div style="font-size:14px;opacity:.9;margin-top:4px;">Sipariş No: <strong>${orderNo}</strong></div>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444;">
            Siparişiniz için teşekkür ederiz. Siparişiniz alındı ve en kısa sürede hazırlanmaya başlayacak.
            Kargoya verildiğinde sizi tekrar bilgilendireceğiz.
          </p>

          <h3 style="margin:24px 0 8px 0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Sipariş Detayı</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <thead><tr>
              <th align="left" style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;padding:8px 0;border-bottom:2px solid #eee;">Ürün</th>
              <th align="center" style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;padding:8px 0;border-bottom:2px solid #eee;">Adet</th>
              <th align="right" style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;padding:8px 0;border-bottom:2px solid #eee;">Tutar</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr>
              <td colspan="2" style="padding:16px 0;font-size:14px;font-weight:700;color:#222;">Genel Toplam</td>
              <td style="padding:16px 0;font-size:16px;font-weight:800;color:#ee0979;text-align:right;">${fmtMoneyMinor(total, currency)}</td>
            </tr></tfoot>
          </table>

          ${
            addrLines
              ? `<h3 style="margin:28px 0 8px 0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Teslimat Adresi</h3>
                 <div style="font-size:14px;line-height:1.6;color:#444;background:#fafbfc;border:1px solid #eee;border-radius:10px;padding:14px 16px;">${addrLines}</div>`
              : ""
          }

          <div style="margin-top:28px;padding:16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;font-size:13px;line-height:1.6;color:#78350f;">
            <strong>Not:</strong> Özel boy kaynaklı şerit bıçaklar 3-7 iş günü içinde hazırlanıp kargolanır.
            Stoktaki ürünler 1-3 iş günü içinde gönderilir.
          </div>

          <div style="margin-top:24px;text-align:center;">
            <a href="${process.env.STOREFRONT_URL || "http://localhost:3001"}/hesabim"
               style="display:inline-block;background:linear-gradient(135deg,#ff6a00,#ee0979);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;">
              Siparişi Görüntüle
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#fafbfc;border-top:1px solid #eee;text-align:center;font-size:11px;color:#888;line-height:1.6;">
          Soru veya talepleriniz için: <a href="mailto:destek@testerestore.com" style="color:#ee0979;text-decoration:none;font-weight:600;">destek@testerestore.com</a><br/>
          © Testere Store — Tüm hakları saklıdır.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `Siparişiniz Alındı — ${orderNo}

Toplam: ${fmtMoneyMinor(total, currency)}

${items
  .map(
    (it) =>
      `• ${it.product_title || it.title || "Ürün"} × ${it.quantity ?? 1} — ${fmtMoneyMinor((it.unit_price ?? 0) * (it.quantity ?? 1), currency)}`
  )
  .join("\n")}

Sorularınız için: destek@testerestore.com`;

  return { subject, html, text };
}

function orderShippedTemplate(data: Record<string, unknown>): Rendered {
  const orderNo = String(data.order_no || "—");
  const carrier = String(data.carrier || "Kargo");
  const trackingNo = String(data.tracking_number || "");
  const trackingUrl = data.tracking_url
    ? String(data.tracking_url)
    : undefined;

  const subject = `Siparişiniz kargoya verildi — ${orderNo}`;
  const html = `<!DOCTYPE html><html lang="tr"><body style="font-family:-apple-system,sans-serif;color:#222;background:#f5f6f8;margin:0;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;box-shadow:0 6px 20px rgba(0,0,0,.06);">
      <h2 style="margin:0 0 8px 0;color:#0ea05a;">Siparişiniz Yola Çıktı 🚚</h2>
      <p style="font-size:14px;color:#555;">Sipariş No: <strong>${escapeHtml(orderNo)}</strong></p>
      <p style="font-size:14px;color:#555;">Kargo Firması: <strong>${escapeHtml(carrier)}</strong></p>
      ${trackingNo ? `<p style="font-size:14px;color:#555;">Takip Numarası: <strong>${escapeHtml(trackingNo)}</strong></p>` : ""}
      ${trackingUrl ? `<p style="margin-top:18px;"><a href="${escapeHtml(trackingUrl)}" style="background:#0ea05a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Kargoyu Takip Et</a></p>` : ""}
    </div>
  </body></html>`;
  const text = `Siparişiniz kargoya verildi (${orderNo}). Kargo: ${carrier}${trackingNo ? `, Takip No: ${trackingNo}` : ""}${trackingUrl ? `\n${trackingUrl}` : ""}`;
  return { subject, html, text };
}

function cartAbandonedTemplate(data: Record<string, unknown>): Rendered {
  const items = (data.items as Array<{ title: string; quantity: number }>) || [];
  const total = Number(data.total ?? 0);
  const currency = String(data.currency_code ?? "try");
  const storefront = process.env.STOREFRONT_URL || "http://localhost:3001";

  const itemList = items
    .map(
      (it) =>
        `<li style="padding:6px 0;color:#444;">${escapeHtml(it.title)} × ${it.quantity}</li>`
    )
    .join("");

  const subject = "Sepetinizde ürünleriniz bekliyor 🛒";
  const html = `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#222;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6f8;padding:32px 12px;">
      <tr><td align="center">
        <table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.06);">
          <tr><td style="padding:32px;background:linear-gradient(135deg,#ff6a00,#ee0979);color:#fff;">
            <div style="font-size:22px;font-weight:700;">Sepetinizi unutmayın!</div>
            <div style="font-size:13px;opacity:.9;margin-top:4px;">${items.length} ürün hâlâ sepetinizde bekliyor</div>
          </td></tr>
          <tr><td style="padding:24px 32px;">
            <p style="margin:0 0 16px 0;font-size:14px;color:#444;line-height:1.6;">
              Beğendiğiniz ürünler sepetinizde duruyor. Stok azalmadan siparişinizi tamamlayın!
            </p>
            <ul style="margin:16px 0;padding-left:20px;font-size:14px;list-style:disc;">${itemList}</ul>
            <div style="margin-top:14px;padding:12px 16px;background:#fafbfc;border-radius:8px;font-size:14px;color:#222;">
              <strong>Toplam:</strong> ${fmtMoneyMinor(total, currency)}
            </div>
            <div style="margin-top:24px;text-align:center;">
              <a href="${storefront}/cart" style="display:inline-block;background:linear-gradient(135deg,#ff6a00,#ee0979);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;">
                Sepete Geri Dön
              </a>
            </div>
            <p style="margin-top:24px;font-size:11px;color:#999;text-align:center;">
              Bu e-postayı, ${storefront} sitesindeki sepetiniz tamamlanmadığı için aldınız.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  const text = `Sepetinizde ${items.length} ürün bekliyor.
Toplam: ${fmtMoneyMinor(total, currency)}

Sepetinize dönmek için: ${storefront}/cart`;

  return { subject, html, text };
}

function newsletterWelcomeTemplate(data: Record<string, unknown>): Rendered {
  const coupon = String(data.coupon_code || "HOSGELDIN5");
  const storefront = process.env.STOREFRONT_URL || "http://localhost:3001";
  const subject = "Hoş geldiniz! İlk siparişinize özel %5 indirim 🎁";

  const html = `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#222;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6f8;padding:32px 12px;">
      <tr><td align="center">
        <table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.06);">
          <tr><td style="padding:32px;background:linear-gradient(135deg,#ff6a00,#ee0979);color:#fff;text-align:center;">
            <div style="font-size:24px;font-weight:700;">Hoş geldiniz! 🎁</div>
            <div style="font-size:13px;opacity:.95;margin-top:6px;">Testere Store ailesine katıldınız</div>
          </td></tr>
          <tr><td style="padding:28px 32px;text-align:center;">
            <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#444;">
              Aboneliğiniz başarıyla oluşturuldu. Hoş geldin hediyesi olarak ilk
              siparişinizde geçerli <strong>%5 indirim kupon kodunuzu</strong>
              hemen kullanabilirsiniz:
            </p>

            <div style="display:inline-block;border:2px dashed #ee0979;background:#fff5fa;border-radius:10px;padding:14px 28px;margin:6px 0 18px 0;">
              <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">Kupon Kodu</div>
              <div style="font-size:24px;font-weight:800;color:#ee0979;letter-spacing:3px;font-family:monospace;">${escapeHtml(coupon)}</div>
            </div>

            <p style="margin:0 0 24px 0;font-size:12px;color:#888;line-height:1.6;">
              Kupon ödeme adımında sepetinizde uygulanabilir. Yeniliklerimizi,
              kampanyalarımızı ve şerit testere ipuçlarımızı bültenlerimizde
              size ileteceğiz.
            </p>

            <a href="${storefront}" style="display:inline-block;background:linear-gradient(135deg,#ff6a00,#ee0979);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;">
              Alışverişe Başla
            </a>
          </td></tr>
          <tr><td style="padding:14px 32px;background:#fafbfc;border-top:1px solid #eee;text-align:center;font-size:11px;color:#888;">
            Bültenden çıkmak için bize yanıt yazabilirsiniz.<br/>
            © Testere Store
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  const text = `Hoş geldiniz!

İlk siparişinize özel %5 indirim kupon kodunuz: ${coupon}

${storefront}`;

  return { subject, html, text };
}

export default ResendNotificationProviderService;
