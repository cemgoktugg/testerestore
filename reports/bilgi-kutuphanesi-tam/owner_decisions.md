# Sahip kararları — tek liste (2026-10-27)

Altı alanın 82 sahip kararı ve NOTES dosyalarındaki açık sorular birleştirildi. Doğrulama sırasında bulunan yeni konular da eklendi (ör. iade masrafı ve iade süresi, danışmanın boy sınırları, WhatsApp numarası). Sonuç **40 karar**. Her kararın eski kimlikleri, birleştirilmiş JSON'larda `owner_decisions[].consolidated_as` alanına yazıldı. Karar bekleyen kayıtlarda `review.status = needs_owner` ve not alanında "sahip kararı: OD-xx" var.

**Öncelik**
- **P0:** Hukuki risk (tüketici hukuku, KVKK), para, güvenlik ya da müşterinin bugün yanlış bir cevaba göre hareket etmesi.
- **P1:** Müşteriye görünen doğruluk ve tutarlılık.
- **P2:** Olsa iyi olur.

**Karar verecekler:** sahip · avukat · tedarikçi · ürün sorumlusu (teknik içerik) · geliştirici (sahip onayıyla).

Kısaltmalar: cs = catalog_store, ms = metal_selection, mt = materials, nm = non_metal, uc = usage_care, qg = questions_glossary.

> Danışman cevapları **şimdiden** güvenli tarafta tutuldu. Teslim süresi yok, garanti yok, WhatsApp yok, iade masrafı hakkında bir şey söylenmiyor, karbür sınırı aralık olarak veriliyor (60–65 HRC). Aşağıdaki kararlar verildikçe ilgili kayıtlar güncellenmeli.

---

## P0 — önce bunlar (12 karar)

### OD-01 · Teslim süresi vaatleri kaldırılsın mı?
- **Soru:** Sitede birbirini tutmayan süreler yazıyor: "24 saatte kargo", "14:00'a kadar aynı gün", ölçüye göre üründe "aynı gün kargoda", ön bilgilendirme formunda ve sipariş e-postasında "1–3 / 3–7 iş günü". Bunlar kalsın mı?
- **Seçenekler:**
  - (a) Hepsini kaldırın. Her yerde "en kısa sürede kargoya verilir" yazsın. Yasal üst sınır (Mesafeli Sözleşmeler Yönetmeliği md.16: en geç 30 gün) yalnız sözleşmede kalsın.
  - (b) Gerçekten tutturabileceğiniz tek bir süre belirleyin ve her yere aynısını yazın.
- **Öneri:** (a). Danışman zaten süre vermiyor. "Yasal üst sınır 30 gün" cümlesini danışmanın söylemesine izin vermek isteyip istemediğinize de karar verin. Önerim izin vermek: bu bir vaat değil, sözleşmede zaten yazan sınır.
- **Kim:** sahip (sözleşme metni için avukat).
- **Etkilenen:** footer (veritabanı), ana sayfa slaytı, sepet sayfası, BladeConfigurator "Aynı gün kargoda", hazır boy sayfaları ve 26 ürünün SEO metni, admin hazır boy üreticisi, sipariş onay e-postası, Ön Bilgilendirme Formu. Kayıtlar: cs.dispatch-time, cs.readymade-list, cs.readymade-stock.
- Eski kimlikler: od.delivery-time-claims, od.legal-30-day-mention, od.readymade-seo-prices.

### OD-02 · Cayma istisnasının madde numarası ve kapsamı doğru mu?
- **Soru:** Yasal metinler, ölçüye göre bıçakta cayma olmadığını "md.15 (ğ)" bendine dayandırıyor. Resmî Gazete'de bu istisna **15/1-(b)** bendidir; (ğ) "elektronik ortamda anında ifa edilen hizmetler" içindir. Açılmış et-kemik bıçağındaki hijyen istisnası (15/1-ç) ise yalnız İade Politikası'nda geçiyor. Ayrıca müşterinin hazır bir listeden boy girmesi gerçekten "kişiye özel üretim" sayılır mı?
- **Seçenekler:**
  - (a) Atfı 15/1-(b) olarak düzeltin. Hijyen istisnasını Mesafeli Satış Sözleşmesi'ne ve Ön Bilgilendirme Formu'na da ekleyin.
  - (b) Kapsam şüpheliyse ölçüye göre bıçakta da sınırlı bir cayma hakkı tanıyın.
- **Ayrıca:** Kurumsal (tacir) alıcıya da hazır boyda 14 gün cayma tanınsın mı?
- **Öneri:** (a) ve avukat görüşü. Tacir alıcı için müşteri dostu seçenek aynı hakkı tanımaktır.
- **Kim:** avukat.
- **Etkilenen:** `lib/legal-content.ts` satır 200 ve 253. Kayıtlar: cs.return-custom, cs.return-meatbone, cs.return-ready-made, cs.bulk-corporate.
- Eski kimlikler: od.cayma-article-citation, od.tacir-cayma.

### OD-03 · İade süreci metinleri yönetmelikle uyumlu mu?
- **Soru:** İade ve Cayma Politikası ile Mesafeli Satış Sözleşmesi şu maddeleri içeriyor. Kaynak: Resmî Gazete 27.11.2014, MSY md.12–13.
  - (a) "İade kargo masrafı Alıcı'ya aittir." md.12/3'e göre, satıcının iade için gösterdiği kargoyla gönderilen üründe tüketiciden iade masrafı istenemez.
  - (b) "Ürün bize ulaştıktan sonra 10 iş günü içinde iade başlatılır." md.12/1'e göre iade, cayma **bildiriminden** itibaren 14 gün içinde ve tek seferde yapılır.
  - (c) "Ürün orijinal ambalajında ve kullanılmamış olmalı" şartı.
  - (d) "Hesap sayfanızdan iade talebi oluşturun." Hesap sayfasında böyle bir özellik yok.
  - (e) "Ayıplı ürünü 7 gün içinde bildirin." 6502 sayılı Kanun'da ayıplı maldan sorumluluk iki yıllık zamanaşımına tabidir; tüketiciye 7 günlük bildirim şartı konabilir mi?
- **Öneri:** Avukat onayıyla beş maddeyi de yönetmeliğe göre düzeltin. Kanal olarak "İletişim formu / e-posta" yazın. Danışman bu konularda şimdilik nötr konuşuyor (masraf ve kargo bilgisi iade onayıyla bildirilir) ve yalnız yasal süreleri söylüyor (bildirimden itibaren 14 gün iade, malı 10 gün içinde gönderme).
- **Kim:** avukat.
- **Etkilenen:** `legal-content.ts` satır 199, 201, 254, 280, 285, 288 ve 293. `front_desk._returns` metnindeki "orijinal ambalajında olmalı" ifadesi. Kayıtlar: cs.return-ready-made, cs.return-process, cs.refund-timing, cs.defective-goods, cs.warranty.
- Eski kimlikler: od.defect-7-day-notice, od.usage.defect-notice-period, od.return-request-account. **Yeni:** iade masrafı ve iade süresi.

### OD-05 · KVKK metni sohbet danışmanını ve yurt dışı aktarımı kapsıyor mu?
- **Soru:** KVKK Aydınlatma Metni "yurt dışına veri aktarımı yapılmamaktadır" diyor. Oysa sohbet mesajları yurt dışındaki yapay zekâ sağlayıcısına gidiyor ve çerez politikası Google Analytics ile Meta Pixel'i sayıyor. Ayrıca:
  - Sohbete özgü bir aydınlatma (amaç, alıcı, 90 günlük kayıt saklama) yok.
  - Bülten ve terk edilmiş sepet e-postalarında ticari ileti onayı ve İYS kaydı yok, kolay abonelikten çıkış da yok.
- **Seçenekler:**
  - (a) Metni gerçek duruma göre düzeltin: yurt dışı aktarım, sohbet bölümü ve saklama süresi. Gerekli sözleşme ve izin sürecini başlatın.
  - (b) Bunlar yapılana kadar sohbeti ve pazarlama e-postalarını sınırlayın.
- **Öneri:** (a) ve avukat. Danışmanın gizlilik cevabına "mesajlar yapay zekâ hizmet sağlayıcısına iletilebilir" cümlesi eklendi.
- **Kim:** avukat (uygulama için geliştirici).
- **Etkilenen:** KVKK metni, çerez politikası, AdvisorWidget, bülten ve terk edilmiş sepet işi. Kayıtlar: cs.chat-privacy, cs.kvkk-rights, cs.cookies, cs.newsletter.
- Eski kimlik: od.kvkk-foreign-transfer.

### OD-06 · Gerçek iletişim bilgileri ve WhatsApp numarası nedir?
- **Soru:** İletişim sayfası, footer ve künye farklı telefon ve e-posta gösteriyor (`212 000 00 00` / `212 555 10 20`, `info@` / `destek@`). VKN ve MERSİS yer tutucu. Alan adında MX kaydı yok. Sağ alttaki WhatsApp butonu yer tutucu bir numaraya (`wa.me/902125551020`) gidiyor. Müşteri sipariş numarasını veya kişisel bilgisini yabancı bir numaraya gönderebilir.
- **Öneri:**
  - Gerçek bilgiler gelene kadar WhatsApp butonunu kaldırın.
  - Tek telefon, tek e-posta (MX ve SPF ile), tek çalışma saati ve gerçek künye girin.
  - Danışmanın kendi metinlerinden de WhatsApp'ı çıkarın: `front_desk._contact`, `_identity` ve `_unknown_material` hâlâ WhatsApp öneriyor. Kütüphane cevaplarından WhatsApp çıkarıldı.
- **Kim:** sahip.
- **Etkilenen:** iletisim sayfası, footer veritabanı, company-info.ts, WhatsAppButton, front_desk. Kayıtlar: cs.contact-routes, cs.human-agent, cs.contact-hours, cs.company-info.
- Eski kimlik: od.contact-details-placeholder.

### OD-07 · Garanti, üstünlük ve menşe iddiaları kaldırılsın mı?
- **Soru:** Sitede belgesi gösterilemeyen iddialar var:
  - "koşulsuz değişim garantisi", "kaynak garantisi", "IDEAL kaynak ... kopma garantisi"
  - "rakipsiz kesim hızı", "soğutma diş ömrünü %80 artırır" (tüm ürün sayfalarında), "5 kat ömür", "M42'den %35 uzun ömür", "Türkiye'nin lider platformu"
  - "Alman ve İsveç menşeili çelik", ürün adı "Spezial Alman Çeliği"
  - Hakkımızda'daki tavlama, taşlama ve kontrol adımları
  - "Gerçek alıcılarımızın değerlendirmeleri" (alıcı doğrulaması yok)
- **Seçenekler:** (a) Belgesi olmayanları kaldırın veya nötr ve doğrulanabilir bir ifadeye çevirin. (b) Politika veya belge varsa yazılı hale getirip koşullarıyla yayımlayın.
- **Öneri:** (a). Seed ve yedek dosyalar da temizlenmeli; yoksa yeniden seed çalışınca iddialar geri gelir. Kaynakça: Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği. Danışman zaten "garanti" demiyor.
- **Kim:** sahip ve avukat.
- **Etkilenen:** footer, hero slaytları, ProductDetailClient, katalog, hakkımızda, ProductReviews, seed dosyaları. Kayıtlar: cs.warranty, cs.steel-origin, cs.welding, cs.reviews, cs.spezial-what, uc.warranty-weld-claim.
- Eski kimlikler: od.weld-warranty-claim, od.superiority-claims, od.steel-origin-claim, od.welding-process-claims, od.reviews-verified-claim.

### OD-08 · Tüketiciye fiyat KDV dahil gösterilsin mi?
- **Soru:** Ürün sayfası ve konfigüratör fiyatı KDV hariç gösteriyor. Hazır boy kartlarında KDV ibaresi bile yok. Danışman "+ KDV" yazıyor. Fiyat Etiketi Yönetmeliği'ne göre tüketiciye KDV dahil satış fiyatı gösterilmesi gerekir.
- **Öneri:** KDV dahil fiyatı birincil gösterin; KDV hariç tutar kurumsal alıcı için ikinci satırda kalsın. Danışman da iki tutarı birlikte versin.
- **Kim:** sahip (avukat teyidi).
- **Etkilenen:** BladeConfigurator, hazır boy kartları, `front_desk._quote`. Kayıtlar: cs.kdv, cs.price-how, cs.price-quote.
- Eski kimlikler: od.kdv-display, od.qg-kdv-display.

### OD-09 · Sadakat puanı: "1 puan = 0,50 TL" yazıyor ama kullanılamıyor
- **Soru:** Puanlarım sayfası her 100 TL'de 1 puan ve "1 puan = 0,50 TL indirim" diyor. Ödeme adımında puan kullanılamıyor. Sayfa "tamamlanmış siparişte" puan verildiğini söylüyor, kod ise puanı sipariş anında yazıyor.
- **Seçenekler:** (a) Puan kullanımını devreye alın. (b) Kullanım gelene kadar TL değerini kaldırın veya "yakında" notu koyun. (c) Sayfayı gizleyin.
- **Öneri:** (a) yapılana kadar (b). Değeri olan ama kullanılamayan bir puan para ile ilgili yanıltıcı bilgi sayılabilir.
- **Kim:** sahip.
- **Etkilenen:** /hesabim/puanlarim, loyalty modülü. Kayıt: cs.loyalty-points.
- Eski kimlik: od.loyalty-redemption.

### OD-11 · Ahşap, et ve sünger bıçağında diş ya da ağız tipi seçilemiyor: müşteriye ne gidiyor?
- **Soru:** Fiyat listesinde bu üç ailenin diş listesi boş, bu yüzden sipariş ekranı diş ve ağız alanını gizliyor. Buna karşın:
  - Ürün metinleri seçenek sayıyor: ahşapta 4/6, 6/10, 10/14; ette 3, 4, 6; süngerde dalgalı, tırtıklı, düz.
  - Sünger rehberi "ağız tipini ürün sayfasında seçebilirsiniz" diyor.
  - Müşteri seçtiğini sanıp farklı bir bıçak alabilir.
- **Seçenekler:** (a) Fiyat listesine diş ve ağız seçeneklerini ekleyin (fiyat aynıysa aynı fiyatla). (b) Zorunlu bir "diş / ağız tercihi" not alanı ekleyin. (c) En azından metinlerdeki "seçebilirsiniz" ifadelerini kaldırın ve varsayılan olarak ne gönderdiğinizi yazın.
- **Öneri:** (a). O zamana kadar (c). Danışman şimdilik "tercihinizi siparişten önce bize yazın" diyor.
- **Kim:** sahip ve ürün sorumlusu.
- **Etkilenen:** fiyat matrisi, BladeConfigurator, ürün metinleri, sünger rehberi. Kayıtlar: cs.wood-options, cs.meatbone-options, cs.textile-options, cs.tooth-form-set, nm.foam-edge-not-selectable, nm.foam-edge-types, nm.meat-tpi-fresh-frozen.
- Eski kimlik: od.non-metal-tooth-selection.

### OD-13 · Danışman, satılamayacak boylar için fiyat veriyor
- **Soru:** Sepet her ürünün kendi boy sınırını uyguluyor (blade-guard). Örnekler: ahşap 1.000–8.000 mm, et-kemik 1.500–6.000 mm, karbür 1.500–12.000 mm, M51 1.500–15.000 mm. Danışman (`front_desk` satır 560 ve 654) ile `/store/blade-price/calculate` ise tüm aileler için yalnız 1.000–15.000 mm'ye bakıyor. Sonuç: danışman 9.000 mm ahşap bıçak için fiyat söylüyor, sepet bunu reddediyor.
- **Öneri:** Danışman ve fiyat hesaplama ucu ürünün kendi min/max boy değerini (/store/products metaverisi) kullansın; aralık dışı boyda fiyat yerine sınırı söylesin.
- **Kim:** geliştirici (sahip onayı).
- **Etkilenen:** front_desk.py, calculate/route.ts. Kayıtlar: cs.length-limits, cs.short-lengths.
- Eski kimlik: od.length-limits-advisor.

### OD-14 · Et bıçağında paslanmaz zorunlu mu?
- **Soru:** Et rehberinin SSS'si "paslanmaz zorunlu değildir" diyor. Türk Gıda Kodeksi Gıda ile Temas Eden Madde ve Malzemeler Yönetmeliği Ek-4/1-a ise paslanmaz olmayan metallerin gıdaya uygun bir kaplamayla korunmasını istiyor.
- **Öneri:** Gıda mevzuatı görüşü gelene kadar rehberdeki "zorunlu değildir" cümlesini kaldırın. Danışman şu an "kesin değerlendirme yapamıyoruz; gıda denetim birimine danışın" diyor. Ürünümüzün AISI 420 olduğunu tedarikçi belgesiyle de teyit edin (OD-36).
- **Kim:** avukat veya gıda mevzuatı uzmanı.
- **Etkilenen:** et-kemik rehberi SSS. Kayıtlar: nm.meat-stainless-legal, nm.meat-food-contact-law.
- Eski kimlik: od.meat-stainless-legal.

### OD-16 · Canlı ödemede sahte TC kimlik numarası ve sabit IP gönderiliyor
- **Soru:** `payment-iyzico/service.ts` alıcı bilgisi olarak sabit `identityNumber: "11111111111"` (sandbox değeri), sabit bir IP ve yedek e-posta/telefon gönderiyor. Canlı modda bu iyzico kurallarına ve sahtecilik kontrollerine uygun mu?
- **Öneri:** iyzico'ya sorun. Gerçek IP'yi ve (fatura için girildiyse) gerçek TCKN'yi gönderin; değilse iyzico'nun canlı ortamda izin verdiği yöntemi kullanın.
- **Kim:** sahip ve geliştirici (iyzico ile).
- **Etkilenen:** ödeme modülü. Kütüphane kaydı yok; kapsam dışı ama para riski taşıyor.
- **Yeni.** Kaynak: catalog_store NOTES.

---

## P1 — müşteriye görünen doğruluk ve tutarlılık (20 karar)

### OD-04 · Yasal metinlerdeki diğer hatalar düzeltilsin mi?
- **Soru:** Yasal metinlerde şu hatalar var:
  - Mesafeli Satış md.7.1 ve Ön Bilgilendirme md.4 "havale/EFT" ile ödeme diyor, ama ödeme adımında bu seçenek yok (IBAN boş).
  - "Gümrük ve Ticaret Bakanlığı" yazıyor.
  - md.8'deki "İstanbul (Çağlayan)" yetki maddesi md.6 ile çelişiyor.
  - Ön Bilgilendirme Formu "makineler, aksesuarlar" diyor.
  - Kayıt sayfası var olmayan "Kullanım Koşulları"na atıf yapıyor.
  - Faturanın nasıl iletildiği (e-posta mı, paket içi mi) hiçbir yerde yazmıyor.
- **Öneri:** Avukat gözden geçirmesiyle birlikte hepsini düzeltin. Havale/EFT'yi gerçekten açana kadar metinden çıkarın.
- **Kim:** avukat ve sahip.
- **Kayıtlar:** cs.payment-methods, cs.bank-transfer, cs.invoice-delivery, cs.register, cs.company-info.
- Eski kimlikler: od.havale-payment-text, od.legal-text-fixes.

### OD-10 · "Stokta" ibaresi stok takibi kapalıyken gösteriliyor
- **Soru:** Tüm varyantlarda stok takibi (`manage_inventory`) kapalı. Bu yüzden her yerde, kaynaklanacak ürünlerde bile, "Stokta" ve hazır boylarda "stoğumuzda" yazıyor.
- **Öneri:** Hazır boylarda gerçek adet girin. Ölçüye göre ürünlerde "Siparişe göre kaynaklanır" yazsın.
- **Kim:** sahip.
- **Kayıtlar:** cs.readymade-stock, cs.readymade-list.
- Eski kimlik: od.stock-display.

### OD-12 · Ürün sayfası ölçüleri sipariş edilebilir ölçülerle uyuşmuyor
- **Soru:** Teknik özellik ve SEO metinlerindeki ölçüler fiyat listesindekilerle aynı değil:
  - M42: metinde 6–41 mm, sipariş ekranında 13–54 mm.
  - M51: metinde 6–41 × 0,65–1,30 mm.
  - Karbür: metinde 10–41 mm; ayrıca karbürde satılmayan "4/6, 5/8" dişleri anılıyor.
  - Ahşap, et ve sünger tabloları da farklı.
  - M42 sayfasının sunucu HTML'i yedek ölçü listesini ve buna göre bir fiyat gösteriyor; arama motorları ve yapay zekâ araçları bunu okuyor.
- **Öneri:** Bu metinleri fiyat matrisinden otomatik üretin. Yedek listeyi sunucu HTML'inde göstermeyin.
- **Kim:** ürün sorumlusu (uygulama: geliştirici).
- **Kayıtlar:** cs.bimetal-options, cs.carbide-options, cs.m51-what, cs.wood-options, cs.meatbone-options, cs.textile-options, cs.size-not-listed.
- Eski kimlikler: od.product-metadata-vs-matrix, od.catalog-size-mismatch, od.m51-dimensions.

### OD-15 · Karbür Uçlu ürünümüz tam olarak nedir?
- **Soru:** Ürünün şu özellikleri bilinmiyor:
  - Diş geometrisi: pozitif mi negatif mi, üçlü talaş mı, setli mi.
  - Sertlik sınırı. Kaynaklar 60 / 61 / 65 HRC diyor. Rehber "~65 HRC" yazıyor; kütüphane "yaklaşık 60–65 HRC, geometriye bağlı" diyor.
  - Krom kaplı (indüksiyonlu) mil kesimine uygunluğu.
  - Ürün ve kategori metni "aşındırıcı kompozit" diyor; kompozit üreticileri ise tanecikli (grit) kenarlı bıçak öneriyor.
- **Öneri:** Tedarikçiden ürün veri sayfası alın. O gelene kadar:
  - Her yerde "60–65 HRC" aralığını kullanın.
  - Metinlerden "kompozit" iddiasını çıkarın.
  - Krom milde "uygunluğu sipariş öncesi teyit edelim" denmeye devam etsin.
- **Kim:** tedarikçi ve ürün sorumlusu.
- **Kayıtlar:** cs.carbide-what, ms.carbide-when, ms.carbide-geometry, ms.hardened-shaft, ms.hardness-limit-carbide, nm.plastic-gfrp, nm.plastic-which-our-blade; ayrıca `grades.json → blade_limits`.
- Eski kimlikler: od.carbide-product-spec, od.carbide-hardness-limit, od.carbide-composite-claim.

### OD-17 · Diş adımında danışman ile ürün sayfası farklı sonuç veriyor
- **Soru:** İki farklılık var:
  - Boru ve profilde danışman ürün sayfasındaki çizelgeyi kullanmıyor, yalnız et kalınlığı kovasına bakıyor. Örnek 40×40×2: danışman 14/18 (27×0,9'da 5/8) diyor, ürün sayfası 18 (27×0,9'da 8).
  - Satılan dişe oturtma kuralı da farklı. Ürün sayfası en yakın ortalama dişi seçiyor; danışman önce değişken dişleri tercih ediyor. Örnek Ø40 dolu mil, 27×0,9 bıçak: ürün sayfası 8, danışman 5/8.
- **Öneri:**
  - `tpi_refine`'a boru/profil çizelgesi adımı ekleyin (dış ölçü × et).
  - Ürün sayfasındaki oturtma kuralına danışmandaki "değişken diş tercihi"ni ekleyin.
  - Çizelgenin kendisi değişmesin (SCHEMA kural 6).
  - Kütüphane cevaplarında "danışman ve ürün sayfası aynı sonucu verir" iddiası çıkarıldı.
- **Kim:** geliştirici ve ürün sorumlusu.
- **Kayıtlar:** ms.tpi-tube-table, ms.tpi-thin-wall-profile, ms.tpi-medium-wall-profile, ms.tpi-solid-40, ms.tpi-solid-table, ms.tpi-snap-explained, ms.tpi-other-charts.
- Eski kimlikler: od.advisor-tube-lookup, od.tube-tpi-table, od.solid-tpi-table.

### OD-18 · Hangi ölçü ve dişleri gerçekten satıyoruz?
- **Soru:**
  - 27×0,9 ve 34×1,1 bi-metalde ince cidar için gereken 10/14, 8/12, 6/10 dişleri yok. 27×0,9'daki en sık diş 8 TPI.
  - M42 ve M51 aynı fiyat matrisini (aynı ölçü, aynı metre fiyatı) kullanıyor. Rehber "M42 düşük, M51 orta maliyet" diyor.
  - Bazı satırlar tedarikçi kataloğunda yok; örneğin M51'de 13 mm, 34×1,2 ve 8 TPI.
  - **Yeni:** Canlı fiyat listesine bugün 6×0,6, 6×0,9 ve 10×0,6 mm satırları eklenmiş. 10×0,6'nın diş değeri hatalı tek bir dize ("6/10 , 8/12").
- **Öneri:**
  - Tedarikçiyle satır satır teyit edin.
  - M51 için ayrı bir matris açın.
  - Eksik ince dişleri ekleyin.
  - Hatalı satırı düzeltin.
- **Kim:** sahip ve tedarikçi.
- **Kayıtlar:** cs.bimetal-options, cs.carbide-options, cs.m51-price, cs.m51-what, ms.tpi-thin-wall-profile, ms.tpi-medium-wall-profile, ms.tpi-solid-small, uc.ts-tooth-strippage.
- Eski kimlikler: od.assortment-27-34, od.matrix-vs-supplier-catalog, od.m42-m51-shared-matrix.

### OD-19 · Rodaj için "bizim önerimiz" ne olsun?
- **Soru:** Üreticiler farklı değer veriyor:
  - İlerleme: normalin %20–75'i.
  - Hız: normal hız ya da %70–75.
  - Alan: 100–650 cm² veya yaklaşık 15 dakika.
  - Tedarikçi kuralı: normal hız, yarı ilerleme, 300–500 cm².
  - Site SSS ve rehber "150–500 cm²" diyor; alt sınır kaynaklarda 100 cm².
  - Rehber "karbür de alıştırılmalıdır" diyor; kaynaklar burada ayrışıyor (fabrikada alıştırılmış / bi-metalle aynı / ürüne özel 30 dakika).
- **Öneri:**
  - Ürünler tedarikçiden geliyorsa tedarikçi kuralını "TestereStore önerisi" olarak benimseyin.
  - Rehber ve SSS'deki alt sınırı 100 cm² yapın.
  - Karbür için tedarikçi değerleri gelene kadar sayı vermeyin.
  - Kütüphanedeki "önerimiz" ifadesi karar verilene kadar çıkarıldı.
- **Kim:** ürün sorumlusu ve tedarikçi.
- **Kayıtlar:** uc.breakin-how, uc.breakin-speed-question, uc.breakin-carbide.
- Eski kimlikler: od.usage.break-in-procedure, od.usage.break-in-carbide.

### OD-21 · Bor yağı oranında "%4–5 Türkiye'de yaygın" satırı kalsın mı?
- **Soru:** Rehber ve SSS'de "%4–5" bir öneri satırı gibi duruyor. Bu değerin kaynağı bir bayi blogu (B). Bir bıçak üreticisi genel çeliklerde %8–12, paslanmazda %15 ve üzeri öneriyor. Tedarikçi rehberi %10–12 diyor, %7'nin altına inmeyin uyarısı yapıyor ve %5 civarında etkinin kaybolduğunu yazıyor.
- **Öneri:** Satırı "atölyelerde düşük oranlar yaygın, ancak üreticiler daha yüksek oran önerir" olarak yumuşatın. Kütüphane cevabı bu şekilde yazıldı.
- **Kim:** ürün sorumlusu.
- **Kayıt:** uc.coolant-concentration.
- Eski kimlikler: od.coolant-tr-practice, od.usage.coolant-concentration.

### OD-22 · Bant hızı sayıları müşteriye ne kadar ayrıntılı verilecek?
- **Soru:** Kaynaklar arasında farklar var:
  - Yapı çeliği: 55–95 m/dk (rehber 75–85).
  - Alüminyum: 84–135 m/dk (rehber 85–105, kural motoru 80–120).
  - 316 paslanmazın kesme performansı: tabloda 26–32, üreticinin kendi örneğinde 10–13 cm²/dk.
  - Bazı hız tabloları tedarikçiye ait.
- **Öneri:** Kaynak aralığı ve "makine ve bıçak kılavuzu esas" notuyla verin; 316 için muhafazakâr 10–13 değerini kullanın. Rehberdeki hız tablosunun başlığına "kaynağa göre değişir" ekleyin.
- **Kim:** ürün sorumlusu.
- **Kayıtlar:** ms.cutting-table-bimetal, ms.speed-structural, ms.structural-steel, ms.aluminium, ms.stainless-austenitic, ms.machine-speed-steps, uc.coolant-aluminium.
- Eski kimlikler: od.speed-structural, od.speed-aluminium, od.aluminium-speed, od.316-cutting-rate; ayrıca qg NOTES §6-8.

### OD-24 · Kural motorundaki (rules.json) hatalı metinler düzeltilsin mi?
- **Soru:** Kural motorunda şu hatalar var:
  - "45° kesimde etkin kalınlık %140 artar"; doğrusu yaklaşık %41 (×1,41).
  - Titanyum ve nikel alaşımı her zaman karbüre yönlendiriliyor; kaynaklar ara sıra kesimde M51 diyor.
  - Alüminyumda çelikten sık diş öneriliyor ve satılmayan 18/24, 24/32 dişleri üretiliyor.
  - Hız TPI'ya bağlı sabit değerlerden hesaplanıyor.
  - Varsayılan ölçüler satılmıyor: 16×0,9 ve 27×1,1.
  - Kaynaksız ömür çarpanları var: "2–3 kat", "5.000 m", "%40–60".
  - Müşteri metninde iç kodlar geçiyor ("BI_METAL_M51 veya CARBIDE").
- **Öneri:** Hepsini düzeltin. Hız, malzeme tablosu × kesit katsayısı ile hesaplansın.
- **Kim:** geliştirici (ürün sorumlusu onayı).
- **Kayıtlar:** ms.tpi-mitre, ms.speed-overview, ms.tpi-soft-materials, ms.tpi-sheet, ms.size-correction.
- Eski kimlikler: od.rules-speed-by-tpi, od.rules-aluminium-tpi. **Yeni:** mitre, Ti/Ni ve ömür çarpanları.

### OD-26 · Et-kemikte resmî diş kuralı ne olsun?
- **Soru:** Kaynakların çoğu ve rehber şu kuralı veriyor: donuk ve kemikli 3 TPI, taze 4 TPI, balık fileto 6 TPI. Bazı satıcılar donuk ete daha sık diş öneriyor. Bir üretici donuk et bıçağında 2–4 TPI diyor.
- **Öneri:** Çoğunluk kuralını resmîleştirin ve OD-11 ile diş seçimini sipariş ekranına ekleyin.
- **Kim:** ürün sorumlusu.
- **Kayıtlar:** nm.meat-tpi-fresh-frozen, nm.meat-fish.
- Eski kimlik: od.meat-frozen-tpi.

### OD-27 · Sünger ve kumaşta hangi ağız tipini önereceğiz?
- **Soru:** Kaynaklar ayrışıyor:
  - Hafızalı köpük: düz (bir makine üreticisi) mi, tırtıklı (bir bıçak üreticisi) mı?
  - Kumaş: düz (tekstil makineleri) mi, dalgalı (rehber) mı, tırtıklı (ürün sayfası) mı?
  - Rehber ayrıca "ürün sayfasında seçebilirsiniz" diyor; bu doğru değil.
- **Öneri:**
  - Esnek düşük ve orta yoğunluklu PU: düz.
  - Hafızalı köpük: düz veya tırtıklı, deneme kesimiyle.
  - Yoğun sünger ve yalıtım: tırtıklı veya dalgalı.
  - Kumaş: düz, lifli malzemede dalgalı.
  - Rehber ve ürün sayfası bu tek tabloya çekilsin.
- **Kim:** ürün sorumlusu.
- **Kayıtlar:** nm.foam-edge-types, nm.foam-memory, nm.textile-fabric.
- Eski kimlik: od.foam-edge-mapping.

### OD-29 · Plastik, kompozit ve sert köpük için hangi ürünümüzü önereceğiz?
- **Soru:** Kütüphane şu eşlemeleri çıkarımla yapıyor:
  - İnce plastik levha: ahşap veya dikey makinede 13 mm Bi-Metal M42 ya da Ahşap Kesim.
  - Çubuk ve blok: metal makinede seyrek dişli M42.
  - PIR ve EPS levha: Ahşap Kesim.
  - CTP ve karbon: ürünümüz yok.
  - Diş adımı ve hız tabloları üreticiye göre çok farklı.
- **Öneri:**
  - Ürün sorumlusu eşlemeyi onaylasın.
  - Onaya kadar "malzemeyi ve makineyi yazın, birlikte seçelim" dili kalsın.
  - Poliüretanda sıcak tel önerilmesin.
- **Kim:** ürün sorumlusu ve tedarikçi.
- **Kayıtlar:** nm.plastic-* (general, acrylic, polycarbonate, pvc, engineering, band-speed, which-our-blade, gfrp), nm.foam-rigid-pir, nm.foam-eps-xps.
- Eski kimlikler: od.plastic-product, od.plastic-pitch, od.plastic-band-speed, od.hotwire-pu.

### OD-30 · "Spezial Alman Çeliği" ahşap bıçağı ne olacak?
- **Soru:** Ürün sitede satılıyor. Sipariş ekranında Ahşap Kesim ile aynı ölçüleri kullanıyor; boy aralığı farklı (1.000–10.000 mm). Danışmanın önerebileceği ürünler arasında değil. Adında belgesiz bir menşe iddiası var (OD-07).
- **Seçenekler:** (a) Danışman listesine ekleyin, adı nötrleştirin (ör. "C75S Ahşap"), farkı açıklayın. (b) Ahşap Kesim ile birleştirin. (c) Kaldırın.
- **Öneri:** (b) veya (a). Şu an danışman Spezial'i yalnız müşteri sorarsa anlatıyor.
- **Kim:** sahip.
- **Kayıtlar:** cs.spezial-what, cs.wood-options, cs.catalog-overview.
- Eski kimlikler: od.spezial-in-catalog, od.second-wood-product.

### OD-31 · Bileme, yeniden kaynak, rulo/metre satışı ve numune var mı?
- **Soru:** Müşteriler bu hizmetleri soruyor. Danışman bugün "sitemizde böyle bir hizmet ürünü yok, bize yazın" diyor.
- **Öneri:** Kararı yazılı hale getirin; varsa koşullarını ve ücretini yazın.
- **Kim:** sahip.
- **Kayıtlar:** cs.services-sharpening, cs.welding, qg.term-rulo, uc.warranty-weld-claim.
- Eski kimlikler: od.usage.resharpen-reweld-service, od.qg-services.

### OD-32 · Kaynaklı bıçakta boy toleransı kaç mm?
- **Soru:** Kaynaklı bıçağın boy toleransı yazılı değil. Müşteri "2750 sipariş ettim, 2745 gelir mi?" diye soruyor.
- **Öneri:** Atölye veya tedarikçi değerini ölçüp yazın (± mm). Değer ürün sayfasına ve uc.length-tolerance kaydına eklensin.
- **Kim:** sahip ve tedarikçi.
- **Kayıt:** uc.length-tolerance.
- Eski kimlikler: od.length-tolerance, od.usage.length-tolerance.

### OD-33 · Sipariş sonrası ve kargo kapsamı
- **Soru:** Dört konu açık:
  - Ölçüye göre sipariş kaynağa girdikten sonra iptal edilebilir mi?
  - Yurt dışı ve KKTC gönderimi yapılıyor mu?
  - Mağazadan teslim alma var mı?
  - Paketleme nasıl (bıçak katlı mı geliyor)?
- **Öneri:** Kısa bir politika yazın; teslim süresi vermeden.
- **Kim:** sahip.
- **Kayıtlar:** cs.order-change, cs.shipping-abroad.
- Kaynak: qg NOTES §6-3, §6-4 (yeni).

### OD-36 · Ürün malzeme bilgileri teyit edildi mi?
- **Soru:** Şu bilgilerin belgesi yok:
  - M51 diş bileşimi. "~%10 Co, ~%10 W" denetimde hiçbir kaynakta doğrulanamadı.
  - M42 için "~%10 Mo". Doğrulanamadı; cevaplardan çıkarıldı, yalnız "~%8 Co" kaldı.
  - Et bıçağında AISI 420 gövde, ahşapta C75S, süngerde "Hassas Tekstil Çeliği".
  - Ürünlerimizin diş formu ve çapraz tipi.
- **Öneri:** Tedarikçi teknik föyü alın; teyit edilemeyen sayısal bileşimi hiçbir yerde yazmayın.
- **Kim:** tedarikçi.
- **Kayıtlar:** cs.m51-what, cs.materials-overview, cs.meatbone-what, cs.tooth-form-set.
- Eski kimlik: od.material-confirmations.

### OD-39 · Dijital katalogda var olmayan dokümanlar listeleniyor
- **Soru:** Katalog sayfasında indirilemeyen PDF'ler duruyor: Genel Katalog 2026, TPI Matrisi, "IDEAL Kaynak Standartları & Tolerans Belgesi" ve diğerleri.
- **Öneri:** Var olmayanları listeden çıkarın. Var olanları tedarikçi adı geçmeyecek şekilde yükleyin.
- **Kim:** sahip.
- **Kayıt:** cs.catalog-documents.
- Eski kimlik: od.documents-catalog.

### OD-40 · Rehberlerdeki içerik düzeltmeleri
- **Soru:** Şu düzeltmeler yapılsın mı?
  - **Gerginlik-hız-soğutma rehberi:** "Dişler kılavuzlardan 1–2 mm dışarıda" → "dişlerin tamamı ve diş boşluğunun yaklaşık 1–2 mm'si kılavuzun dışında".
  - **Ahşap rehberi:**
    - Satılmayan 3/6/10 mm bıçakları ve 2–3 TPI'yı öneriyor.
    - "400 mm kasnak → 0,4 mm" örneği var; en ince bıçağımız 0,6 mm.
    - Kaynağı belirsiz "~12 diş üst sınır" ifadesi var.
  - **M42/M51 rehberi:**
    - "Metal bıçağını ahşapta kullanmak … düşürür" diyor; kaynaklar bi-metali çivili ahşapta öneriyor.
    - Karbür sınırı "~65 HRC" yazıyor (OD-15).
  - **Rodaj rehberi ve SSS:** alt sınır 150 → 100 cm² (OD-19).
  - **Sünger rehberi:** "seçebilirsiniz" ifadesi (OD-11).
  - **Et rehberi:** "paslanmaz zorunlu değildir" ifadesi (OD-14).
  - **Deploy:** 6 rehber canlıda 404; repodaki 3bec1b5 deploy edilmeli.
- **Öneri:** Hepsini düzeltin, ardından deploy edin.
- **Kim:** ürün sorumlusu (içerik).
- **Kayıt:** uc.install-side-guides ve rehber sayfaları.
- Eski kimlik: od.usage.guide-protrusion-wording. **Yeni:** diğer maddeler.

---

## P2 — olsa iyi olur (8 karar)

### OD-20 · Gerginlik: tek bir "TestereStore değeri" verilsin mi?
- Kaynaklar 250–300 N/mm² (Alman üreticiler), 170–210 N/mm² (bayi kaynakları; üst sınır 240) ve genişliğe göre tablo (tedarikçi) veriyor.
- **Öneri:** Aralıkları vermeye devam edin.
- **Kim:** ürün sorumlusu. **Kayıt:** uc.tension-value. Eski kimlik: od.usage.tension-value.

### OD-23 · Bi-metal sertlik sınırı söylemi
- Site ve danışman iki kalite için de "yaklaşık 45 HRC" diyor ve 35–45 HRC'yi sınır bölgesi olarak anlatıyor. Bir üretici M51 için 50 HRC'ye kadar kullanım belirtiyor.
- **Öneri:** Böyle kalsın.
- **Kim:** ürün sorumlusu. **Kayıtlar:** ms.hardness-limit-bimetal, ms.family-overview, ms.hardness-speed-correction. Eski kimlik: od.bimetal-hardness-limit.

### OD-25 · Kesitteki en fazla diş, demet kesim ve yumuşak malzeme kuralları
- Kesitteki en fazla diş için kaynaklar 10–14 / 24 / 17–28 / ahşapta 6–8 diyor.
- **Öneri:**
  - Üst sınır için sayı vermeyin; "talaş diş boşluğuna sığmalı" ölçütünü kullanın.
  - Demet kesimde iki hesap yapın ve seyrek olana yakın satılan dişi seçin.
  - Yumuşak malzemede "1–2 kademe seyrek" deyin.
- **Kim:** ürün sorumlusu. Eski kimlikler: od.teeth-in-cut-max, od.wood-teeth-in-cut-max, od.bundle-tpi-rule, od.soft-material-steps.

### OD-28 · Ahşap teknik kuralları
- Açık konular:
  - Kasnak–kalınlık: D/1000 kuralı mı, makine üreticisi tablosu mu?
  - Kıvrım yarıçapı tablosu.
  - Bıçak hızı: atölye makinesinde yaklaşık 900 m/dk sınırı.
  - Elle esneme miktarı: kaynaklara göre 1–6 mm.
  - Makine–boy referans listeleri çelişiyor.
- **Öneri:**
  - Temkinli kural ve makine kılavuzu esas alınsın.
  - Esneme için sayı yerine titreşim testi anlatılsın.
- **Kim:** ürün sorumlusu. **Kayıtlar:** nm.wood-* (thickness, radius, speed, tension), nm.*-machine-lengths. Eski kimlikler: od.wood-thickness-rule, od.wood-radius-table, od.wood-band-speed, od.wood-tension-deflection, od.reference-length-charts.

### OD-34 · Toptan ve kurumsal koşullar
- Vade, çek, cari hesap, bayilik, proforma ve toplu teklif kanalı tanımlı değil.
- **Öneri:** Kısa bir B2B politikası yazın.
- **Kim:** sahip. **Kayıtlar:** cs.bulk-corporate, cs.qty-discount. Kaynak: qg NOTES §6-6.

### OD-35 · Desteklenmeyen malzemeler listesi
- Taş, cam, beton, ekmek ve kâğıt gibi malzemelerde ne denecek? Deri, filtre ve kauçuk gibi sınır vakalarda ne denecek?
- **Öneri:** "Bu malzeme için ürünümüz yok" listesi hazırlayın; sınır vakalarda "Sünger-Tekstil uygun olabilir, bize yazın" deyin.
- **Kim:** sahip ve ürün sorumlusu. Kaynak: qg NOTES §6-7.

### OD-37 · Danışman motorunun malzeme aileleri ve ayrıştırıcısı
- Açık konular:
  - Bakır alaşımları ve nikel/titanyum hangi aileye gidecek?
  - Plastik kategorisi nasıl işaretlenecek?
  - "Krom mil" yazana ne sorulacak?
  - 6082 / 4140 gibi çıplak sayılar boy sanılıyor.
  - Çoklu malzeme algılama, eski grup kimlikleri, dubleks sertliği (270 HB).
  - Normalizer'da "kütük" ahşaba yönleniyordu; birleştirilmiş glossary_patterns'te dolu malzemeye taşındı.
- **Öneri:** materials/NOTES'taki önerileri uygulayın.
- **Kim:** geliştirici. Eski kimlikler: od.copper-family, od.niti-family, od.plastic-category, od.krom-mil, od.bare-number, od.multi-detect, od.legacy-ids, od.duplex-hardness.

### OD-38 · "Hardox" marka adı metinlerde kullanılsın mı?
- Müşteriler bu adla arıyor. Hardox bir bıçak değil, malzeme markası.
- **Öneri:** "400 HBW sınıfı aşınma plakası (ör. Hardox 400)" biçimi kullanılsın.
- **Kim:** sahip. **Kayıt:** ms.hardox. Eski kimlik: od.wear-brand.
