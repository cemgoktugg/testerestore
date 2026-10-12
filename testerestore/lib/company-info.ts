/**
 * Şirket künyesi — TEK KAYNAK. Yasal metinler, checkout (havale bilgisi),
 * footer ve JSON-LD buradan okur. Ayrı modülde tutulur ki client bileşenler
 * import ettiğinde tüm yasal metinler tarayıcı paketine girmesin.
 */
export const companyInfo = {
  legalName: "Testere Store Ticaret Ltd. Şti.",
  brand: "Testere Store",
  taxOffice: "İkitelli Vergi Dairesi",
  taxNumber: "1234567890",
  mersisNumber: "0000000000000000",
  address:
    "İkitelli O.S.B. Metal İş Sanayi Sitesi, 14. Blok No: 45, Başakşehir / İstanbul",
  phone: "+90 (212) 555 10 20",
  email: "destek@testerestore.com",
  kvkkEmail: "kvkk@testerestore.com",
  // www için DNS kaydı yok → sözleşmeler apex alan adını göstermeli.
  websiteUrl: "https://testerestore.com",
  // Havale/EFT hesabı. IBAN BOŞKEN checkout'ta Havale seçeneği gizlenir —
  // gerçek hesap bilgisi girilince otomatik açılır. (Eski IBAN sahteydi:
  // mod-97 kontrolünden geçmiyordu.)
  bankName: "",
  bankBranch: "",
  iban: "",
  lastUpdated: "2026-06-16",
};
