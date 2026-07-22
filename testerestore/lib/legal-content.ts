/**
 * Tüm yasal metinler tek yerden — checkout consent metinleri, footer
 * link tabelası ve dinamik /yasal/[slug] sayfası burayı okur.
 *
 * Metinler genel KVKK / 6502 sayılı Tüketicinin Korunması Hakkında
 * Kanun / Mesafeli Sözleşmeler Yönetmeliği standartlarına göre
 * hazırlanmış şablonlardır. Şirket bilgilerinizi `companyInfo`
 * altında güncelleyin.
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
  websiteUrl: "https://www.testerestore.com",
  lastUpdated: "2026-06-16",
};

export interface LegalPage {
  slug: string;
  title: string;
  shortTitle: string;
  /** Markdown-ish body. New lines become paragraphs; lines starting with
   *  `# `, `## `, `### ` become headings; `- ` becomes list items. */
  body: string;
}

const c = companyInfo;

export const LEGAL_PAGES: LegalPage[] = [
  // ----------------------------------------------------------------
  {
    slug: "kvkk-aydinlatma-metni",
    title: "KVKK Aydınlatma Metni",
    shortTitle: "KVKK Aydınlatma",
    body: `# KVKK Aydınlatma Metni
Son güncelleme: ${c.lastUpdated}

## 1. Veri Sorumlusu
${c.legalName} ("Şirket") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla, sizin tarafınızdan paylaşılan kişisel verilerinizin gizliliğine ve güvenliğine önem vermekteyiz.

**Adres:** ${c.address}
**MERSİS No:** ${c.mersisNumber}
**Vergi No:** ${c.taxNumber} / ${c.taxOffice}
**E-posta:** ${c.kvkkEmail}

## 2. İşlenen Kişisel Veriler
Sitemizi ziyaret ettiğinizde, hesap oluşturduğunuzda, sipariş verdiğinizde veya bizimle iletişime geçtiğinizde aşağıdaki veriler işlenebilir:
- **Kimlik Bilgileri:** Ad, soyad
- **İletişim Bilgileri:** E-posta adresi, telefon numarası, teslimat ve fatura adresi
- **Müşteri İşlem Bilgileri:** Sipariş geçmişi, ödeme bilgileri, fatura bilgileri
- **İşlem Güvenliği Bilgileri:** IP adresi, çerez kayıtları, log bilgileri, oturum bilgileri
- **Pazarlama Bilgileri:** Alışveriş alışkanlıkları, çerez tercihleri, ticari elektronik ileti onay durumu

## 3. Kişisel Verilerin İşlenme Amaçları
Kişisel verileriniz aşağıdaki amaçlarla işlenir:
- Siparişlerinizin alınması, hazırlanması, kargolanması ve teslimi
- Fatura düzenlenmesi ve yasal yükümlülüklerin yerine getirilmesi
- Müşteri hizmetleri, talep ve şikayetlerinizin yönetimi
- Hesap güvenliğinin sağlanması ve kullanıcı doğrulaması
- Hukuki süreçlerin yürütülmesi
- Açık rızanız olması halinde pazarlama faaliyetleri ve kampanya bildirimleri

## 4. Kişisel Verilerin Aktarımı
Verileriniz; kargo şirketleri, ödeme kuruluşları (Iyzico, banka POS), e-fatura entegratörleri, yetkili kamu kurumları, hukuki danışmanlık aldığımız avukatlar ve hizmet sağlayıcılarımız ile yasal sınırlar dahilinde paylaşılır. Yurt dışına veri aktarımı yapılmamaktadır.

## 5. Verilerin Saklanma Süresi
Kişisel verileriniz, mevzuatta öngörülen saklama süreleri boyunca veya işlenme amacının gerektirdiği süreyle sınırlı olarak saklanır. Bu sürelerin sona ermesi halinde verileriniz silinir, yok edilir veya anonim hale getirilir.

## 6. KVKK 11. Madde Kapsamındaki Haklarınız
KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:
- Kişisel verilerinizin işlenip işlenmediğini öğrenme
- İşlenmişse buna ilişkin bilgi talep etme
- İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme
- Yurt içinde / yurt dışında verilerin aktarıldığı üçüncü kişileri bilme
- Eksik / yanlış işlenmişse düzeltilmesini isteme
- KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde silinmesini / yok edilmesini isteme
- Aktarıldığı üçüncü kişilere bildirilmesini isteme
- Otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonuç ortaya çıkmasına itiraz etme
- Kanuna aykırı işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme

## 7. Başvuru Yolu
Yukarıdaki haklarınızı kullanmak için ${c.kvkkEmail} e-posta adresine kimliğinizi tevsik edici belgelerle başvurabilirsiniz. Talepleriniz 30 gün içerisinde ücretsiz olarak sonuçlandırılır.`,
  },

  // ----------------------------------------------------------------
  {
    slug: "gizlilik-politikasi",
    title: "Gizlilik Politikası",
    shortTitle: "Gizlilik",
    body: `# Gizlilik Politikası
Son güncelleme: ${c.lastUpdated}

## 1. Kapsam
Bu Gizlilik Politikası, ${c.brand} olarak ${c.websiteUrl} web sitesi ("Site") üzerinden topladığımız bilgilerin nasıl kullanıldığını, korunduğunu ve paylaşıldığını açıklar.

## 2. Topladığımız Bilgiler
- **Hesap Bilgileri:** Hesap oluşturduğunuzda ad, soyad, e-posta, telefon
- **Sipariş Bilgileri:** Teslimat ve fatura adresi, sipariş geçmişi, ödeme onay bilgileri (tam kart numarası saklanmaz)
- **Otomatik Olarak Toplanan:** IP adresi, tarayıcı türü, cihaz bilgileri, çerez kayıtları, ziyaret süresi

## 3. Bilgilerin Kullanımı
- Sipariş işleme ve teslimat
- Kullanıcı hesabınızın yönetilmesi
- Müşteri destek hizmetlerinin sunulması
- Açık rızanız ile pazarlama iletişimi
- Site performansının ölçülmesi ve geliştirilmesi
- Yasal yükümlülüklerin yerine getirilmesi

## 4. Bilgi Güvenliği
Verileriniz endüstri standartlarında SSL şifreleme ile korunur. Kart bilgileriniz PCI-DSS uyumlu ödeme servisi (Iyzico) altyapısında işlenir, sunucularımızda saklanmaz.

## 5. Üçüncü Taraflarla Paylaşım
Bilgileriniz sadece şu durumlarda üçüncü taraflarla paylaşılır:
- Kargo firması ile teslimat için
- Ödeme kuruluşu ile ödeme işlemi için
- E-fatura entegratörleri ile fatura düzenleme için
- Hukuki zorunluluk halinde yetkili merciler ile

## 6. Çerezler
Çerez kullanımımız hakkında detaylı bilgi için lütfen [Çerez Politikamızı](/yasal/cerez-politikasi) inceleyiniz.

## 7. Kullanıcı Hakları
KVKK kapsamındaki haklarınızı kullanmak için [KVKK Aydınlatma Metni](/yasal/kvkk-aydinlatma-metni) sayfamızı inceleyebilirsiniz.

## 8. İletişim
Gizlilik ile ilgili sorularınız için: ${c.email}`,
  },

  // ----------------------------------------------------------------
  {
    slug: "cerez-politikasi",
    title: "Çerez Politikası",
    shortTitle: "Çerezler",
    body: `# Çerez Politikası
Son güncelleme: ${c.lastUpdated}

## 1. Çerez Nedir?
Çerezler (cookies), bir web sitesini ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza yerleştirilen küçük metin dosyalarıdır. Site deneyiminizi iyileştirmek, tercihlerinizi hatırlamak ve site performansını ölçmek amacıyla kullanılır.

## 2. Kullandığımız Çerez Türleri

### Zorunlu Çerezler
Sitenin çalışması için zorunludur. Kapatılamaz. Örnek: oturum çerezi (giriş yapmış kalmanız için), sepet çerezi.

### Tercih Çerezleri
Tema (açık/koyu), dil seçimi gibi tercihlerinizi hatırlar.

### Analitik Çerezler
Ziyaretçilerin siteyi nasıl kullandığını anlamamıza yardımcı olur. (Google Analytics)

### Pazarlama Çerezleri
Size daha alakalı reklamlar göstermek için kullanılır. (Meta Pixel)

## 3. Çerez Yönetimi
Tarayıcı ayarlarınızdan tüm çerezleri silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezler engellenirse sitenin bazı bölümleri düzgün çalışmayabilir.

**Çerez ayarları rehberi:**
- Chrome: Ayarlar → Gizlilik ve güvenlik → Çerezler
- Firefox: Ayarlar → Gizlilik ve Güvenlik → Çerezler
- Safari: Tercihler → Gizlilik
- Edge: Ayarlar → Çerezler ve site izinleri

## 4. Üçüncü Taraf Çerezler
Bazı analitik ve pazarlama çerezleri üçüncü taraf hizmet sağlayıcılarımıza aittir. Bu çerezler ile ilgili daha fazla bilgi için ilgili sağlayıcının gizlilik politikasını inceleyebilirsiniz.`,
  },

  // ----------------------------------------------------------------
  {
    slug: "mesafeli-satis-sozlesmesi",
    title: "Mesafeli Satış Sözleşmesi",
    shortTitle: "Mesafeli Satış",
    body: `# Mesafeli Satış Sözleşmesi
Son güncelleme: ${c.lastUpdated}

## 1. Taraflar
**Satıcı:**
${c.legalName}
${c.address}
Vergi: ${c.taxNumber} / ${c.taxOffice}
MERSİS: ${c.mersisNumber}
Tel: ${c.phone}
E-posta: ${c.email}

**Alıcı:** Sipariş sürecinde belirtmiş olduğu ad, soyad ve adres bilgilerine sahip gerçek/tüzel kişi.

## 2. Konu
İşbu sözleşme, Alıcı'nın Satıcı'ya ait ${c.websiteUrl} web sitesi üzerinden elektronik ortamda siparişini yaptığı, sözleşmede nitelikleri ve satış fiyatı belirtilen ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini düzenler.

## 3. Sözleşme Konusu Ürün
Ürünlerin cinsi, türü, miktarı, satış bedeli (KDV dahil), ödeme şekli ve teslimat bilgileri sipariş özetinde belirtildiği gibidir.

## 4. Genel Hükümler
- 4.1. Alıcı, ${c.websiteUrl} sitesinde sözleşme konusu ürünün temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu kabul eder.
- 4.2. Sözleşme konusu ürün, Alıcı'nın belirttiği teslimat adresine en geç 30 (otuz) gün içerisinde teslim edilir.
- 4.3. Ürün üçüncü bir kişi/kuruluşa teslim edilecek ise, teslim edilecek kişinin/kuruluşun teslimatı kabul etmemesinden Satıcı sorumlu tutulamaz.
- 4.4. Sözleşme konusu ürün, Alıcı'dan başka bir kişiye teslim edilecek ise, teslim edilecek kişinin adres bilgileri Alıcı tarafından doğru girilmelidir.
- 4.5. Ürünün hasarlı/ayıplı olarak teslim alınması halinde Alıcı, ürünü teslim alırken kargo görevlisine tutanak tutturma hakkına sahiptir.

## 5. Cayma Hakkı
- 5.1. Alıcı, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa tesliminden itibaren **14 (on dört) gün içerisinde** hiçbir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.
- 5.2. Cayma hakkının kullanılması için bu süre içinde Satıcı'ya yazılı olarak veya kalıcı veri saklayıcısı ile bildirimde bulunulması zorunludur.
- 5.3. Cayma hakkının kullanılması durumunda, ürünün Satıcı'ya geri gönderim masrafı Alıcı'ya aittir.
- 5.4. **Cayma hakkı istisnası — özel üretim ürünler:** 27.11.2014 tarihli Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi (ğ) bendi uyarınca, **müşteri özel istekleri veya talepleri doğrultusunda üretilen veya kişiselleştirilen (özel boy kaynaklı şerit testere bıçakları, müşterinin verdiği ölçüye göre üretilen ürünler vb.) ürünler için cayma hakkı kullanılamaz.**
- 5.5. İade edilen ürünün orijinal ambalajında, kullanılmamış ve yeniden satılabilir durumda olması gerekir.

## 6. Uyuşmazlıkların Çözümü
İşbu sözleşmenin uygulanmasından doğan uyuşmazlıkların çözümünde, Gümrük ve Ticaret Bakanlığı'nca yasal olarak ilan edilen değere kadar Alıcı'nın yerleşim yerindeki Tüketici Hakem Heyetleri, üzeri uyuşmazlıklarda Tüketici Mahkemeleri yetkilidir.

## 7. Ödeme ve Teslimat
- 7.1. Ödeme: Kredi kartı, banka kartı veya havale/EFT ile yapılır.
- 7.2. Teslimat: Anlaşmalı kargo firması ile Alıcı'nın belirttiği adrese gerçekleştirilir. Kargo bedeli sipariş özetinde belirtilir.

## 8. Yetkili Mahkeme
Sözleşmeden doğacak uyuşmazlıklarda İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir.

Alıcı, işbu sözleşmenin tüm hükümlerini okuduğunu, anladığını ve kabul ettiğini siparişini onaylayarak beyan ve taahhüt eder.`,
  },

  // ----------------------------------------------------------------
  {
    slug: "on-bilgilendirme-formu",
    title: "Ön Bilgilendirme Formu",
    shortTitle: "Ön Bilgilendirme",
    body: `# Ön Bilgilendirme Formu
Son güncelleme: ${c.lastUpdated}

İşbu Ön Bilgilendirme Formu, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve 27.11.2014 tarih, 29188 sayılı Mesafeli Sözleşmeler Yönetmeliği gereğince hazırlanmıştır.

## 1. Satıcı Bilgileri
- **Unvan:** ${c.legalName}
- **Adres:** ${c.address}
- **Telefon:** ${c.phone}
- **E-posta:** ${c.email}
- **MERSİS:** ${c.mersisNumber}

## 2. Sözleşme Konusu Mal/Hizmetin Temel Nitelikleri
Sipariş özetinde belirtilen ürünlerin (şerit testere bıçakları, makineler, aksesuarlar) temel nitelikleri, ${c.websiteUrl} sitesinde ürün detay sayfasında belirtilmiştir.

## 3. Satış Fiyatı
- Sipariş özetinde belirtilen toplam tutar (KDV dahil) geçerli satış bedelidir.
- Kargo ücreti varsa ayrıca belirtilir.

## 4. Ödeme Şekli
- Kredi/banka kartı ile online ödeme
- Havale/EFT ile peşin ödeme

## 5. Teslimat
- **Teslimat şekli:** Anlaşmalı kargo firması ile Alıcı'nın belirttiği adres
- **Teslimat süresi:** Ödemenin alınmasını takiben en geç 30 gün
- **Standart süre:** Stoktaki ürünler 1-3 iş günü içinde kargolanır
- **Özel üretim:** Özel boy kaynaklı şerit bıçaklar 3-7 iş günü içinde hazırlanıp kargolanır

## 6. Cayma Hakkı
- Alıcı, ürünü teslim aldığı tarihten itibaren **14 (on dört) gün içinde** cayma hakkına sahiptir.
- Cayma bildirimi e-posta veya yazılı olarak ${c.email} adresine yapılır.
- **Cayma hakkı istisnası:** Müşteri talebine göre özel olarak üretilen (özel boy kaynaklı şerit testere bıçakları vb.) ürünler için cayma hakkı kullanılamaz (Yönetmelik md. 15/ğ).
- İade kargo masrafı Alıcı'ya aittir.

## 7. Şikayet ve İtiraz
Uyuşmazlık halinde Alıcı, yerleşim yerinin bulunduğu Tüketici Hakem Heyeti'ne başvurabilir. Parasal sınırın üzerindeki uyuşmazlıklar için Tüketici Mahkemeleri yetkilidir.`,
  },

  // ----------------------------------------------------------------
  {
    slug: "iade-ve-cayma",
    title: "İade ve Cayma Politikası",
    shortTitle: "İade Politikası",
    body: `# İade ve Cayma Politikası
Son güncelleme: ${c.lastUpdated}

## 1. Cayma Süresi
Müşterilerimiz, ürünü teslim aldıkları tarihten itibaren **14 (on dört) gün içerisinde** herhangi bir gerekçe göstermeksizin cayma hakkını kullanabilir.

## 2. Cayma Hakkı Olmayan Ürünler
6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği 15. maddesi uyarınca aşağıdaki ürünlerde **cayma hakkı kullanılamaz**:

- **Özel boy kaynaklı şerit testere bıçakları** — müşterinin verdiği ölçüye göre üretilen, kişiye özel kaynaklı ürünlerdir
- **Hijyenik koşullar gerektiren ürünler** (et-kemik şeritleri) — ambalajı açılmış olanlar
- **Hızla bozulabilen** veya son kullanma tarihi geçebilecek ürünler

## 3. İade Şartları
Cayma hakkı kullanılabilir ürünlerde iade için:
- Ürün **orijinal ambalajında** ve **kullanılmamış** olmalıdır
- Faturanın aslı veya nüshası ile gönderilmelidir
- Kargo süreci tarafımıza ulaştığı anda başlar

## 4. İade Süreci
1. ${c.email} adresine veya hesap sayfanızdan iade talebi oluşturun
2. Tarafımızdan iade onayı ve gönderim talimatı alın
3. Ürünü, anlaşmalı kargo firmamız ile (gönderim ücreti Alıcı'ya aittir) tarafımıza ulaştırın
4. Ürün tarafımıza ulaştıktan sonra **10 iş günü içinde** ödeme iadeniz başlatılır
5. Kredi kartı iadeleri banka süreçleri nedeniyle 7-14 gün sürebilir

## 5. Hasarlı / Ayıplı Ürün
- Kargo tesliminde hasar tespit ederseniz teslimatı kabul etmeyin veya **hasar tutanağı** tutturun.
- Ayıplı ürün tespitinde 7 gün içinde bildirim yapmanız gerekir.
- Ayıplı ürünlerde gönderim/iade masrafları tarafımıza aittir.

## 6. İletişim
Tüm iade/cayma talepleri için: ${c.email} — ${c.phone}`,
  },

  // ----------------------------------------------------------------
  {
    slug: "uyelik-sozlesmesi",
    title: "Üyelik Sözleşmesi",
    shortTitle: "Üyelik Sözleşmesi",
    body: `# Üyelik Sözleşmesi
Son güncelleme: ${c.lastUpdated}

## 1. Taraflar
İşbu sözleşme, ${c.legalName} ("Şirket") ile ${c.websiteUrl} adresine üye olan kullanıcı ("Üye") arasında elektronik ortamda akdedilmiştir.

## 2. Sözleşmenin Konusu
Üyenin Şirket'in sunduğu hizmetlerden yararlanmasına ilişkin koşulları belirler.

## 3. Üyelik Şartları
- 18 yaşından büyük olmak veya yasal vasi onayına sahip olmak
- Doğru, güncel ve eksiksiz bilgi sağlamak
- Kullanıcı adı ve şifrenizi gizli tutmak
- Hesabınızdan yapılan tüm işlemlerden sorumlu olmak

## 4. Üye Yükümlülükleri
- Üye, sahte / başkasına ait bilgilerle hesap oluşturamaz
- Üye, siteyi hukuka, ahlaka ve genel adaba aykırı kullanamaz
- Üye, başka kullanıcıların verilerini izinsiz toplayamaz
- Üye, sitede zararlı yazılım barındıramaz, güvenliği bozmaya yönelik eylemde bulunamaz

## 5. Hizmetler
- Online sipariş verme
- Sipariş takibi ve geçmişi
- Adres defteri
- Fatura ve kargo bilgilerine erişim
- Pazarlama iletişimi (açık rıza halinde)

## 6. Üyelik İptali
Üye, hesabını dilediği zaman ${c.email} adresine bildirim göndererek sonlandırabilir. Şirket, sözleşmeyi ihlal eden üyelerin üyeliğini iptal etme hakkını saklı tutar.

## 7. Kişisel Verilerin Korunması
Üye'ye ait kişisel veriler, [KVKK Aydınlatma Metni](/yasal/kvkk-aydinlatma-metni) uyarınca işlenir.

## 8. Sözleşme Değişiklikleri
Şirket, işbu sözleşmeyi tek taraflı olarak değiştirme hakkını saklı tutar. Değişiklikler sitede yayınlandığı tarihten itibaren geçerli olur.

## 9. Uyuşmazlık
İhtilaflarda İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir.`,
  },
];

export function getLegalPage(slug: string): LegalPage | null {
  return LEGAL_PAGES.find((p) => p.slug === slug) || null;
}
