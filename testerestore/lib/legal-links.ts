/**
 * Yasal sayfa linkleri (slug + başlık). Client bileşenler (footer, checkout
 * onay kutuları) bunu kullanır; tam metinler lib/legal-content.ts içinde.
 * legal-content.ts'e sayfa eklenirse buraya da eklenmeli.
 */
export const LEGAL_LINKS: ReadonlyArray<{ slug: string; title: string }> = [
  {
    slug: "kvkk-aydinlatma-metni",
    title: "KVKK Aydınlatma Metni"
  },
  {
    slug: "gizlilik-politikasi",
    title: "Gizlilik Politikası"
  },
  {
    slug: "cerez-politikasi",
    title: "Çerez Politikası"
  },
  {
    slug: "mesafeli-satis-sozlesmesi",
    title: "Mesafeli Satış Sözleşmesi"
  },
  {
    slug: "on-bilgilendirme-formu",
    title: "Ön Bilgilendirme Formu"
  },
  {
    slug: "iade-ve-cayma",
    title: "İade ve Cayma Politikası"
  },
  {
    slug: "uyelik-sozlesmesi",
    title: "Üyelik Sözleşmesi"
  }
];
