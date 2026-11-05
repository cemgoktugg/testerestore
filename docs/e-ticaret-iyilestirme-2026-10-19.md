# Testere Store — uygulanan iyileştirmeler ve yeni değerlendirme

19 Ekim 2026. Kapsam: önceki incelemedeki, işletmeye özel bilgi veya dış hizmet erişimi gerektirmeyen ödeme dışı düzeltmeler. Değişiklikler yerel proje dosyalarına uygulandı. Canlıya yayın ve üretim veritabanına migration yapılmadı.

**Yeni değerlendirmem: 83/100; önceki değerlendirme: 68/100.** Bu, aşağıdaki kod ve yerel test bulgularına dayanan öznel hazırlık değerlendirmesidir; Lighthouse puanı, canlı mağaza performans ölçümü veya güvenlik sertifikası değildir. Ödeme her iki değerlendirmede de kapsam dışındadır.

| Alan | Yeni puan | Değerlendirme |
|---|---:|---|
| Ürün, ölçü, stok ve sepet doğruluğu | 23/25 | Eski hesaplama, fazla adet, çift tıklama ve başarısız sepet değişikliği korumaları eklendi. Gerçek stok rezervasyonu ve çok kullanıcılı yük testi henüz yok. |
| Katalog, arama ve mobil kullanım | 18/20 | Sayfalama, alt kategoriler, klavye kullanımı ve hata/tekrar deneme düzeltildi. Büyük katalogda tüm kayıtları belleğe alan yollar için ileride sunucu filtreleri gerekiyor. |
| Hesap ve satış sonrası akışlar | 17/20 | Favori senkronizasyonu, adres düzenleme, talepler ve puan kullanımı tamamlandı. Gerçek müşteri/veritabanı ile bütünleşik kabul testi yapılmalı. |
| SEO, ölçüm ve tercihler | 12/15 | Ürün sitemap kapsamı, stok JSON-LD, olaylar ve kategori bazlı izinler düzeltildi. Search Console ve gerçek analitik hesabı doğrulaması yapılmadı. |
| İşletme ve yayına hazırlık | 13/20 | Kalıcı talep kaydı, gerçek gönderim akışı ve izleme bağlantıları iyileştirildi. Şirket bilgileri, yasal/operasyonel içerik, migration, servis teslimatı ve yedek geri yükleme doğrulaması bekliyor. |
| **Toplam** | **83/100** | **Yerel kodun ödeme dışı değerlendirmesi.** |

## Uygulananlar

| Önceki bulgu | Yapılan değişiklik | Kapsam / sınır |
|---|---|---|
| Ölçü değişirken eski fiyat/ölçü kullanılabiliyordu | Hesaplama güncel seçimle eşleşmeden sepete ekleme kapatılıyor; eski yanıtlar eleniyor; ekleme sırasında ikinci işlem engelleniyor. | Özel ölçü konfigüratörü. |
| Stok ve SEO her zaman “stokta” diyebiliyordu | Ürün paneli, kartlar ve JSON-LD aynı stok kuralını kullanıyor; sıfır/bilinmeyen stok, ön sipariş ve adet sınırı ayrılıyor. | Gerçekçi olmayan aynı gün kargo ifadesi ilgili ürün bileşenlerinden çıkarıldı; işletmenin tüm teslimat vaatleri doğrulanmış sayılmaz. |
| Sepet hataları sessizdi | Mutasyonlar sıraya alındı; başarısız işlemler geri alınıyor/yeniden okunuyor; hata ve bekleme görünür; geçici ağ hatası sepet kimliğini silmiyor. | Kupon ekleme/kaldırma hataları da açıklanıyor. Ödeme dosyaları değişmedi. |
| Ürün listeleri ilk 100/200 kayıtta kesiliyordu | Ürün ve kategoriler sayfalanıyor; arama/katalog/hazır listelerinde sayfa gezinmesi var; alt ve çoklu kategori eşleşmeleri düzeltildi. | Liste verisi sadeleştirildi. Hazır ürünlerin tüm katalogdan filtrelenmesi çok büyük katalogda ayrıca optimize edilmeli. |
| “Kayıt yok” ile bağlantı hatası karışıyordu | Arama ve siparişlerde hata durumu/yeniden deneme, eski yanıtı eleme eklendi. | Değiştirilen müşteri akışlarında. |
| Sipariş geçmişinin devamına erişilemiyordu | 10 kayıtlık sayfalama ve toplam kayıt bilgisi eklendi. | Tarih/durum filtreleri ayrı geliştirme olarak kaldı. |
| Favoriler sadece tarayıcıdaydı | Hesaba bağlı kayıt, misafir listesini birleştirme, çevrimdışı değişiklikleri tekrar deneme ve hesaplar arasında veri ayrımı eklendi. | Favori hâlâ ürün düzeyinde; tam bıçak konfigürasyonu/makine profili kaydı eklenmedi. |
| Adres düzenleme/varsayılan seçim yoktu | Adres güncelleme, varsayılan adres ve işlem geri bildirimleri eklendi. | Harici il/ilçe/adres doğrulama servisi eklenmedi. |
| İletişim/teklif mesajı e-posta hatasında kaybolabiliyordu | Kalıcı müşteri talebi, talep numarası, tekrar gönderim koruması ve admin gelen kutusu/durum/not alanları eklendi. | Tam bir ürün kalemli teklif/PDF/fiyat onay sistemi değildir. |
| Müşteri iade/değişim talebi yoktu | Müşteriye ait sipariş, kalem ve adet kontrolüyle talep açma/durum görme eklendi. | Başvuru oluşturur; otomatik kabul, kargo etiketi veya para iadesi yapmaz. |
| Kargo metadata ile gönderilmiş gösteriliyordu | Admin gönderim işlemi gerçek Medusa shipment workflow'una bağlandı; hazırlık/gönderim bulunan siparişin yanlış iptali engellendi. | Taşıyıcı etiketi ve teslim edildi entegrasyonu canlıda doğrulanmalı. |
| Satın alma rozeti elle atanabiliyordu | Oturumdaki müşteri ve gerçek sipariş kalemleri sunucuda eşleştiriliyor. | Gerçek sipariş veritabanıyla smoke testi bekliyor. |
| Puan yazmaları atomik değildi | Müşteri bazlı transaction kilidi, benzersiz hareket anahtarları ve tekrar olay koruması eklendi. | PostgreSQL üzerinde gerçek eşzamanlılık testi yapılmadı. |
| Puan kazanımı/kullanımı yarımdı | Kazanım sipariş tamamlanmasına taşındı; iptal/iade ters hareketleri ve müşteriye özel tek kullanımlık kupona dönüşüm eklendi. | Mevcut kazanım/TRY oranları korundu. Başarısız kupon aktivasyonu aynı işlemden sürdürülebilir. Harcanmış puanın geri alınması eksi bakiye oluşturabilir; kullanıcıya açıklanır. |
| Bülten doğrudan onaylı sayılıyordu | Açık izin, e-posta doğrulaması, imzalı çıkış ve izin tarihleri eklendi; doğrulanmamış indirim kodu vaadi kaldırıldı. | Linki açmak tek başına aboneliği değiştirmez; kullanıcı düğmeye basar. Token fragment'tan alınır ve URL temizlenir. |
| Çerez kabul/ret sonradan değiştirilemiyordu | Analitik/pazarlama ayrı seçilir; footer'dan tercihler açılır; geri almada araçları durdurmak için sayfa yenilenir. | Eski genel kabul yeniden tercih ister; eski ret korunur. Harici GTM konteynerinin içeriği denetlenmedi. |
| Analitik yardımcıları akışlara bağlı değildi | Ürün görüntüleme, arama ve başarılı sepet ekleme/çıkarma olayları bağlandı; izin tekrar kontrol edilir. | Filtre, ölçü hesabı ve teklif dönüşümü gibi diğer olaylar eklenmedi. Token içeren işlem sayfalarında takip araçları yüklenmez. |
| Sitemap ilk 200 üründeydi | Tüm ürün sayfaları okunur; ürün API hatasında boşalmış başarılı sitemap yayımlanmaz. | Blog listeleme/sitemap kapsamı bu değişikliğin dışında. |
| Sepet e-postası yalnızca /cart'a gidiyordu | 48 saatlik imzalı kurtarma bağlantısı, hesap sahipliği kontrolü ve açık geri yükleme adımı eklendi. Hatırlatma yalnızca doğrulanmış aktif abonelere gönderilir. | Müşteri e-postasını bırakmış olmak pazarlama izni sayılmaz. Gerçek e-posta teslimatı test edilmedi. |
| Klavye/odak kullanımı eksikti | Arama combobox tuşları, öneri penceresinde dialog/odak/Escape davranışı eklendi. | Tam WCAG denetimi değildir. |
| Örnek iletişim numaraları görünüyordu | Yapılandırılmamış WhatsApp gizlenir; bilinen örnek telefon müşteri iletişiminden ve JSON-LD'den çıkarılır; iletişim sayfası merkezî bilgi kaynağını kullanır. | Gerçek unvan, vergi, MERSİS, adres ve yasal metinler kullanıcı bilgisi bekliyor. |
| Tarayıcı hata izleme bağlantısı eksikti | Sentry istemci giriş dosyası ve hata ekranı bildirimleri bağlandı; replay kapalı, tanımlayıcı istek alanları temizleniyor. | Gerçek Sentry teslimatı/alarmları doğrulanmadı. |
| E-posta servisi eksikken başarı dönebiliyordu | Üretimde yapılandırılmamış gönderim hata verir; kritik subscriber'lar yeniden deneme için hatayı korur. | Gerçek e-posta hesabı ve teslimat kontrolü gerekli. |

## Doğrulama

- Storefront birim testleri: **35/35 geçti**. Stok, fiyat yanıtı, sepet hata yönetimi, katalog kapsamı, hesap/favori ayrımı, izinler, imzalı kurtarma ve puan tekrar/concurrency senaryolarını kapsar. Puan concurrency testleri servis taklitleri kullanır; gerçek veritabanı kilit testi değildir.
- Backend birim testleri: **13/13 geçti**; 4 test grubu. İzin token'ı, talep/sahiplik/adet kontrolleri ve satın alma doğrulaması.
- Tarayıcı testleri: **26 farklı senaryo/cihaz birleşimi geçti**. İlk tam koşu 22/22; son bülten değişikliği sonrası 4 yeni bülten testi ve 2 çerez tekrar testi 6/6 geçti. Masaüstü Chrome ve Pixel 5 emülasyonu kullanıldı.
- Storefront ve backend TypeScript: **başarılı**.
- Storefront ESLint: **0 hata / 32 uyarı**. Uyarıların önemli kısmı effect içinde durum güncelleme desenleri; tamamı giderilmiş sayılmıyor. Ödeme alanındaki mevcut dosyalar da genel lint taramasına girdi, değiştirilmedi.
- Son storefront üretim derlemesi: **başarılı**, `next build --webpack`; 250 sayfa üretildi. Backend Medusa dağıtım derlemesi/gerçek DB başlangıcı yapılmadı.
- `git diff --check`: **başarılı**.

Tarayıcı testleri gerçek üretim API'si yerine 205 ürünlü yerel Medusa yanıt taklidini kullanır. Sipariş, sepet ve hesap arızaları kontrollü olarak taklit edilir; gerçek e-posta, kargo, ödeme veya müşteri işlemi oluşturulmaz. Test/derleme ortamında Google Fonts indirmesi yerel font taklidiyle değiştirilmiştir; üretim font yapılandırması değiştirilmemiştir. Bu sandbox'ta Windows test sunucularının otomatik kapanması beklemede kaldığından, testler bittikten sonra yalnız bu çalışmanın sunucu süreçleri kapatıldı; her iki doğrulama koşusu başarılı çıkış koduyla tamamlandı.

## Bilgi veya canlı erişim gerektirdiği için kalanlar

- Gerçek şirket unvanı, adres, vergi/MERSİS, telefon/WhatsApp ve doğrulanmış iletişim bilgileri.
- Hazır/özel üretim ürün politikaları, garanti/kaynak garantisi, kargo hazırlama süreleri, iade koşulları ve bunlara uygun yasal metinler. Mevcut footer/yasal içerikteki işletme vaatleri otomatik doğrulanmadı.
- Gerçek taşıyıcı/etiket/teslimat, e-posta teslimatı, Sentry alarmı, Search Console, analitik mülkleri ve harici GTM etiketleri.
- Üretim veritabanında yeni migration'lar, eski puan hesaplarının uzlaştırılması gerekiyorsa gerçek kayıtlarla inceleme, çok kullanıcılı puan/stok ve yük testleri.
- Canlı mobil Core Web Vitals, dış ortam yedek geri yükleme tatbikatı ve tam erişilebilirlik/güvenlik incelemesi.
- Önceki rapordaki “Makinelerim”, teknik karşılaştırma, tam konfigürasyonlu favori, PDF teklif, stok bildirimi ve gerçek fatura entegrasyonu iş geliştirme önerileriydi; bu düzeltme paketine eklenmedi. Ürün/makine verisi, operasyon ve kapsam kararı gerektiriyor.

Yeni özelliklerin yayında çalışması için backend ve storefront birlikte yayınlanmalı, **üç yeni migration uygulanmalı**. İşlem sırası ve kontroller: [yayınlama notu](e-ticaret-yayinlama-2026-10-19.md). Eski inceleme tarihsel bulguları korur: [ilk rapor](e-ticaret-inceleme-2026-10-19.md).
