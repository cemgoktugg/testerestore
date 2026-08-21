/**
 * Danışman sohbetinden satın alma akışının saf mantığı.
 *
 * Bileşenden ayrı duruyor çünkü burada iş kuralı var: hangi ürün önerilecek,
 * hangi bilgi nasıl doğrulanacak, sunucuya ne gönderilecek. Arayüzden bağımsız
 * olduğu için tek başına okunabilir ve test edilebilir.
 *
 * ÖNEMLİ — bu adımları LLM sormuyor, tarayıcı soruyor. Sebepleri:
 *   1. Ad, telefon ve adres OpenAI'ye HİÇ gitmiyor (KVKK).
 *   2. Her cevap anında ve kesin doğrulanıyor; "0532" ile "532" karışmıyor.
 *   3. Her adım için para yakan bir LLM çağrısı yok.
 * Sohbet balonu gibi görünür ama arkasında model değil, bu dosya var.
 */

// ── Danışman çıktısı ─────────────────────────────────────────────────────

/**
 * Advisor'ın önerisi. Alanlar RulesEngine.get_recommendation() ile birebir
 * (rules_engine/engine.py:338). Hepsi opsiyonel: konuşma yarıda kaldığında
 * motor kısmi öneri döndürebiliyor.
 */
export interface Recommendation {
  sku?: string | null;
  blade_type?: string | null;
  blade_width_mm?: number | null;
  blade_thickness_mm?: number | null;
  tooth_pitch?: string | null;
  blade_length_mm?: number | null;
  confidence?: string | null;
  [key: string]: unknown;
}

/** /api/advisor/suggest çıktısı — katalogla eşleştirme sonucu. */
export interface ReadyMadeMatch {
  handle: string;
  title: string;
  price: number | null;
  currency_code: string;
  tooth_pitch: string | null;
  url: string;
}

export interface SuggestResult {
  ready_made: ReadyMadeMatch[];
  /** true → diş adımı dahil tam eşleşme. false → aynı ölçü, farklı diş. */
  exact: boolean;
  configurable: {
    handle: string;
    label: string;
    url: string;
    /** Fiyat matrisindeki slug — sunucu fiyatı bununla hesaplıyor. */
    blade_type?: string;
  };
}

// ── Satın alınacak ürün ──────────────────────────────────────────────────

export type PurchaseTarget =
  | {
      kind: "ready_made";
      handle: string;
      title: string;
      price: number | null;
    }
  | {
      kind: "configurable";
      handle: string;
      title: string;
      blade_type: string;
      width_mm: number;
      thickness_mm: number;
      tooth_pitch: string | null;
      length_mm: number;
    };

/** Sunucudaki uzunluk sınırı (blade-price/calculate route ile aynı). */
const MIN_LENGTH_MM = 1000;
const MAX_LENGTH_MM = 15000;

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Öneri + katalog eşleşmesinden "sohbetten alınabilir" tek ürünü seçer.
 *
 * Öncelik sırası:
 *   1. Diş adımı dahil tam eşleşen hazır ürün — stokta, hemen çıkar.
 *   2. Ölçüsü tam olan özel imalat (fiyat matristen hesaplanır).
 *   3. Ölçü eksikse: yakın hazır ürün (diş adımı farklı) — arayüz bunu
 *      zaten "diş adımı farklı" diye etiketliyor.
 *
 * Hiçbiri tutmuyorsa null → sohbet satın alma teklifi göstermez, kullanıcı
 * ürün sayfasına yönlendirilir.
 */
export function derivePurchaseTarget(
  rec: Recommendation,
  match: SuggestResult | null
): PurchaseTarget | null {
  if (!match) return null;

  const exactReady = match.exact ? match.ready_made[0] : undefined;
  if (exactReady) {
    return {
      kind: "ready_made",
      handle: exactReady.handle,
      title: exactReady.title,
      price: exactReady.price,
    };
  }

  const width = num(rec.blade_width_mm);
  const thickness = num(rec.blade_thickness_mm);
  const length = num(rec.blade_length_mm);
  const bladeType = match.configurable?.blade_type;

  if (
    bladeType &&
    width &&
    thickness &&
    length &&
    length >= MIN_LENGTH_MM &&
    length <= MAX_LENGTH_MM
  ) {
    return {
      kind: "configurable",
      handle: match.configurable.handle,
      title: match.configurable.label,
      blade_type: bladeType,
      width_mm: width,
      thickness_mm: thickness,
      tooth_pitch:
        typeof rec.tooth_pitch === "string" && rec.tooth_pitch.trim()
          ? rec.tooth_pitch.trim()
          : null,
      length_mm: length,
    };
  }

  const nearReady = match.ready_made[0];
  if (nearReady) {
    return {
      kind: "ready_made",
      handle: nearReady.handle,
      title: nearReady.title,
      price: nearReady.price,
    };
  }

  return null;
}

/** Kullanıcıya "neyi alıyorsunuz" diye gösterilecek tek satırlık özet. */
export function describeTarget(target: PurchaseTarget): string {
  if (target.kind === "ready_made") return target.title;
  const pitch = target.tooth_pitch ? ` • ${target.tooth_pitch} TPI` : "";
  return `${target.title} — ${target.width_mm}×${target.thickness_mm} mm${pitch} • ${target.length_mm} mm boy (özel imalat)`;
}

// ── Adım adım bilgi toplama ──────────────────────────────────────────────

export interface PurchaseForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  address_1: string;
  quantity: number;
}

type ParseResult =
  | { ok: true; patch: Partial<PurchaseForm> }
  | { ok: false; error: string };

export interface PurchaseStep {
  id: string;
  question: string;
  placeholder: string;
  /** Doldurulmuş cevap butonları (yazmak yerine tıklanabilir). */
  options?: string[];
  parse: (raw: string) => ParseResult;
}

// Backend'deki PhoneSchema ile aynı kalıp — burada erken, orada kesin.
const PHONE_RE = /^(?:90)?0?5\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export const PURCHASE_STEPS: PurchaseStep[] = [
  {
    id: "name",
    question: "Harika! Siparişi hazırlayabilmem için birkaç bilgi alayım.\n\nAdınız ve soyadınız nedir?",
    placeholder: "Örn: Ahmet Yılmaz",
    parse: (raw) => {
      const parts = raw.trim().split(/\s+/).filter(Boolean);
      if (parts.length < 2) {
        return { ok: false, error: "Lütfen ad ve soyadınızı birlikte yazın." };
      }
      const last = parts.pop() as string;
      const first = parts.join(" ");
      if (first.length < 2 || last.length < 2) {
        return { ok: false, error: "Ad ve soyad en az 2 harf olmalı." };
      }
      return { ok: true, patch: { first_name: first, last_name: last } };
    },
  },
  {
    id: "email",
    question: "E-posta adresiniz? (Hesabınızı bu adrese açacağım, şifreniz buraya gelecek.)",
    placeholder: "ornek@firma.com",
    parse: (raw) => {
      const email = raw.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) {
        return { ok: false, error: "Geçerli bir e-posta adresi yazın." };
      }
      return { ok: true, patch: { email } };
    },
  },
  {
    id: "phone",
    question: "Cep telefonu numaranız? (Kargo bilgisi için)",
    placeholder: "0532 123 45 67",
    parse: (raw) => {
      const digits = raw.replace(/[^\d]/g, "");
      if (!PHONE_RE.test(digits)) {
        return {
          ok: false,
          error: "Numarayı 05XX XXX XX XX biçiminde yazın.",
        };
      }
      return { ok: true, patch: { phone: digits } };
    },
  },
  {
    id: "city",
    question: "Teslimat için hangi ildesiniz?",
    placeholder: "Örn: İstanbul",
    parse: (raw) => {
      const city = raw.trim();
      if (city.length < 2) return { ok: false, error: "İl adını yazın." };
      return { ok: true, patch: { city } };
    },
  },
  {
    id: "district",
    question: "İlçeniz?",
    placeholder: "Örn: Kartal",
    parse: (raw) => {
      const district = raw.trim();
      if (district.length < 2) return { ok: false, error: "İlçe adını yazın." };
      return { ok: true, patch: { district } };
    },
  },
  {
    id: "address",
    question: "Açık adresiniz? (Mahalle, cadde/sokak, bina ve kapı no)",
    placeholder: "Örn: Yalı Mah. Sanayi Cad. No:12/3",
    parse: (raw) => {
      const address = raw.trim();
      if (address.length < 10) {
        return {
          ok: false,
          error: "Kargonun ulaşabilmesi için adresi biraz daha açık yazın.",
        };
      }
      return { ok: true, patch: { address_1: address } };
    },
  },
  {
    id: "quantity",
    question: "Kaç adet istiyorsunuz?",
    placeholder: "Örn: 2",
    options: ["1", "2", "3", "5"],
    parse: (raw) => {
      const q = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
      if (!Number.isFinite(q) || q < 1) {
        return { ok: false, error: "Adet olarak bir sayı yazın (en az 1)." };
      }
      if (q > 50) {
        return {
          ok: false,
          error:
            "50'den fazla adet için teklif hazırlayalım — iletişim sayfasından bize yazın.",
        };
      }
      return { ok: true, patch: { quantity: q } };
    },
  },
];

/** Son adım: onay. Ayrı tutuluyor çünkü metni ve butonları arayüzden geliyor. */
export const CONSENT_ACCEPT = "Onaylıyorum";
export const CONSENT_CANCEL = "Vazgeç";

export const CONSENT_QUESTION =
  "Son adım: bilgilerinizi Üyelik Sözleşmesi ve KVKK Aydınlatma Metni kapsamında " +
  "işleyerek hesabınızı oluşturacağım. Onaylıyor musunuz?";

export const EMPTY_FORM: PurchaseForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  city: "",
  district: "",
  address_1: "",
  quantity: 1,
};

// ── Sunucuya gidecek gövde ───────────────────────────────────────────────

export interface SignupResponse {
  ok?: boolean;
  /**
   * created           → hesap açıldı, geçici şifre e-postayla gitti
   * existing          → e-posta zaten kayıtlı, hesap açılmadı
   * email_unavailable → e-posta servisi yapılandırılmamış; şifre teslim
   *                     edilemeyeceği için hesap BİLEREK açılmadı (sunucu
   *                     kararı, bkz. store/advisor-signup route)
   */
  account?: "created" | "existing" | "email_unavailable";
  customer_id?: string | null;
  cart_id?: string;
  email_sent?: boolean;
  product?: { title?: string; quantity?: number };
  shipping?: { free: boolean; fee: number } | null;
  message?: string;
  code?: string;
}

export function buildSignupPayload(
  form: PurchaseForm,
  target: PurchaseTarget,
  advisorSessionId: string
): Record<string, unknown> {
  const item =
    target.kind === "ready_made"
      ? { kind: "ready_made", handle: target.handle, quantity: form.quantity }
      : {
          kind: "configurable",
          handle: target.handle,
          blade_type: target.blade_type,
          width_mm: target.width_mm,
          thickness_mm: target.thickness_mm,
          tooth_pitch: target.tooth_pitch,
          length_mm: target.length_mm,
          quantity: form.quantity,
        };

  return {
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email,
    phone: form.phone,
    address: {
      address_1: form.address_1,
      city: form.city,
      province: form.district,
    },
    item,
    consent: true,
    advisor_session_id: advisorSessionId,
  };
}
