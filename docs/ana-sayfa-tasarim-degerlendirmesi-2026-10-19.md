# Ana sayfa tasarım değerlendirmesi

> Sonraki uygulama ve güncel önizleme: [Ana sayfa tasarım uygulaması](ana-sayfa-tasarim-uygulamasi-2026-10-19.md). Yerel bağlantı sorununun nedeni 9000 portunda başka projenin backend'inin çalışması olarak doğrulandı; bu projenin API anahtarı doğrudur. Aşağıdaki metin uygulama öncesi inceleme kaydıdır.

19 Ekim 2026. Kullanıcının isteğiyle canlı yayın iptal edildi; sunucuya, üretim veritabanına veya uzak Git deposuna değişiklik gönderilmedi. Ürünlerin ve görsellerin doğruluğu kullanıcı tarafından teyit edildi; öneriler bunların sunumu ve alışveriş akışıyla ilgilidir.

**Tasarım için görüşüm: 78/100.** Bu öznel tasarım değerlendirmesidir; önceki 83/100 genel e-ticaret hazırlık puanından farklıdır.

İnceleme güncel kaynak kodu ve 14 Ekim tarihli yerel üretim HTML önbelleğinin masaüstü/mobil gösterimi üzerinden yapıldı. Canlı site görünümü doğrulanmadı. Güncel yerel frontend, yerel backend'in reddettiği publishable API anahtarı nedeniyle açılamadı; bu durum canlı sitede aynı hata bulunduğunu göstermez. Önizleme JavaScript/API çağrıları kapatılarak üretildi; eski HTML, son işlevsel değişiklikleri ve canlı ürün sıralamasını kanıtlamaz. Lazy yüklenen veya arşivde karşılığı bulunmayan görseller, görsel/ürün eksiği olarak değerlendirilmedi.

## Güçlü taraflar

- Turuncu vurgu, koyu zemin ve çelik tonları sektörle uyumlu bir kimlik oluşturuyor.
- Masaüstünde büyük başlık, ürün görseli ve ana buton belirgin; arama alanı kolay bulunuyor.
- Hazır boy ve özel ölçü ürünlerin ayrı sunulması mağazanın iki farklı satın alma ihtiyacına uyuyor.
- Teknik rehberler ve kullanım alanı kategorileri mevcut; bunları daha görünür konumlandırmak mümkün.

## Öncelikli iyileştirmeler

| Öncelik | Gözlem | Öneri |
|---|---|---|
| 1 | Mobilde karşılama bölümü çok uzun. 390 px genişlikteki arşiv önizlemesinde bölüm yaklaşık 1098 px; katalog sayfanın 1163. pikselinden başlıyor. | Başlığı ve açıklamayı kısaltmak, mevcut görselin mobil çerçevesini küçültmek, dikey boşlukları azaltmak. İlk ekranda ürün seçimine giden yollar görünür olmalı. |
| 1 | Mobilde slider okları ikinci “Ürünleri İncele” butonunun alanına biniyor. | Kontrolleri görselin altındaki ayrı satıra taşımak; otomatik geçiş için duraklatma ve odak/klavye desteği sağlamak. |
| 1 | Mağaza adı küçük ekranda gizleniyor; yalnızca çekiç simgesi kalıyor. | Mobilde okunabilir küçük TESTERESTORE kelime logosu korumak. |
| 1 | Ürün seçmeye yardımcı kullanım alanları katalog ve iki ürün şeridinden sonra geliyor. | “Ne keseceksiniz?” alanını karşılama bölümünün hemen altına taşımak: metal, ahşap, et/kemik, sünger/tekstil ve karbür seçenekleri. |
| 2 | “Premium Standartlar”, “Hemen Yapılandır”, “Parametrik Sipariş” dili, ilk kez gelen ziyaretçiye yapacağı işlemi yeterince açık anlatmıyor. | “İşinize uygun şerit testereyi bulun”; ana buton “Ölçüye göre fiyat al”, ikinci buton “Hazır boyları gör”. Teknik terimleri ürün detayında korumak. |
| 2 | Katalog, hazır boy ve öne çıkanlar benzer görselleri tekrarlıyor; bütün bölümler benzer görsel ağırlık taşıyor. | Kategori seçimini öne almak; ana sayfada az sayıda seçilmiş ürünü göstermek; devamını kategori/listelere bırakmak. “Öne çıkanlar” ile “Hazır boylar”ın amacını belirginleştirmek. |
| 2 | Kartlarda küçük açıklamalar ve ağırlıklı “İncele” çağrısı var. | Aynı görselleri ortak çerçeve/ölçekte sunmak; ürün adının altında 2–3 gerçek teknik özellik göstermek. Hazır üründe fiyat/stok, özel ölçüde “Ölçü seç / Fiyatı hesapla” eylemi. |
| 3 | Çok sayıda parıltı, degrade, gölge ve “premium” vurgusu var. | Turuncuyu ana eylemler ve seçili durumlarda yoğunlaştırmak; kart ve bölüm zeminlerini sadeleştirmek. |
| 3 | Güncel kodda açık tema katalog başlığı için çok açık degrade renkleri bulunuyor. Arşiv önizlemesindeki eski başlık ise okunaklı. | Güncel açık/koyu temada başlık ve küçük metin kontrastını ayrıca kontrol etmek; açık tema için koyu metin kullanmak. Bu bulgu canlı görselde doğrulanmış sayılmaz. |

## Önerilen bölüm sırası

1. Marka, görünür arama ve kısa menü.
2. Kompakt karşılama: net fayda + özel ölçü / hazır boy için iki alışveriş yolu.
3. Kullanım alanına göre kategori seçimi.
4. Seçilmiş ürün aileleri; gerçek teknik bilgilerle karşılaştırılabilir kartlar.
5. Stoktan hazır boy ürünler.
6. “Boy, genişlik ve diş adımını nasıl seçerim?” teknik yardım/rehber alanı.
7. Doğrulanmış hizmet bilgileri, iletişim ve footer.

İlk uygulama paketi olarak mobil karşılama, slider kontrolleri, mobil marka görünürlüğü ve kategori bölümünün yukarı alınması önerilir. Ürün/görsel değişimi gerektirmez. Tasarım dosyaları bu incelemede değiştirilmedi.

## Görsel dayanaklar

- [14 Ekim önbelleği — masaüstü koyu tema](preview/homepage-cache-2026-10-14-desktop-dark-viewport.png)
- [14 Ekim önbelleği — mobil koyu tema](preview/homepage-cache-2026-10-14-mobile-dark-viewport.png)
- [14 Ekim önbelleği — masaüstü tam sayfa](preview/homepage-cache-2026-10-14-desktop-dark-full.png)
- [14 Ekim önbelleği — masaüstü açık tema](preview/homepage-cache-2026-10-14-desktop-light-viewport.png)
