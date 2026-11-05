# Testere Store — ödeme dışı e-ticaret incelemesi

Tarih: 19 Ekim 2026.

Sonraki uygulama ve yeni puan için: [iyileştirme raporu](e-ticaret-iyilestirme-2026-10-19.md). Aşağıdaki bulgular ilk inceleme anının kaydıdır.

İnceleme, yerel Next.js mağaza kodu, Medusa backend, dağıtım dosyaları ve mevcut testler üzerinden yapıldı. Ödeme sağlayıcısı, kart işlemleri ve ödeme entegrasyonu değerlendirme kapsamı dışında tutuldu. Uygulama kodu değiştirilmedi; yalnızca bu rapor eklendi.

Canlı mağazada tarayıcı testi, gerçek sipariş, e-posta teslimat testi veya performans ölçümü yapılmadı. Aşağıdaki kod bulguları, canlı ortamda ölçülmüş hata oranları anlamına gelmez. Veritabanındaki ürünler ve canlı ortam ayarları incelenmedi.

**Ana değerlendirme:** Mağazada önemli bir özellik temeli var. Öncelik, doğru ölçünün sepete gitmesini sağlamak, stok ve kargo durumlarını tutarlı hale getirmek, müşteri taleplerini kaybetmemek ve mevcut özelliklerin yarım kalan akışlarını tamamlamak olmalı.

## Mevcut olan özellikler

Özel boy/ölçü konfigüratörü, hazır boy ürünler, arama önerileri, kategori ve bazı teknik filtreler, favoriler, son görüntülenen ürünler, çapraz satış, teknik doküman alanı, ürün yorumları/moderasyonu, blog ve rehberler, üyelik, adres defteri, sipariş detayı, sipariş iptali, tekrar sipariş, kargo takip alanı, puan hesabı, bülten, terk edilen sepet görevi ve teknik danışman kodda mevcut.

SEO metadata, ürün yapılandırılmış verisi, sitemap, robots, görsel optimizasyonu, hata ekranları, Sentry yapılandırma dosyaları, Redis, kalıcı dosya depolama, hız sınırlama ve ana Docker Compose dosyasında yedekleme servisi de bulunuyor. Bunların varlığı, canlı ortamda eksiksiz çalıştıkları anlamına gelmiyor; ancak bunları sıfırdan eksik saymak doğru olmaz.

## İlk düzeltilmesi gerekenler

### 1. Özel ölçü değişince önceki ölçü sepete gidebilir

- **Kanıt:** [BladeConfigurator.tsx](../testerestore/app/components/BladeConfigurator.tsx), satır 357–393, 547–600 ve 1067.
- **Durum:** Yeni ölçü hesaplanırken önceki `matrixCalc` saklanıyor. Ekleme butonu `calcLoading` ile engellenmiyor. Sepete gönderilen ölçüler mevcut alanlardan değil, hesaplama sonucundan alınıyor. Başlamış eski hesaplamanın geç dönmesine karşı yanıt sıralaması kontrolü de yok.
- **Etki:** Müşteri örneğin boyu 3000 mm'den 3500 mm'ye değiştirip hemen eklerse önceki ölçü eklenebilir. Bu, özel üretimde yanlış ürün hazırlanmasına neden olabilir.
- **Öneri:** Hesaplanan sonuç güncel seçimle eşleşene kadar eklemeyi kapatmak, eski istek sonuçlarını elemek ve ekleme sürerken ikinci tıklamayı engellemek.
- **Kabul ölçütü:** Yavaş bağlantıda hızlı ölçü değişimi, ters sırada dönen hesaplamalar ve çift tıklama senaryolarında sepette yalnızca son onaylı ölçü/adet bulunmalı.

### 2. Hazır ürün stok ve teslimat gösterimi gerçek veriye bağlı değil

- **Kanıt:** [ReadyMadeBuyBox.tsx](../testerestore/app/components/ReadyMadeBuyBox.tsx), satır 113–119 ve 208; [ürün SEO'su](../testerestore/lib/medusa/seo.ts), satır 164.
- **Durum:** Panel sabit olarak “Stokta” gösteriyor; stok sıfır olsa bile “0 adet · aynı gün kargo” yazabilir. Buton yalnızca işlem durumu ve fiyatla engelleniyor. Yapılandırılmış veride de hazır ürünün stok durumu sabit `InStock`.
- **Etki:** Müşteri ve arama motoru yanlış stok/teslimat beklentisi edinir. Bu bulgu backend stok denetiminin aşılabildiği anlamına gelmez.
- **Öneri:** Stok, ön sipariş izni, seçilen adet, çalışma günü ve kargo kesim saatini ortak kuralla değerlendirmek; arayüz ve JSON-LD'yi aynı veriden üretmek.
- **Kabul ölçütü:** Stok sıfır, stoktan fazla adet, hafta sonu ve kargo kesim saati sonrası senaryolarında doğru durum gösterilmeli.

### 3. Şirket ve iletişim bilgilerinde örnek değerler kalmış

- **Kanıt:** [company-info.ts](../testerestore/lib/company-info.ts), satır 7–20; [iletişim sayfası](../testerestore/app/iletisim/page.tsx), satır 29; [WhatsAppButton.tsx](../testerestore/app/components/WhatsAppButton.tsx), satır 14.
- **Durum:** Vergi numarası `1234567890`, MERSİS sıfırlardan oluşuyor. Şirket dosyasındaki telefon ile iletişim sayfasındaki `+90 (212) 000 00 00` farklı. WhatsApp numarası ayarlanmamışsa örnek numaraya düşüyor.
- **Öneri:** Gerçek unvan/adres/iletişim/vergi bilgilerini doğrulayıp bütün sayfaları aynı kaynaktan beslemek; gerçek numara yoksa iletişim kanalını yayımlamamak.
- **Kabul ölçütü:** İletişim sayfası, footer, yasal metinler, e-postalar ve yapılandırılmış veride aynı doğrulanmış şirket bilgileri kullanılmalı.

### 4. Kargoya verildi bilgisi gerçek sipariş durumundan ayrışabiliyor

- **Kanıt:** [kargo widget'ı](../medusa-backend/apps/backend/src/admin/widgets/order-cargo-tracking.tsx), satır 68–98; [sipariş detayı](../testerestore/app/hesabim/siparis/[id]/page.tsx), satır 160, 263 ve 292; [iptal uç noktası](../medusa-backend/apps/backend/src/api/store/orders/[id]/cancel/route.ts), satır 62.
- **Durum:** Özel widget takip bilgisi ve `shipped_at` değerini metadata'ya yazıyor, bildirim gönderiyor. Medusa'nın gerçek fulfillment/shipment kaydı bu işlemde güncellenmiyor. Müşteri ekranı metadata'yı, iptal uygunluğu gerçek fulfillment durumunu dikkate alıyor.
- **Etki:** Operasyonda yalnızca bu widget kullanılırsa gönderildi görünen siparişte iptal hâlâ açık kalabilir.
- **Öneri:** Kargo kaydını gerçek Medusa gönderim iş akışına bağlamak; kalem bazında kısmi gönderim ve teslim edildi durumunu da aynı kaynaktan üretmek.

### 5. Sepet güncelleme hataları müşteriye açıkça gösterilmiyor

- **Kanıt:** [sepet servisi](../testerestore/lib/medusa/services/cart.ts), satır 217, 251 ve 275; [CartContext.tsx](../testerestore/app/context/CartContext.tsx), satır 329, 350 ve 364.
- **Durum:** Adet/silme işleminde arayüz önce yerel değişiklik yapıyor; servis hataları `null` olabiliyor. Sonraki yenileme değişikliği sessizce geri alabilir veya o da başarısızsa görünüm sunucudan kopabilir.
- **Öneri:** Satır bazında işlem durumu, başarısızlıkta geri alma, açık hata ve tekrar deneme; hızlı ardışık değişikliklerde sıralama kontrolü.
- **Kabul ölçütü:** Bağlantı kesintisinde adet ve ürün silme sonucu yanıltıcı biçimde başarılı görünmemeli.

### 6. İletişim ve teklif talebi e-posta arızasında kaybolabilir

- **Kanıt:** [iletişim uç noktası](../medusa-backend/apps/backend/src/api/store/contact/route.ts), satır 38–41, 72 ve 80.
- **Durum:** Talep kalıcı bir iş kaydına dönüştürülmüyor; log'a mesajın ilk 500 karakteri yazılıyor ve e-posta deneniyor. Bildirim hatasında da başarı dönüyor.
- **Öneri:** Önce mesajı tam olarak veritabanına kaydetmek, talep numarası vermek; admin panelinde gelen kutusu, sorumlu, durum ve e-posta yeniden denemesi sağlamak.
- **Kabul ölçütü:** E-posta servisi kapalıyken dahi talep eksiksiz görülebilmeli ve müşteriye verilen numarayla bulunabilmeli.

## Mevcut özelliklerde tamamlanması gerekenler

| Konu | Kodda görülen eksik | Öneri ve kanıt |
|---|---|---|
| Müşteri iade/değişim akışı | Sipariş iptali var; müşterinin kalem seçerek iade talebi açması ve izlemesi görünmüyor. Yasal metin hesap sayfasından iade talebi vaat ediyor. | Ürün/adet/sebep, gerekiyorsa fotoğraf, talep numarası ve durum takibi. Medusa admin iade kabiliyeti ile müşteri ekranı ayrılmalı. [Yasal metin](../testerestore/lib/legal-content.ts):285; [sipariş ekranı](../testerestore/app/hesabim/siparis/[id]/page.tsx):214. |
| Puan programı | Puan kazanımı ve TL karşılığı var; kullanım/kupona dönüşüm ve iptal/iade ters hareketi görünmüyor. Kazanım `order.placed` anında. | Bekleyen/kullanılabilir puan, açık kazanım kuralları, kupona dönüşüm ve iptal/iade düzeltmesi. [Subscriber](../medusa-backend/apps/backend/src/subscribers/loyalty-credit.ts):47; [servis](../medusa-backend/apps/backend/src/modules/loyalty/service.ts):29; [müşteri vaadi](../testerestore/app/hesabim/puanlarim/page.tsx):182. |
| Puan kayıtlarının tutarlılığı | Tekrar kontrolü listele-sonra-yaz; bakiye ve hareket ayrı işlemlerde yazılıyor. İlgili benzersizlik kısıtları migration'da görünmüyor. | Atomik işlem ve veritabanı benzersizliğiyle aynı olayın iki kez yazılmasını ve eşzamanlı bakiye kaybını önlemek. [Servis](../medusa-backend/apps/backend/src/modules/loyalty/service.ts):34–52. |
| Arama ve katalog kapsamı | Arama ilk 50, kategori ilk 100 sonuçla sınırlı. Hazır boy servisi ilk 100 genel ürünü çekip sonradan ayırıyor. | Sunucuda filtreleme ve sayfalama; toplam sonuç sayısı. [Arama](../testerestore/app/arama/page.tsx):28; [kategori](../testerestore/app/kategori/[slug]/page.tsx):50; [servis](../testerestore/lib/medusa/services/products.ts):187. |
| Sipariş geçmişi | İlk 20 sipariş yükleniyor; devamına erişim görünmüyor. | Sayfalama ve tarih/durum filtresi. [Auth servisi](../testerestore/lib/medusa/services/auth.ts):204; [hesap ekranı](../testerestore/app/hesabim/page.tsx):383. |
| Hata ve boş sonuç ayrımı | Bazı ürün/sipariş servisleri API hatasını boş diziye çeviriyor. | “Kayıt yok” ile “şu anda yüklenemiyor” ayrı olmalı. [Ürün servisi](../testerestore/lib/medusa/services/products.ts):72; [auth servisi](../testerestore/lib/medusa/services/auth.ts):214. |
| Favoriler | Sadece tarayıcıda tutuluyor; müşteri hesabı ve cihazlar arasında taşınmıyor, yalnızca ürün handle'ı kaydediliyor. | Girişte misafir listesini hesapla birleştirmek; bu mağazada tam bıçak ölçüsünü de kaydetmek. [wishlist.ts](../testerestore/lib/wishlist.ts):2–9. |
| Adres defteri | Ekleme/silme var; düzenleme ve varsayılan adres seçimi arayüzde yok. | Mevcut adres güncelleme servisini ekrana bağlamak; il/ilçe doğrulaması ve görünür hata mesajı. [Hesap](../testerestore/app/hesabim/page.tsx):272–345; [servis](../testerestore/lib/medusa/services/auth.ts):124. |
| Yorumların satın alma doğrulaması | Yeni yorumlarda `is_verified_purchase` koşulsuz false; admin elle değiştirebiliyor. | Müşteri ve ürün siparişini sunucuda eşleştirmek. [Yorum uç noktası](../medusa-backend/apps/backend/src/api/store/products/[id]/reviews/route.ts):90. |
| Bülten yaşam döngüsü | Yeni adres doğrudan onaylı kaydediliyor; pasif abonelik form gönderimiyle aktif oluyor. Kullanıcıya açık abonelikten çıkış akışı bulunamadı. | E-posta doğrulaması, güvenli çıkış bağlantısı, izin/tercih kaydı ve açık yeniden abonelik. [Abonelik uç noktası](../medusa-backend/apps/backend/src/api/store/newsletter/subscribe/route.ts):41–47. |
| Alışveriş analitiği | GA/GTM/Meta altyapısı ve `trackEvent` var; uygulama akışlarında bu yardımcıya çağrı bulunmadı. Harici GTM hesabı incelenmedi. | Ürün görüntüleme, arama, filtre, ölçü hesaplama, sepete ekleme/silme ve teklif talebini ürün/adet/değer bilgisiyle ölçmek. [Analytics.tsx](../testerestore/app/components/Analytics.tsx):125. |
| Çerez tercihleri | İlk kabul/ret var; siteden tekrar açılan tercih paneli yok. Analitik ve pazarlama birlikte kabul ediliyor. | Footer'dan açılan kategori bazlı tercihler; izin geri alındığında etkin takip araçlarını da güncellemek. [CookieBanner.tsx](../testerestore/app/components/CookieBanner.tsx):19, 34–54; [Analytics.tsx](../testerestore/app/components/Analytics.tsx):37. |
| Sitemap kapsamı | Ürün sorgusu 200 kayıtla sınırlı; sayfalama yok. | Tüm ürünleri kapsayan sayfalama veya bölünmüş sitemap. Backend kesintisinde eksik sitemap yayımlamak yerine son başarılı veri/uygun hata stratejisi. [Ürün servisi](../testerestore/lib/medusa/services/products.ts):82–90; [sitemap](../testerestore/app/sitemap.ts):42. |
| Terk edilen sepetin geri yüklenmesi | Hatırlatma altyapısı var; e-posta sadece `/cart` bağlantısı veriyor. Farklı cihazda aynı sepet geri yüklenmeyebilir. | Müşteriye özel, süreli ve güvenli sepet kurtarma bağlantısı; farklı cihazda kabul testi. [Bildirim servisi](../medusa-backend/apps/backend/src/modules/notification-resend/service.ts):352, 368. |
| Erişilebilir etkileşimler | Hazır ürün önerisi modalında dialog semantiği, odak yönetimi ve Escape davranışı bileşen içinde bulunmuyor; arama önerilerinde klavye seçimi eksik. | Açılan pencereye odak taşıma, kapanınca geri verme, uygun odak sınırı; aramada combobox ilişkileri ve yukarı/aşağı tuşları. [Modal](../testerestore/app/components/ReadyMadeSuggestionPopup.tsx):31–40; [arama](../testerestore/app/components/SearchBox.tsx):129, 180. |

Çerez tercih tasarımı, KVKK'nın kategori bazlı tercihler ve aktif onayla ilgili açıklamalarıyla birlikte değerlendirilmelidir. Bu rapor, tüm çerezlerin aynı hukuki temele tabi olduğunu varsaymaz. [KVKK 2023/1645 karar özeti](https://www.kvkk.gov.tr/Icerik/7765/2023-1645).

## Yasal metin ve operasyonun eşleştirilmesi

[legal-content.ts](../testerestore/lib/legal-content.ts) satır 254 ve 287'de iade kargosu genel olarak alıcıya yükleniyor. Ticaret Bakanlığının 17 Ağustos 2026 tarihli açıklamasına göre ön bilgilendirmede belirtilen taşıyıcıyla yapılan iadelerde veya taşıyıcı belirtilmemişse açıklanan koşullarda tüketici iade masrafından sorumlu tutulamaz. Bu nedenle hazır ürün, özel üretim, cayma ve ayıplı ürün koşulları birbirinden ayrılarak metinler uzman kontrolünden geçirilmeli. Aynı dosyanın 285. satırındaki hesaptan iade talebi vaadi gerçek akışla eşleştirilmeli. [Ticaret Bakanlığı rehberi](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme).

Şirket ve tüketici satışlarının kapsamı ile özel ölçü ürün istisnalarının hangi ürünlere uygulanacağı ayrıca netleştirilmelidir. Hazır ürünleri otomatik olarak özel üretim istisnasına dahil etmemek gerekir.

## Canlı ortamda ayrıca doğrulanacaklar

Bunlar kesin olarak “yok” veya “çalışmıyor” bulguları değildir:

- **Bildirimler:** E-posta sağlayıcısı API anahtarı yokken `dry-run` sonucu döndürebiliyor. Production'da zorunlu ayar doğrulaması ve sipariş/kargo/şifre sıfırlama test e-postalarının teslimatı kontrol edilmeli. Şifre sıfırlama linki doğru canlı alan adına gitmeli. Kaynak: [notification-resend](../medusa-backend/apps/backend/src/modules/notification-resend/service.ts):49, 78; [password-reset](../medusa-backend/apps/backend/src/subscribers/password-reset.ts):38.
- **Yedekleme:** Ana [docker-compose.yml](../docker-compose.yml):241 içinde yedek servisi mevcut. Sunucu dışında kopya, yedek başarısızlık alarmı ve boş ortama geri yükleme tatbikatı doğrulanmalı. [Dokploy rehberinde](../deploy/DOKPLOY.md):152 bu işlemler anlatılıyor; canlıda uygulanmış oldukları incelenmedi.
- **Hata izleme:** Sentry dosyaları mevcut. Tarayıcı init bağlantısı kodda net görünmüyor; hem tarayıcı hem sunucu kontrollü test hatasının izleme paneline ulaştığı doğrulanmalı. `app/error.tsx` şu anda client hatasını konsola yazıyor.
- **Kargo/fulfillment:** Gerçek kargo sağlayıcısı, etiket oluşturma, teslim edildi olayları ve parçalı gönderim operasyonu canlıda doğrulanmalı.
- **Promosyon:** Bülten e-postasındaki `HOSGELDIN5` kodunun admin'de manuel açılması bekleniyor. Canlı kampanyanın gerçekten mevcut, geçerli ve doğru koşullara bağlı olduğu kontrol edilmeli.
- **Terk edilen sepet görevi:** Sepet sorgusu ürün ilişkisini açıkça istemiyor, ancak ürün yoksa kayıt atlanıyor. Kurulu Medusa'nın gerçek yanıtı ile görevin doğru sepetleri seçtiği ve hatırlatmayı bir kez gönderdiği doğrulanmalı.
- **Mobil performans:** Ölçülmedi. Gerçek kullanıcıların 75. yüzdeliğinde hedefler LCP ≤ 2,5 sn, INP ≤ 200 ms, CLS ≤ 0,1 olmalı; mobil ve masaüstü ayrı takip edilmeli. [Google Web Vitals](https://web.dev/articles/vitals).
- **Google ürün görünürlüğü:** Hazır ürünlerin gerçek fiyat/stok/görsel ve teslimat/iade verileri tutarlı hale geldikten sonra Rich Results Test ve Search Console ile kontrol edilmeli. Merchant Center akışı ayrıca değerlendirilebilir. [Google ürün yapılandırılmış verisi](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing).

## Mağazaya özel geliştirme önerileri

Bu bölüm kanıtlanmış hata listesi değil, iş geliştirme önerisidir. Maliyetli özellikler müşteri ihtiyacı ve kullanım verisiyle önceliklendirilmelidir.

1. **“Makinelerim” ve kayıtlı ölçüler:** Müşteri makine marka/modelini, onaylı bıçak ölçüsünü ve kesilen malzemeyi hesabında saklasın. Mevcut danışman ve tekrar sipariş özelliği bu profile bağlansın. Uyum bilgisinin kaynağı gösterilsin; belirsiz eşleşme kesin uyumluluk gibi sunulmasın.
2. **Teknik ürün karşılaştırması:** M42/M51/karbür ürünleri uygun malzeme, kesim kesiti, genişlik, kalınlık, TPI, kullanım amacı, hazırlama süresi ve aynı ölçüdeki fiyat üzerinden karşılaştır. Dayanağı olmayan ömür veya performans yüzdeleri kullanma.
3. **Yönlendirmeli seçim:** Mevcut filtre ve danışmana “Ne keseceksiniz? Hangi makine? Hangi kesit?” girişi ekle. Profesyonel kullanıcı için doğrudan ölçü girişi de erişilebilir kalsın. Aramada `27x0.9`, `27×0,9`, `3500 mm` ve Türkçe karakter varyasyonları değerlendirilsin.
4. **Kurumsal teklif akışı:** İletişim formundaki teklif talebini ürün/ölçü/adet içeren kayıtlı bir teklife dönüştür. PDF teklif, geçerlilik tarihi, miktar indirimi, müşteri fiyat grubu ve onay süreci satış hacmi gerektiriyorsa eklenebilir.
5. **Ürün sayfasında karar için gerekli bilgi:** Gerçek ürün/diş/kaynak fotoğrafları, teknik tablo, uygun kullanım, teknik doküman, stok veya üretim süresi ve KDV dahil/haric tutarın açık gösterimi aynı sayfada bir araya gelsin. Mevcut doküman alanının içerik kalitesi ürün bazında doğrulansın.
6. **Satış sonrası merkez:** İade/değişim talebi, teknik destek kaydı, varsa gerçek fatura belgesine erişim, kargo geçmişi ve yeniden sipariş aynı sipariş detayından ulaşılabilir olsun. Fatura bilgisi formu ile gerçek e-fatura entegrasyonu aynı şey değildir.
7. **Tekrar alışverişi kolaylaştırma:** Ölçüsü kaydedilmiş favoriler, müşterinin talep ettiği stok bildirimi, tekliften sepete geçiş ve onaylı iletişim tercihleriyle yenileme hatırlatmaları sunulabilir.
8. **Mobil kullanım ve erişilebilirlik:** Küçük ekranda teknik ölçü girişini, klavye kullanımını, hata mesajlarını ve üst üste gelen yardım/çerez/öneri pencerelerini gerçek cihazlarda test et. WCAG 2.2 AA kabul ölçütlerinden yararlan. [W3C WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

Arama altyapısını değiştirirken sürüm uyumluluğu gözetilmeli: depodaki backend paketleri Medusa 2.15.3. Güncel belgelerdeki yeni Search Module 2.21.1+ için anlatılıyor; bunu mevcut projeye doğrudan takılabilir varsaymak doğru olmaz. Önce mevcut listeleme/sayfalama hataları düzeltilmeli, sonra ihtiyaç varsa sürüm yükseltme ve arama motoru değerlendirilmelidir. [Medusa sürüm uyarısı](https://docs.medusajs.com/resources/integrations/guides/algolia).

## Uygulama sırası ve doğrulama

1. **Doğruluk ve güven:** Ölçü hesaplama yarışı, stok/teslimat gösterimi, şirket bilgileri, kargo durum birliği, sepet hata yönetimi ve iletişim kayıtları.
2. **Eksik müşteri akışları:** İade/değişim, puan kuralları, bülten çıkışı, çerez tercihleri, adres düzenleme, favori senkronizasyonu ve sayfalama.
3. **Ölçüm ve büyüme:** Analitik olayları, ürün SEO'su, gerçek mobil ölçümler, makine profili, teknik karşılaştırma ve teklif yönetimi.

Ödeme dışındaki temel kabul senaryoları: ölçü değiştirerek sepete ekleme; düşük stok; sepet adet/silme sırasında bağlantı kesintisi; 100/200 üzeri ürün; 20 üzeri sipariş; kullanıcılar arasında favori ayrımı; adres düzenleme; gönderilen siparişin iptal uygunluğu; iade talebi; bildirim arızasında destek kaydı; bülten çıkışı; çerez tercihini geri alma; klavyeyle ürün seçimi.

Çalıştırılan teknik kontroller:

- Storefront `tsc --noEmit --incremental false`: başarılı.
- Storefront `npm run lint`: başarılı çıkış, **0 hata / 26 uyarı**. Bu sayı tüm storefront lint sonucudur; ödeme ile ilgili bulgular bu rapora alınmadı. Uyarılar otomatik olarak 26 işlevsel hata anlamına gelmez.
- Mevcut [Playwright testleri](../testerestore/tests/e2e/smoke.spec.ts) ağırlıkla sayfa açılışı, boş sepet ve SEO dosyalarının erişilebilirliğini denetliyor. Ölçü doğruluğu, ürün ekleme, adet güncelleme, müşteri/iade/kargo akışlarının tamamını korumuyor.
- Uçtan uca testler ve production build bu incelemede çalıştırılmadı. Canlı çalışma, güvenlik ve performans için tam uygunluk onayı verilmedi.
