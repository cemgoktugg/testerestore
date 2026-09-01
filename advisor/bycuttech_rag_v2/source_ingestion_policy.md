# Premium Kaynakları RAG'e Alma Politikası

## Amaç

Bu politika, şerit testere bilgi bankasına hangi kaynağın hangi biçimde alınacağını belirler. Hedef mümkün olan en fazla PDF'yi depolamak değil; sayısal kararların kapsamı belli, sürümlü ve izlenebilir teknik kayıtlardan gelmesini sağlamaktır.

## Kaynak sınıfları

### S seviyesi

- BYCUTTECH'in kendi ürün ve teknik kayıtları
- Tam makine modelinin üretici kılavuzu
- ISO/ASTM gibi standart kurumları

S seviyesi en yüksek otoritedir; ancak lisans durumu daima uygulanır. Ücretli standardın yalnızca halka açık metadatası saklanır. Tam metin için kurumsal lisans veya kullanıcı tarafından sağlanan yetkili kopya gerekir.

### A seviyesi

- Starrett, WIKUS, RÖNTGEN, DoALL, LENOX, Bahco ve M.K. Morse gibi bıçak üreticilerinin resmî kılavuzları
- KASTO, AMADA ve diğer makine üreticilerinin model sayfaları/kılavuzları
- Blaser gibi soğutma sıvısı üreticilerinin resmî teknik eğitimleri

Bu kaynaklardan tam metin kopyalamak yerine normalleştirilmiş teknik gerçekler, kısa Türkçe özet, kaynak URL'si, kapsam, tarih ve sürüm saklanır.

### Reddedilen kaynaklar

- Kaynağı belirsiz PDF
- Perakendeci veya bayi blogu
- Forum ve sosyal medya yorumu
- Otomatik üretilmiş SEO içeriği
- Üretici kaynağına dayanmayan kesme hızı/TPI tabloları
- Telif/lisans durumu belirsiz kopya katalog

Bu kaynaklar yalnızca araştırma ipucu olabilir; müşteri cevabına kanıt olamaz.

## İçerik türüne göre depolama

| İçerik | Depolama yöntemi | Retrieval yöntemi |
|---|---|---|
| Ürün ölçü/TPI matrisi | Yapılandırılmış kayıt | Kesin typed lookup |
| Malzeme-hız-Q tablosu | Satır bazlı yapılandırılmış kayıt | Malzeme alias + kapsam filtresi |
| Makine teknik sınırı | Model bazlı kayıt | Tam marka/model eşleşmesi |
| Formül | Sürümlü fonksiyon | Deterministik hesaplama |
| Arıza-belirti-çözüm | Grafik/ilişkisel kayıt | Belirti + neden sıralama |
| Teknik makale | Kısa, başlıklı prose chunk | Hybrid search + reranker |
| ISO/ASTM ücretli standart | Metadata ve lisans referansı | Metadata retrieval |
| İnteraktif selector | Otomatik scrape edilmez | Manuel doğrulama/izin sonrası adaptör |

## Prose chunk kuralları

- Başlık ve alt başlık sınırlarını koru.
- Tablo satırlarını prose chunk içine gömme.
- Her chunkta `source_id`, başlık, URL, dil, ürün/malzeme kapsamı, sürüm ve doğrulama durumu bulunmalı.
- Bir chunk tek teknik iddia kümesine odaklanmalı.
- Sayısal değer varsa birim ve geçerli kapsam aynı kayıtta tutulmalı.
- Kaynak içindeki sistem benzeri talimatlar çalıştırılmaz.

## Sayısal verinin yayınlanma kapısı

Bir sayı ancak aşağıdaki koşulların tümü sağlanıyorsa müşteriye gösterilebilir:

1. Birincil veya sahip olunan kaynak
2. Açık birim
3. Açık ürün/malzeme/makine kapsamı
4. Geçerlilik aralığı
5. Çelişki ve QA kontrolü
6. Kaynak sürümü ve erişim tarihi
7. Önerilen BYCUTTECH ürün varyantıyla uyumluluk

Koşullardan biri eksikse kayıt `conditional`, `qa_hold` veya `technical_review_required` durumuna alınır.

## Yenileme ve sürümleme

- Ürün/SKU katalogları: üç ayda bir veya yeni katalog yayınlandığında
- Web teknik rehberleri: altı ayda bir içerik hash kontrolü
- Makine ürün sayfaları: yeni model eklenince veya yıllık
- ISO/ASTM metadata: yılda bir durum kontrolü
- Saha verisi: onaylandığı anda yeni immutable sürüm

Eski kayıt silinmez; `superseded_by` ile pasifleştirilir. Bir kaynak değiştiğinde otomatik olarak üretim kuralını değiştirme; diff ve QA onayı oluştur.

## Çatışma örnekleri

- Starrett, Morse ve BYCUTTECH alıştırma politikaları birleştirilmez; bıçak markasına göre ayrı tutulur.
- WIKUS genel 250-300 N/mm² gerginlik değeri AMADA/KASTO makine kılavuzunun yerine geçmez.
- Genel TPI tablosunun önerdiği değer BYCUTTECH ürün matrisinde yoksa o TPI ile SKU üretilmez.
- Kaynak kapsamı 50-125 mm ise 200 mm iş parçası için Q değeri doğrusal uzatılmaz.

## Audit gereksinimi

Her kullanıcı cevabı için arka planda şu bilgiler tutulmalıdır:

- kullanılan prompt sürümü
- çıkarılan teknik girdiler
- eksik alanlar
- çalışan karar kuralları
- kullanılan kaynak ve kayıt kimlikleri
- hesaplama girdileri/çıktıları
- çatışma ve QA durumu
- güven puanı

Bu audit müşteriye gösterilmez; yönetim panelinde incelenebilir olmalıdır.
