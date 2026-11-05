# Danışman ve site bilgi güncellemesi

**Tarih:** 26 Ekim 2026
**Durum:** Kod GitHub'a gönderildi (`main`, commit `3bec1b5`). **Canlıya çıkması için Dokploy'da "Deploy" gerekiyor.**
**Doğrulama:**
- Danışman testleri: 152/152 geçti.
- Altın test seti: yerelde gerçek modelle 71/71 geçti, kesin kural ihlali yok.
- Site (storefront): tip denetimi, ESLint ve tam build temiz.

---

## 1. Kısaca ne değişti?

| Alan | Önce | Şimdi |
|---|---|---|
| Dolu malzemede diş adımı (TPI) | Sohbet ürün sayfasından 2–4 kademe ince öneriyordu (40 mm mil → 10/14) | Ürün sayfasıyla aynı Starrett tablosu. Öneri, o bıçakta gerçekten satılan dişlere oturuyor (40 mm + 27×0,9 → 5/8) |
| "Sen kimsin / insan mısın / canlı destek" | Çıkmaz ("kesin bir ürün kodu üretemedim") | "TestereStore'un yapay zekâ asistanıyım, insan değilim" diyor. İnsan isteyene İletişim sayfası ve WhatsApp yolunu gösteriyor |
| "Ne keseceksiniz?" sorusuna "Emin değilim" | Çıkmaz | Örneklerle parçayı tarif etmesini istiyor, seçenekler yeniden çıkıyor |
| Bıçak boyu, rodaj, gerginlik, soğutma soruları | Ankete dönüyordu | Doğrudan cevap veriyor ve ilgili rehbere bağlantı veriyor |
| St37, C45, 1.4301, 6082, GG25 gibi kaliteler | Model tahmin ediyordu | Tablodan doğru metal grubunu buluyor ve bunu bir kez söylüyor |
| Arıza teşhisi | 12 belirti | 18 belirti |
| Makine eşleştirme | "Kesmak 250" gibi yazımlarda tek tahmin; "Bimak" tanınmıyordu | Belirsizse adaylar bıçak ölçüsüne göre gruplanıp soruluyor; marka takma adları tanınıyor |
| Sitedeki rehberler | 5 rehber, 10 SSS | 11 rehber (5'i düzeltildi, 6'sı yeni), 18 SSS |

---

## 2. Danışmanda yapılanlar

### 2.1 Dolu malzeme diş adımı (kritik düzeltme)
Sorun şuydu: sohbet, dolu malzemenin çapını 5 kaba aralığa bölüyordu. Bu aralıklar Starrett tablosundan 2–4 kademe ince diş veriyordu; ürün sayfası ise doğru tabloyu kullanıyordu. Aynı müşteri iki yerde iki farklı cevap alıyordu.

Yapılanlar:
- **Çap aralıkları Starrett'e göre yenilendi:**

  | Çap | Diş adımı |
  |---|---|
  | 25 mm altı | 10/14 |
  | 25–50 mm | 6/10 |
  | 50–100 mm | 4/6 |
  | 100–200 mm | 2/3 |
  | 200 mm üstü | 1,4/2 |

- **Müşterinin yazdığı gerçek çap kullanılıyor.** "40 mm mil", "Ø40", "çapı 40" ya da çap sorusuna yalnızca "40" yazılması yeterli. Bu sayı ürün sayfasındaki seçim kuralıyla birebir değerlendiriliyor.
- **Satılan dişe oturtma.** Önerilen diş o bıçak ölçüsünde fiyat listemizde yoksa, satılan en yakın dişe çekiliyor. Örneğin 27×0,9'da 6/10 olmadığı için 5/8 öneriliyor. Böylece müşteriye sipariş edemeyeceği bir ürün kodu verilmiyor.
- Makine henüz bilinmiyorsa, ailenin satılan dişleri arasından seçiliyor. Hiç satmadığımız 6/9 gibi bir değer söylenmiyor.
- İdeal diş ile satılan diş arasında fark büyükse kartta açık bir not çıkıyor. Örnek: "Çizelgeye göre ideal diş adımı 1,4/1,8 TPI; 27×0,9 mm bıçakta satılan en yakın seçenek 2/3 TPI."
- Ürün kodu ve kesme hızı yeni dişe göre yeniden hesaplanıyor.
- Ürün kodunda ve kartta "27.0" yerine "27", diş adımında "1,4/2" yazıyor.

Uçtan uca denendi:
- 40 mm karbon çelik mil + Kesmak KMY 280 → **5/8**, kod `27-0.90-5/8-3660`.
- Aynısı paslanmazla → M51, **5/8**.

### 2.2 Yeni hazır cevaplar (yapay zekâya sormadan, anında)
- **Kimlik / canlı destek:** "Ben TestereStore'un yapay zekâ asistanıyım; insan değilim…" Yetkili isteyene İletişim sayfası ve WhatsApp yolu gösteriliyor. "Makinemi temsilci bayiden aldım" gibi cümleler yanlışlıkla bu cevabı tetiklemiyor.
- **Bıçak boyu:** Üç yol anlatılıyor: etiket/kılavuz, eski bıçağı ölçmek ve L = 2 × C + π × D formülü. Müşteri kasnak çapını ve merkezler arası mesafeyi yazarsa hesap yapılıyor (ör. 350 ve 1200 → ≈ 3.500 mm). Ölçüye göre kaynaklanan bıçak iade edilemediği için sonucu doğrulaması öneriliyor.
- **Rodaj, gerginlik, soğutma:** Tarafsız, sayı vermeyen özet cevap; "makine/bıçak kılavuzu esas" vurgusu ve ilgili rehbere bağlantı. Kaynaklar bu konularda farklı sayılar verdiği için sayılar yalnızca rehberde, kaynaklarıyla birlikte duruyor.
- **Malzeme kaliteleri:** 16 grup tanınıyor:
  - yapı çelikleri
  - C45
  - otomat çeliği
  - 42CrMo4 gibi alaşımlı çelikler
  - sementasyon, yay ve rulman çelikleri
  - takım çelikleri
  - 304/316, martenzitik ve dubleks paslanmazlar
  - alüminyum alaşımları
  - döküm
  - pirinç ve bronz
  - titanyum ve Inconel

  "St37 nedir?" sorusuna doğrudan cevap veriliyor. "C45 mil kesiyorum" denince metal grubu otomatik geliyor ve "hangi metal?" diye tekrar sorulmuyor. Tablo, yapay zekânın yanlış tahminini düzeltiyor.
- **Fiyat karışıklığı giderildi:** "Gergi ne kadar olmalı?" gibi sorulardaki "ne kadar" artık fiyat sorusu sanılmıyor.

### 2.3 Arıza tablosu: 12 → 18 belirti
Yeni belirtiler:
- kesim yüzeyi pürüzlü
- bıçak kasnaktan çıkıyor
- talaş dişe yapışıyor
- aşırı ısınma / mavi talaş
- bıçak kesimde duruyor / makine zorlanıyor
- bıçak sırtında çatlak

Nedenler en olasıdan başlayarak sıralanıyor (Starrett / LENOX sorun giderme tablolarındaki genel nedenler).

### 2.4 Makine veritabanı (arka planda bir ajan yaptı)
- **Marka takma adları:** Beka-Mak, Kesmak, Karmetal, Uzay, DG Metal, Dispa ve Avrupa markalarının farklı yazımları tanınıyor.
  - "Bimak" yazılınca "büyük olasılıkla Beka-Mak" deniyor ve adaylar soruluyor.
  - Bilerek eklenmeyenler: "Mega Makina", "Çağlayan", "Mastercut". Aynı firma oldukları doğrulanamadı.
- **"Marka + sayı" yazımları:** Tek bir tahmin yapılmıyor. Bulunan tüm modeller aynı bıçağı kullanıyorsa sonuç kesin veriliyor. Değilse adaylar bıçak ölçüsüne göre gruplanıp soruluyor (Kesmak 250, Bimak 270 gibi). Yanlış bıçak siparişinin önüne geçiyor.
- **Ölçü sayıları model sanılmıyor:** "300 mm boru" artık Kesmak KLE 300'e eşleşmiyor.
- **Yanlış marka eşleşmesi düzeltildi:** "BS 300 PLUS" daha önce başka markanın makinesini veriyordu; artık doğru makine (IMET) bulunuyor.
- **Veri:**
  - DISPA M-Y 270 eklendi (3120×27×0,9, kaynaktan teyitli).
  - 9 kayda kaynak bağlantısı ve doğrulama bilgisi eklendi.
  - 3 kopya kayıt ve sahte bir "TEST" kaydı silindi. Toplam 4.513 makine.

### 2.5 Altın test seti: 54 → 71 vaka
Yeni vakalar:
- 40, 80, 150 ve 15 mm dolu malzeme diş adımları
- canlı destek ve "bot musun"
- "Emin değilim"
- bıçak boyu ve hesap, rodaj, gerginlik, soğutma
- St37 ve 1.4301
- 3 yeni arıza belirtisi

Yerelde 71/71 geçti. Yanıt süresi: hazır cevaplar 0,1 sn civarı; yapay zekâ gerektiren adımlar 2–4 sn (p95 4,1 sn).

---

## 3. Sitede yapılanlar (arka planda bir ajan yaptı)

### 3.1 Düzeltilen 5 rehber
- **TPI seçimi:**
  - 50 mm cevabı yanlıştı; Starrett'e göre düzeltildi (5/8 dengeli başlangıç).
  - Kaynaksız "ideal 6–24 diş" ifadesi kaldırıldı.
  - Sabit diş tablosu, boru/profil örnekleri ve demet kesim bölümü eklendi.
- **M42 mi M51 mi:**
  - "Fiyat/performans en iyi" ifadesi ve döküm hakkındaki abartı kaldırıldı.
  - Sertlik sınırları eklendi.
- **Bıçak boyu:**
  - Farklı çaplı ve üç kasnaklı makine formülleri eklendi.
  - Genişlik ve kalınlık ölçümü anlatıldı.
- **Kırılma nedenleri:**
  - "Koşulsuz ayıplı ürün" hükmü "incelenir, ayıplıysa yasal haklar çerçevesinde" olarak değiştirildi.
  - Kırık yüzeyi teşhis tablosu eklendi.
- **Rodaj ve bakım:** Kaynakların farklı görüşleri tarafsız biçimde birlikte verildi.

### 3.2 Yeni 6 rehber
1. Şerit testere arızaları ve çözümleri (18 belirti)
2. Gerginlik, bant hızı ve soğutma sıvısı (bor yağı) ayarı; talaş rengine göre ayar tablosu
3. Çelik kalite eşdeğerleri ve malzemeye göre bıçak seçimi
4. Ahşap şerit testere seçimi
5. Et ve kemik şerit testere seçimi
6. Sünger ve köpük kesim bıçağı seçimi

Rehberler:
- yalnızca bizim ürünlerimize ve hazır boy sayfasına bağlantı veriyor;
- teslim süresi vaadi ya da üstünlük iddiası içermiyor;
- site haritasına, llms.txt dosyasına ve kategori sayfalarına otomatik olarak bağlandı.

### 3.3 SSS: 10 → 18 soru
Yeni sorular:
- etiket yokken boy hesabı
- genişlik ve kalınlık ölçümü
- M42 ile M51 farkı
- sertleştirilmiş mil ve Hardox
- rodaj
- kaynak yerinden kopma
- eğri kesim
- gerginlik ve bor yağı oranı

Hazır boy / özel boy cevabına cayma hakkı bilgisi eklendi. Google için FAQPage verisi 18 soruyla üretiliyor.

### 3.4 Kapsam dışı küçük düzeltme
M42 kategori sayfasındaki "profil ve boruda 5/8 veya 6/10" ipucu Starrett boru tablosuyla çelişiyordu. "İnce cidarda (2 mm) çoğu ölçüde 10/14 veya daha sık" olarak düzeltildi.

---

## 4. Sizin karar vermeniz gerekenler

Bu konularda kaynaklar birbirinden ayrılıyor. Sitede şimdilik tarafsız aralık ve "kılavuz esas" notuyla duruyorlar; danışman bu konularda sayı vermiyor.

1. **Rodajda hız:**
   - LENOX ve Starrett hızı normal tutuyor; WIKUS ve RÖNTGEN %70–75'e düşürüyor.
   - İlerleme azaltma oranı kaynağa göre %20 ile %75 arasında değişiyor.
2. **Gerginlik:** Alman üreticiler 250–300 N/mm² öneriyor. ABD'deki yaygın uygulama yaklaşık 170–210 N/mm².
3. **Bor yağı oranı:** Türkiye'deki atölyeler %4–5 kullanıyor; RÖNTGEN %8–12, paslanmaz ve takım çeliğinde %15 üstü öneriyor.
4. **Donuk et diş adımı:** Bazı kaynaklar donuk/kemikli ete 3, taze ete 4 TPI diyor; bir Türk satıcı bunun tersini söylüyor.
5. **Hardox 400–450:** Rehberde "sınır bölgesi: düzenli kesimde karbür, ara sıra kısa kesimde M51 denenebilir" yazdı. Onayınız gerekiyor.
6. **Rehberlerde kaynak adları:** LENOX, Starrett, WIKUS ve RÖNTGEN yalnızca tablo altlarında "kaynak" olarak geçiyor; ürün önerisi yok. İsterseniz "bıçak üreticilerinin teknik kılavuzları" gibi genel bir ifadeye çevrilebilir.
7. **Makine veritabanındaki 3 çelişki** (veriye dokunulmadı; danışman bu makinelerde "eski bıçaktaki ölçüyü teyit edin" uyarısı veriyor):
   - Karmetal KMT 280 OSA: kayıtta 3360, bir bayi ilanında 3850.
   - Uzay UMSY-O 330: iki farklı ölçüyle kayıtlı.
   - KASTO BBS 1860/1560: model adı 2,0 mm kalınlığa işaret ediyor, kayıtta 1,6 yazıyor.

### Dokunulmayan metinler (önceki talimatınız: "şimdilik bir şey kaldırma")
- Footer'da her sayfada şu ifadeler görünüyor:
  - "Kaynaklı bıçaklar 24 saat içinde kargoya verilir"
  - "Alman ve İsveç menşeili"
  - "Kaynak yerinden kırılmalarda koşulsuz değişim garantisi"

  "Koşulsuz garanti" ifadesi, rehberdeki "yasal haklar çerçevesinde" ifadesiyle çelişiyor.
- Bazı yedek/seed ürün metinlerinde "5 kat daha uzun ömür", "rakipsiz" ve "kusursuz kaynak garantisi" geçiyor. Canlıdaki ürün metinleri de bir gözden geçirilmeli.

---

## 5. Sıradaki adımlar
1. **Siz:** Dokploy'da danışman ve storefront servislerini **Deploy** edin ("Reload" değil).
2. **Ben (deploy sonrası):** Canlıda 71 vakalık altın seti çalıştırırım ve yeni rehber sayfalarını kontrol ederim.
3. Sonra Faz 1:
   - akışlı (yazarken görünen) cevap ve hız iyileştirmesi
   - sohbette ürün kartları
   - WhatsApp'a devir
   - kalıcı oturum
   - daha ucuz model denemesi
