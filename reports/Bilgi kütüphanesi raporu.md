# Bilgi kütüphanesi raporu

**Tarih:** 27 Ekim 2026
**Durum:** GitHub'a gönderildi (`main`, commit `bd00215`). **Canlıya çıkması için Dokploy'da danışman (advisor) servisini "Deploy" edin.** Site (storefront) tarafında bu turda değişiklik yok.

---

## 1. Kısaca

Danışmanın bildiği her şey artık tek bir **bilgi kütüphanesinde** toplanıyor. Kayıtlar kaynaklı ve denetlenmiş; müşteriye yalnızca bu onaylı metinler gidiyor.

| | Önce | Şimdi |
|---|---|---|
| Bilgi nerede? | Kodun içine gömülü metinler, 18 arıza belirtisi, 16 malzeme grubu, yayınlanmamış eski ansiklopedi | **362 kayıt**, **1.355 kaynaklı olgu**, **233 malzeme kalitesi** (1.492 tanıma kalıbı), **45 arıza belirtisi**, **78 terimlik sözlük** |
| 700 gerçekçi müşteri mesajında yanlış cevap | 63 (%9) | **2** (biri ön masada, biri kütüphanede; ikisi de değerlendirmede bilerek "doğru" sayılmayan sınır durumlar) |
| Hazır ve onaylı metinle cevaplanan mesaj | %41 | **%72** (ön masa %59 + kütüphane %13) |
| Test seti | 71 vaka | **131 vaka**, gerçek modelle **131/131** |
| Danışman testleri | 152 | **418**, hepsi geçiyor |

---

## 2. Nasıl hazırlandı?

Yalnızca bu işle uğraşan **9 ajan** çalıştı.

**Altı alan ajanı** paralel çalıştı:

| Alan | Ne içeriyor |
|---|---|
| Ürünlerimiz ve mağaza | Ürün özellikleri, satılan ölçüler, fiyat mantığı, kargo, iade, ödeme, fatura, hesap ve sipariş işlemleri |
| Metal kesimde seçim | Malzeme ve sertliğe göre bıçak, TPI, diş tipi; üretici hız ve ilerleme tabloları; karbür ne zaman gerekir |
| Malzemeler | 233 kalite (EN, DIN, AISI, JIS eşdeğerleri), sertlik değerleri, plastik ve kompozitler |
| Metal dışı | Ahşap, et-kemik (gıda temas mevzuatı dahil), sünger-tekstil, plastik |
| Kullanım, bakım, arıza | Montaj, rodaj, gerginlik, soğutma sıvısı, saklama, iş güvenliği, 45 arıza belirtisi, kırık yüzeyine göre teşhis |
| Müşteri soru bankası | Gerçekçi Türkçe ifadelerle 700 mesaj, yazım hatalı ve gündelik dil dahil; terim sözlüğü |

Ardından iki ajan daha devreye girdi:
- **Doğrulama ajanı** (diğerlerinin çıktısını sorgulamak için):
  - Alanlar arası çelişkileri buldu.
  - Ağırlığı yüksek **90 olguyu asıl kaynağından yeniden kontrol etti**: 84 doğru, 3 yanlış (düzeltildi), 3 doğrulanamadı.
  - Yinelenen kayıtları birleştirdi (492 → 362).
  - Her cevabı kurallara göre gözden geçirdi.
- **Ön masa ajanı**, soru bankasının ortaya çıkardığı yanlış anlamaları düzeltti. En riskli örnekler:
  - "6082 alüminyum … 3505 mm" mesajında fiyat 6082 mm boya göre hesaplanıyordu.
  - "tavsiye et" ifadesindeki "et" yüzünden et-kemik bıçağı öneriliyordu.
  - "bıçağı nasıl değiştiririm" sorusuna iade metni veriliyordu.
  - "kesme hızı ne kadar" sorusu fiyat sorusu sanılıyordu.

**Tüm alanlara uygulanan kurallar (sizin kararlarınız):**
- yalnızca kendi ürünlerimiz önerilir;
- teslim süresi yazılmaz;
- garanti veya üstünlük iddiası yok;
- her sayının bir kaynağı var;
- kaynaklar çelişirse tek değer dayatılmaz, aralık verilir ve "makine/bıçak kılavuzu esas" denir;
- TPI için tek doğruluk ürün sayfasındaki Starrett tablosu;
- tedarikçi adı hiçbir yerde geçmez.

---

## 3. Danışman artık nasıl cevap veriyor?

1. **Ön masa** (hazır cevaplar, ~0,1 sn): kargo, iade, ödeme, fiyat, stok, arıza, kimlik, rodaj, gerginlik, soğutma, malzeme kalitesi.
2. **Bilgi kütüphanesi** (yeni, 1–2 sn):
   - Ön masanın bilmediği bir soru ya da istek gelirse arama en uygun 8 kaydı bulur.
   - Model yalnızca hangisinin soruyu gerçekten cevapladığını **seçer**; cevabı kendisi yazmaz.
   - Müşteriye kütüphanedeki onaylı metin gider, yanında ilgili rehber bağlantısı bulunur.
   - Kütüphane cevaplarında hakem değerlendirmesi: **%83 doğru, %15 kısmen doğru, %2 yanlış**.
3. **Bıçak seçimi hunisi:** kişiye özel seçim ("40 mm dolu paslanmaz için hangi bıçak?"), makine adı geçen mesajlar ve huni cevapları ("Var", "40 mm", "Kesmak KMY 280") eskisi gibi buraya gider.
   - Huni serbest bir soruyla karşılaşırsa model **yalnızca kütüphane kayıtlarına dayanarak** cevap yazar.
   - Kayıtlarda geçmeyen bir sayıyı içeren cümle müşteriye ulaşmaz.

**Deploy'dan sonra müşterinin fark edeceği örnekler:**
- **Bakım ve kullanım:**
  - "Yedek bıçakları nasıl saklamalıyım?" → saklama kuralları.
  - "Hatve ile TPI aynı mı?" → çevrim tablosu ve rehber.
- **Malzeme:**
  - "Inconel kesilir mi?" → hangi ürünümüz ve hangi koşullarla.
  - "1.2379 kesiyorum" → "takım çeliği" tanınır, huni metal türünü tekrar sormaz.
- **Sipariş ve ürün:**
  - "Siparişimi iptal etmek istiyorum" → kendi kendine iptal yolu ve İletişim.
  - "Starrett satıyor musunuz?" → başka marka satmadığımız; muadil için gereken bilgiler.

**Bu turda yaptığım güvenlik düzeltmeleri:**
- Danışman artık müşteriyi **WhatsApp'a yönlendirmiyor**. Sitedeki buton yer tutucu bir numaraya (wa.me/902125551020) gidiyor; müşteri kişisel bilgisini tanımadığı birine gönderebilirdi. Gerçek numara girilince yönlendirme yeniden açılabilir.
- Depo herkese açık olduğu için **iç denetim notları** (karar listeleri, "KVKK metni hatalı" gibi tespitler) yayın kopyasından ayıklandı. Tam sürüm yalnızca sizin bilgisayarınızda: `reports/bilgi-kutuphanesi-tam/`.
- Ölçüye göre fiyatta **ürüne özel boy sınırları** uygulanıyor: et-kemik en fazla 6.000 mm, ahşap 8.000 mm, karbür 12.000 mm. Danışman artık satılamayacak bir boya fiyat vermiyor.

---

## 4. Sizin karar vermeniz gerekenler

Tam liste ve kaynakları `reports/bilgi-kutuphanesi-tam/owner_decisions.md` dosyasında: 40 karar, öncelik sırasına göre. **P0, yani önce bakılması gerekenler (12):**

| # | Konu | Kim karar verir |
|---|---|---|
| OD-01 | Teslim süresi vaatleri birbirini tutmuyor: footer "24 saat", sepet "aynı gün", ön bilgilendirme formu ve sipariş e-postası "1–3 / 3–7 iş günü". Ölçüye göre ürün sayfasında da "aynı gün kargoda" rozeti var. | Siz |
| OD-02 | Cayma istisnasının madde atfı yanlış: md. 15 (ğ) yazıyor, doğrusu 15/1-(b). Kurumsal alıcıya uygulanıp uygulanmayacağı da belirsiz. | Avukat |
| OD-03 | İade metinleri yönetmelikle çelişiyor: "iade kargosu alıcıya ait", "10 iş günü", var olmayan "hesaptan iade talebi" özelliği, "7 gün içinde ayıp bildirimi". | Avukat |
| OD-05 | KVKK metni "yurt dışına aktarım yok" diyor, oysa sohbet mesajları yurt dışındaki yapay zekâ sağlayıcısına gidiyor. Bülten için İYS kaydı da eksik. | Avukat |
| OD-06 | İletişim bilgileri yer tutucu ve birbiriyle çelişiyor: iki farklı telefon, iki farklı e-posta, WhatsApp numarası. | Siz |
| OD-07 | Belgesiz iddialar: "koşulsuz değişim garantisi", "%80 diş ömrü", "Alman ve İsveç menşeili". | Siz |
| OD-08 | Fiyatlar tüketiciye KDV hariç gösteriliyor; hazır boy kartlarında KDV ibaresi bile yok. | Siz / avukat |
| OD-09 | Sadakat puanında "1 puan = 0,50 TL" yazıyor ama puan ödemede kullanılamıyor. | Siz |
| OD-11 | Ahşap, et ve sünger bıçağında diş ya da ağız tipi seçilemiyor, rehberler ise "seçebilirsiniz" diyor. Müşteriye hangisi gönderiliyor? | Siz / ürün sorumlusu |
| OD-13 | Fiyat hesaplama ucu (backend) hâlâ her ürüne 1.000–15.000 mm kabul ediyor. Danışman tarafı düzeltildi, sunucu tarafı düzeltilmeli. | Geliştirici (ben) |
| OD-14 | Et bıçağında paslanmaz zorunlu mu? Rehberdeki SSS cevabı gıda temas yönetmeliğiyle çelişiyor. | Avukat / gıda uzmanı |
| OD-16 | Canlı ödemede iyzico'ya sabit, sahte bir TC kimlik numarası (11111111111) ve sabit bir IP adresi gönderiliyor. | Siz + geliştirici |

**P1'den öne çıkanlar:**
- **Diş adımında danışman ile ürün sayfası farklı sonuç veriyor (OD-17).** Danışman boru ve profilde Starrett boru tablosunu kullanmıyor. Örnek: 40×40×2 profil için danışman 14/18, ürün sayfası 18 diyor. Bunu bir sonraki adımda düzeltebilirim.
- **En yaygın ölçülerde sık diş satılmıyor (OD-18).** 27×0,9 ve 34×1,1'de 10/14, 8/12, 6/10 yok, oysa tedarikçi kataloğunda var. Bu yüzden en yaygın makinelerde ince profil ve küçük çaplı dolu malzeme için uygun diş önerilemiyor. Matrise eklemeyi düşünün.
- **Fiyat matrisinde bir veri hatası var.** Canlı matrise yeni ölçüler eklenmiş (6×0,6, 6×0,9, 10×0,6). 10×0,6 satırında diş değeri tek alanda "6/10 , 8/12" olarak yazılmış; panelden iki ayrı diş olarak düzeltilmeli.
- **Ürün sayfalarındaki ölçü listeleri sipariş edilebilir ölçülerle uyuşmuyor (OD-12).** Örnek: M42 sayfası "6–41 mm" diyor.

---

## 5. Sıradaki adımlar
1. **Siz:** Dokploy'da danışman servisini Deploy edin.
2. **Ben (deploy sonrası):** Canlıda 131 vakalık test setini çalıştırırım.
3. **Siz:** P0 kararlarına bakın; avukat konularını (OD-02/03/05/14) toplu iletebilirsiniz.
4. **Teknik devam:**
   - danışmanda boru/profil için Starrett boru tablosu (OD-17);
   - backend boy sınırları (OD-13);
   - takip mesajlarının bağlamı ("peki 34'lük olsa");
   - Faz 1: akışlı cevap, ürün kartları, kalıcı oturum.

**Not:** Doğrulama ajanının indirdiği kaynak kopyaları `scratchpad/audit_tmp/` klasöründe duruyor. Bazılarında tedarikçi adı geçiyor. Klasör depoda değil, yalnızca bu bilgisayarın geçici klasöründe. Ajan silmek istedi ama izin verilmedi. Silinip silinmeyeceğine siz karar verin.
