# Çapraz tutarlılık denetimi (2026-10-27)

Kapsam: altı domain JSON'u (birleştirme öncesi ve sonrası), site kodu (`wt-lib-src@3bec1b5`) ve canlı fiyat ağacı.

İncelenen site kodu:
- `BladeSpecVisualizer.tsx`
- `lib/guides.ts` (11 rehber)
- `app/sss/page.tsx`
- `lib/legal-content.ts`
- `lib/shipping.ts`

İncelenen danışman kodu:
- `advisor/rules.json`
- `llm/front_desk.py`
- `llm/knowledge.py`
- `llm/tpi_refine.py`

Kullanılan canlı veri: `_inputs/live_price_tree.json` ve canlı `GET /store/blade-price/options`. TPI hesapları için `BladeSpecVisualizer` ve `tpi_refine` mantığının Python kopyası çalıştırıldı (`_work/tpi_port.py`).

Her başlıkta önce kaynakların söylediği değerler, sonra hangisinin doğru olduğu ya da sahip kararı (OD-xx, bkz. `owner_decisions.md`) ve birleşik kopyada ne yapıldığı var.

Kısaltmalar: cs = catalog_store, ms = metal_selection, mt = materials, nm = non_metal, uc = usage_care, qg = questions_glossary.

---

## En önemli 10 tutarsızlık (özet)

1. **İade masrafı ve iade süresi yönetmeliğe aykırı yazılmış (yasal metin ve cs cevapları).**
   - Site ve kütüphane "iade kargo ücreti alıcıya aittir" ve "ürün bize ulaştıktan sonra 10 iş günü" diyordu.
   - MSY md.12/3'e göre satıcının gösterdiği kargoyla iadede tüketiciden masraf istenemez.
   - md.12/1'e göre iade, cayma bildiriminden itibaren 14 gün içinde yapılır.
   - Cevaplar düzeltildi; yasal metin için avukat kararı gerekiyor → OD-03.
2. **Cayma istisnası madde atfı yanlış.** Yasal metinler ve iki kütüphane olgusu "md.15/ğ" diyor; doğrusu 15/1-(b). Hijyen istisnası 15/1-(ç) yalnız İade Politikası'nda geçiyor → OD-02.
3. **Danışman boy sınırları ürünlerden farklı.**
   - Sepet ürün bazında sınırlıyor: ahşap ≤8.000 mm, et-kemik ≤6.000 mm, karbür ≤12.000 mm.
   - `front_desk` ve `calculate` ucu her ürüne 1.000–15.000 mm uyguluyor; danışman sepetin reddedeceği boylara fiyat veriyor → OD-13.
4. **Diş adımında danışman ile ürün sayfası farklı sonuç veriyor.**
   - Boru ve profilde danışman yetkili `TUBE_TABLE`'ı kullanmıyor. 40×40×2 için danışman 14/18 → 5/8 diyor, ürün sayfası 18 → 8.
   - Satılan dişe oturtma kuralı farklı: Ø40 mm, 27×0,9 bıçakta ürün sayfası 8, danışman 5/8.
   - Kütüphane çizelgeye birebir uyuyor. "Danışman ve ürün sayfası aynı sonucu verir" iddiaları kaldırıldı → OD-17.
5. **Satılan ölçüler canlıda değişmiş.**
   - Canlı fiyat listesine 6×0,6, 6×0,9 ve 10×0,6 mm bi-metal satırları eklenmiş. 10×0,6'nın diş değeri hatalı tek dize: "6/10 , 8/12".
   - Kütüphane `_inputs` anlık görüntüsüne uyuyordu. "En dar bi-metal 13 mm" gibi ifadeler eskidi.
   - Ürün sayfası metinleri de matrisle uyuşmuyor (M42 "6–41 mm" vb.) → OD-12, OD-18.
6. **Karbür sertlik sınırı.**
   - Rehber, cs.carbide-what, mt.takim-celigi ve grades.json tek sayı veriyordu: "~65 HRC".
   - ms domaini ve kaynaklar 60 / 61 / 65 HRC diyor (geometriye bağlı).
   - Her yer "yaklaşık 60–65 HRC" olarak hizalandı; rehber düzeltmesi bekliyor → OD-15.
7. **Bi-metal bıçakla ahşap kesimi üç farklı şekilde anlatılıyordu.**
   - cs: "metal bıçağını ahşapta kullanmayın".
   - Rehber: "kaliteyi ve ömrü düşürür".
   - nm (kaynaklarla): "bi-metal ahşabı keser, çivili ahşapta avantajlı".
   - Tek kayıtta birleştirildi (cs.wood-metal-crossuse) → OD-40.
8. **Diş ve ağız seçimi vaadi.**
   - Sünger rehberi ve ürün metinleri "ağız tipini / dişi seçebilirsiniz" diyor; ahşap, et ve sünger ailelerinde sipariş ekranında bu seçim yok.
   - cs.textile-edge-choice ile rehber "hafızalı köpük → düz" derken nm, kaynaklarına göre "düz veya tırtıklı" diyordu → OD-11, OD-27.
9. **WhatsApp ve iletişim bilgileri yer tutucu.** `front_desk` ve iki cs cevabı müşteriyi yer tutucu bir WhatsApp numarasına yönlendiriyordu. Cevaplardan kaldırıldı; `front_desk` metinlerinde hâlâ duruyor → OD-06.
10. **Kompozitte karbür iddiası.**
    - mt.kompozit-ctp-karbon "Karbür Uçlu bıçağımız bu iş için adaydır" diyordu.
    - nm ve kompozit üreticileri tanecikli (grit) kenarlı bıçak öneriyor; böyle bir bıçağımız yok.
    - Ürün ve kategori metni de "aşındırıcı kompozit" diyor. Birleşik kayıtta iddia kaldırıldı → OD-15.

Diğer önemli bulgular:
- Rodaj alt sınırı yanlıştı: 150 cm² yazıyordu, doğrusu 100 cm² (OD-19).
- Bor yağı "%4–5" satırı (OD-21).
- `rules.json` "45° kesimde %140" diyor, doğrusu ~%41 (OD-24).
- Glossary kalıbında "kütük" ahşaba yönleniyordu (OD-37).
- Sünger sözlüğünde "strafor" geçiyordu; nm EPS için dişsiz bıçağı önermiyor (düzeltildi).

---

## 1. Bıçak gerginliği

| Kaynak | Değer |
|---|---|
| uc.tension-value (önce) | Alman üreticiler 250–300 N/mm²; "ABD'deki yaygın uygulama" 170–210 N/mm² (25–30 bin psi); 240 N/mm² (35 bin psi) üstüne çıkılmasın |
| uc olguları | tedarikçi genişlik tablosu 138–276 MPa; RÖNTGEN 300 N/mm² |
| Site rehberi ve SSS | uc ile aynı (250–300 / 170–210 / ≤240) |
| knowledge.py `tension_answer` | sayı yok, "makine/bıçak üreticisi değeri" |
| nm.wood-tension | ahşapta belirgin düşük gerginlik; elle esneme 4,8–6,4 mm @152 mm (Laguna) ile 1–2 mm (TR bayi) çelişiyor |

**Sonuç:** Değerler tutarlı.
- Denetimde 25–30 bin psi değerinin bir Avustralya bayisinden (AIMS) geldiği, yalnız 35 bin psi üst sınırının ABD kaynağından olduğu bulundu. Cevaptaki "ABD uygulaması" ifadesi "bazı bayi ve uygulama kaynakları" yapıldı. Rehber tablosu aynı düzeltmeyi beklemeli (OD-20, P2).
- Ahşap esneme sayısı tek kaynaktan veriliyordu; aralık ve titreşim testi olarak yazıldı (OD-28).

## 2. Rodaj (alıştırma)

| Kaynak | Hız | İlerleme | Miktar |
|---|---|---|---|
| uc (önce) | normal veya %70–75 | %20–75 | "300–500 cm²; kaynaklara göre 150 cm² – 15 dk"; karşılaştırma kaydında 150–650; "bi-metal bıçaklarımız için önerimiz: normal hız, yarı ilerleme, 300–500" |
| Site SSS ve rehber | normal veya %70–75 | ~yarı | **150–500 cm²** veya 15 dk |
| knowledge.py `run_in_answer` | normal | belirgin azalt | sayı yok |
| Tedarikçi | normal | ×0,5 | 300–500 cm² |
| WIKUS SSS | %75 | %50 | ~500 cm² / 15 dk; küçük kesitte **100–300 cm²** |
| LENOX | normal | %20–50 | "60–118 in² / 150–300 cm²" (kaynak kendi içinde tutarsız: 60 in² ≈ 387 cm²) |
| Starrett | normal | %50 (zor malzemede %75) | 50–100 in² ≈ 320–645 cm² |

- **Karbür:** Rehber "karbür uçlu bıçaklar da alıştırılmalıdır" diyor. uc'ye göre kaynaklar ayrışıyor: Morse fabrikada alıştırılmış sayıyor, WIKUS bi-metalle aynı yöntemi veriyor, tedarikçi 30 dk ve 30 m/dk + 5 mm/dk öneriyor.
- **Sonuç:** Alt sınır kaynaklarda 100 cm² (fact audit'te "yanlış" çıktı).
  - uc.breakin-how şimdi "yaklaşık 100–650 cm², birçok üreticide 300–500" diyor.
  - "Önerimiz" cümlesi sahip kararına kadar çıkarıldı.
  - Rehber ve SSS'deki 150 ile karbür cümlesi OD-19 ve OD-40'a bağlandı.

## 3. Soğutma sıvısı (bor yağı) oranı

| Kaynak | Değer |
|---|---|
| uc.coolant-concentration ve ms.coolant-concentration | "TR atölyelerde %4–5 yaygın" (kaynak: Kar-Tes blogu, B); RÖNTGEN %8–12, paslanmaz ve takım çeliğinde ≥%15 veya kesme yağı; tedarikçi rehberi ideal %10–12, <%7'ye inmeyin, ~%5'te etki yok |
| ms NOTES | "%4–5 kaynaksız" |
| uc NOTES | aynı değere Kar-Tes kaynağı gösteriliyor |
| Site rehberi ve SSS | %4–5 bir tablo satırı olarak; %8–12; %15+ |
| knowledge.py | sayı yok; "sıvı üreticisinin önerisi" |

**Sonuç:** İki domain birleştirildi (uc kanonik). %4–5 bir uygulama gözlemi olarak tutuldu, üreticilerin daha yüksek oran önerdiği ve %7 altında etkinin düştüğü cevaba yazıldı. Rehberdeki satırın yumuşatılması bekleniyor (OD-21).

## 4. Bant hızları ve ilerleme

| Malzeme | Kütüphane (ms; Starrett 50–125 mm tablosu ve diğerleri) | Site rehberi (LENOX, ~100 mm) | rules.json | Değerlendirme |
|---|---|---|---|---|
| Yapı çeliği (St37/St52, 1018) | 55–95 (tablolara göre 76–88 / 55–67 / 76–82 / 85–95) | 75–85 | (TPI'ya bağlı sabit hız) | Tutarlı; rehber aralığın ortasında |
| Orta karbon ve ıslah çeliği | 55–67 (tavlı başlangıç 55–70) | 60–70 | — | Tutarlı |
| Rulman çeliği (52100) | 40–49 / 40–50 | 50–55 | kuru kesim 40–55 | Küçük fark (LENOX 52100 = 49 m/dk; rehberin 50–55 yuvarlaması yukarıda) |
| Takım çeliği (tavlı) | D2 20–30, H13 40–45, O1 40–65 | 25–45 | — | Tutarlı |
| Östenitik paslanmaz | 304 30–37, 316 21–24 (cevapta 20–40) | 25–35 | — | Tutarlı |
| Ti / Ni alaşımları | Ni 15–25, Ti alaşım 14–20, saf Ti 20–27 | 18–25 | 10–30 m/dk **ve bıçak tipini karbüre zorluyor** | rules.json, kütüphanenin "ara sıra M51" önerisiyle çelişiyor (OD-24) |
| Alüminyum | 85–135 (Starrett 120–135, LENOX 84–104) | 85–105 | 80–120 | Kaynak farkı; aralık + "makinenin en yüksek kademesi sınırlar" (OD-22) |
| Dökme demir | 35–70 | 35–70 | — | Tutarlı |
| 316 kesme performansı | tablo 26–32, üreticinin kendi örneği 10–13 cm²/dk | — | — | Hücreler kaymış görünüyor; muhafazakâr 10–13 kullanıldı |

Ek düzeltmeler ve tutarlılıklar:
- **Sprey ve kuru kesim düzeltmesi:** −%15 ve −%30–50. Kütüphane, rehber ve uc aynı.
- **Ağırlık katsayısı:** `rules.json` hızı TPI'ya bağlıyor; ince dişte hızı düşürüyor. Bu, üreticilerin kesit düzeltmesinin tersi (OD-24).
- **ms.cutting-table-bimetal:** Alüminyum için tek kaynak değeri (120–135) yerine aralık yazıldı; "Alman bıçak üreticisi" ifadesi "bir bıçak üreticisi" yapıldı.
- **Tekrarlar:** ms.speed-overview, uc.speed-feed-usage ve qg.term-bant-hizi birleştirildi. ms.coolant-dry-correction, uc.coolant-dry-cutting'e taşındı.

## 5. TPI — dolu malzeme (yetkili tablo: `BladeSpecVisualizer.VARIABLE_SOLID` / `CONSTANT_SOLID`)

**Bantlar:** Kütüphane (ms.tpi-solid-table), site rehberi (bir alt küme) ve `tpi_refine.VARIABLE_SOLID` 18 bandın 18'inde aynı. Fact audit hücre hücre doğruladı.

**Örnekler:** Kütüphanedeki tüm örnekler port edilmiş `pickFromBands` ile hesaplandı.

| Örnek | Kütüphane | Tablo (birincil) | Sonuç |
|---|---|---|---|
| Ø10 | 10/14 | **12/16** | Düzeltildi (ms.tpi-solid-small) |
| Ø20 | 10/14 | 10/14 | ✓ |
| Ø25 | 8/12 | 8/12 | ✓ |
| Ø30 | 6/10 | 6/10 | ✓ |
| Ø40 | 6/10 civarı | 6/9 | ✓ |
| Ø50 | 5/8 | 5/8 | ✓ |
| Ø60 | 5/8 | 5/8 | ✓ |
| Ø70 | 5/8–3/4 | 5/7 | ✓ |
| Ø80 | 4/6 | 4/6 | ✓ |
| Ø100 | 3/4 | 3/4 | ✓ |
| Ø120 | 3/4 | 3/4 | ✓ |
| Ø150 | 2/3 | 2/3 | ✓ |
| Ø200 | 1,4/2 | 1,4/2 | ✓ |
| Ø250–300 | 1,4/2 civarı | 1,4/1,8 | ✓ |
| Ø400 | aralık | 0,9/1,1 | ✓ |
| Ø500 | 0,75/1,25 | 0,75/1,25 | ✓ |

**Satılan dişe oturtma (kayıt — tablo değiştirilmedi):**
- Ürün sayfası (`snapToAvailable`) en yakın ortalama TPI'yı seçiyor.
- Danışman (`snap_to_available`) hedef değişken dişse önce değişken dişlere bakıyor; eşitlikte dolu kesitte kaba dişi seçiyor.
- Örnekler:
  - Ø40, 27×0,9: sayfa **8**, danışman **5/8**.
  - Ø10, 13×0,6: sayfa **14**, danışman 10/14 veya 14/18.
- Kütüphane cevapları danışman kuralını izliyor. Ürün sayfasına aynı kuralın eklenmesi önerildi (OD-17).

## 6. TPI — boru ve profil (yetkili tablo: `TUBE_TABLE`)

**Hücreler:** Kütüphane, site rehber tablosu (6 satır × 5 sütun) ve tedarikçi kataloğunun s.17 tablosu hücre hücre aynı.

**Örnekler:** Tüm kütüphane örnekleri `lookupTube` ile doğru.
- 2 mm et, Ø25–100 → 18; 125 → 12/16; 150–200 → 10/14.
- 50×50×4 → 12/16.
- 80×80×4 → 10/14.
- 100×100×5 → 8/11 ("8/12 civarı").
- 120×120×5 → 6/9 ("6/10 civarı").
- 100×100×6 → 6/9.
- Ø114×6 → 5/7 ("5/8 civarı").
- Ø219×8 → 4/6.
- 10 mm et, Ø100–200 → 4/6; Ø250–500 → 3/4.
- 25 mm et → 3/4 ve 2/3.
- Not: 3 mm et kalınlığı 2 mm satırına, 5 mm et 4 mm satırına oturur (eşitlikte ilk satır).

**Danışman tabloyu kullanmıyor:** `tpi_refine` çizelgeyi yalnız dolu malzemeye uyguluyor. Boru ve profilde `rules.json` et kalınlığı kovalarına bakıyor (dış ölçü yok).
- Örnek 40×40×2: danışman 14/18 (27×0,9'da 5/8), sayfa 18 (27×0,9'da 8).
- **Kayıt; tablo değiştirilmedi** (SCHEMA kural 6) → OD-17.
- Kütüphanedeki "danışmanımız çizelgeyi verir / ikisi aynı sonucu verir" ifadeleri (ms.tpi-tube-table, ms.tpi-snap-explained, ms.tpi-other-charts) düzeltildi.

**Başka üretici tabloları:** İnce cidarda 10/14 gibi daha seyrek dişler öneriyor. Bunlar yalnız `conflict` olgusu olarak duruyor; tablo korunuyor.

## 7. Sertlik sınırları

| Konu | Kaynaklar | Sonuç |
|---|---|---|
| Bi-metal (M42/M51) | Kütüphane, rehber, SSS ve grades.json ≈45 HRC; RÖNTGEN M51 ≤50 HRC; ISO 4875-2 diş ≥62 HRC (bıçak sertliği, malzeme değil) | Tutarlı (OD-23) |
| Karbür | Rehber tablo ve SSS cevabı "~65 HRC"; cs.carbide-what 65; mt.takim-celigi 65; grades.json `carbide_max_hrc_approx: 65`; ms: Starrett 60 (yüzeyi sertleştirilmiş), LENOX 61, WIKUS TSN 65 | Kütüphane **60–65** olarak hizalandı; grades.json'a `range_hrc [60,65]` ve `status: conflict` eklendi; rehber düzeltmesi OD-15 |
| Aşınma plakası (Hardox) | SSS ve rehber: 400 ve 450 sınır bölgesi, 500+ karbür. cs.bimetal-limits ve cs.hardened: "Hardox 500 ve üzeri karbür" (450 için bir şey yok). mt ve ms: 400 sınır, 450+ karbür. HBW: 450 sınıfı için iki SSAB belgesi 390–475 ve 410–475; 500 sınıfında HRC karşılığı mt'de 48–54, ms ve rehberde 47–54 (yuvarlama) | Tek kayıt (ms.hardox): 400 sınırda, 450+ karbür; "390/410–475"; "≈47–54 HRC" |
| Islah çeliği 42CrMo4 | mt: 900–1300 MPa ≈ 28–41 HRC "kesite göre". Denetim: bu aralık yalnız Ø100 mm'ye kadar; Ø101–160 mm için 800–950 MPa | mt.c45-vs-42crmo4 ve ms.alloy-qt-steel daraltıldı |

## 8. Satılan ölçü ve dişler (canlı fiyat ağacına göre)

| Aile | `_inputs/live_price_tree.json` | Kütüphane | Canlı (denetim anı) | Ürün sayfası metni |
|---|---|---|---|---|
| Bi-metal | 13×0,5 / 13×0,6 / 27×0,9 / 34×1,1 / 34×1,2 / 41×1,3 / 54×1,6 ve dişleri | Birebir (cs.bimetal-options, ms.tpi-sold-matrix, ms.standard-sections) | **+6×0,6 [10/14], 6×0,9 [10/14], 10×0,6 ["6/10 , 8/12" hatalı]** | M42 "6–41 mm", M51 "6–41 × 0,65–1,30"; sunucu HTML'inde yedek liste ve fiyat |
| Karbür | 27×0,9 / 34×1,1 / 41×1,3 / 54×1,6 | Birebir | Aynı | "10–41 mm, 0,90–1,30"; karbürde satılmayan "4/6, 5/8" |
| Ahşap | 13×0,6, 16×0,6, 20×0,7, 25×0,8, 32×0,9, 40×1,0 (diş yok) | Birebir | Aynı | 13/20/27/34 × 0,65/0,90; 4/6, 6/10, 10/14 anılıyor |
| Et-kemik | 16×0,5, 19×0,55, 20×0,6 (diş yok) | Birebir | Aynı | 13/16/19/20/25 × 0,45/0,55/0,65; 3/4/6 TPI |
| Sünger-tekstil | 8×0,45, 10×0,5, 13×0,6 (ağız yok) | Birebir | Aynı | 6/10/13/20/27 × 0,45/0,55; Wave/Scallop/Düz |

`rules.json` varsayılanları da sorunlu:
- 16×0,9 (16 mm bi-metal satılmıyor).
- M1 → 13×0,65 (13 mm'de 0,6/0,5 satılıyor).
- M3 → 27×1,1 (satılmıyor; doğrusu 27×0,9).

**Sonuç:**
- cs.bimetal-options "anlık görüntü + güncel liste ürün sayfasında" olarak çerçevelendi ve `price_api` ister.
- ms.contour-radius'taki "en dar bi-metal 13 mm" ifadesi çıkarıldı.
- Matris ve metin düzeltmeleri OD-12 ve OD-18'e, `rules.json` düzeltmeleri OD-24'e bağlandı.

## 9. Ölçüye göre boy sınırları

| Kaynak | Değer |
|---|---|
| Ürün metaverisi ve blade-guard (sepet; sipariş öncesi tekrar kontrol) | M42 1.000–15.000 · M51 1.500–15.000 · Karbür 1.500–12.000 · Ahşap 1.000–8.000 · Spezial 1.000–10.000 · Et-kemik 1.500–6.000 · Sünger 1.000–8.000 |
| `calculate/route.ts` | 1.000–15.000 (ürüne bakmıyor; adet indirimi de uygulamıyor) |
| `front_desk.py` 560, 654 | 1.000–15.000 tüm aileler |
| Kütüphane cs.length-limits ve cs.short-lengths | Sunucuyla aynı (Spezial cevaptan çıkarıldı) |
| qg NOTES | Sunucuyla aynı |

**Sonuç:** Kütüphane doğru. Danışman ürün sınırlarını uygulamıyor → OD-13 (P0).

## 10. Kargo, iade, ödeme ve indirim kuralları

| Kural | Kod | Yasal metin | Danışman / SSS | Kütüphane (önce) | Sonuç |
|---|---|---|---|---|---|
| Ücretsiz kargo eşiği | shipping.ts:18,20; auto-shipping.ts: KDV dahil ≥2.000 TL, altında 79,90 + KDV | — | Aynı | Aynı (KDV dahil 95,88 TL, KDV hariç ≈1.666,67 TL) | ✓ |
| Cayma süresi | — | 14 gün (satır 197, 251, 269) | Aynı | Aynı | ✓ |
| Cayma istisnası | — | "md.15 (ğ)"; hijyen 15/1-ç yalnız İade Politikası'nda | "mevzuat gereği" (bent yok) | İki olgu "15/ğ" | Olgular 15/1-(b) olarak düzeltildi → OD-02 |
| İade kargo masrafı | — | "Alıcı'ya aittir" (199, 254) | — | cs.return-ready-made ve cs.return-process "size aittir" | MSY 12/3'e aykırı; cevaplar nötr yapıldı → OD-03 |
| Para iadesi süresi | — | "ürün ulaştıktan sonra 10 iş günü" (288) | — | Aynı (cs.return-process, cs.refund-timing) | MSY 12/1 (bildirimden itibaren 14 gün) cevaplara yazıldı → OD-03 |
| "Orijinal ambalaj" şartı | — | Var | front_desk `_returns`'te var | Var | Avukata → OD-03 |
| İade talebi kanalı | — | "hesap sayfanızdan" (özellik yok) | — | İletişim formu veya e-posta | Metin düzeltilmeli → OD-03 |
| Ayıp bildirimi | — | "7 gün içinde" | Süre yok | Süre yok; 6502 iki yıllık zamanaşımı | → OD-03 |
| Ödeme | iyzico 3D; taksit [1,2,3,6,9] (service.ts:201); kapıda ödeme yok | MSS 7.1 ve ÖBF 4 "havale/EFT" | Kart; havale yok | Aynı | Yasal metin düzeltilmeli → OD-04 |
| Adet indirimi | blade-line.ts:47-52, pricing.ts:57-61: 3+ %5, 5+ %10, 10+ %15 (aynı satır) | — | Aynı | Aynı; hazır boyda yok | ✓ |
| KDV gösterimi | Ürün sayfası KDV hariç, hazır boy kartı ibaresiz | — | "+ KDV" | "KDV hariç" (doğru tarif) | Fiyat Etiketi Yönetmeliği → OD-08 |
| Teslim süresi | Footer "24 saat", sepet "14:00 aynı gün", konfigüratör "Aynı gün kargoda", e-posta "1–3 / 3–7 iş günü" | ÖBF "1–3 / 3–7 iş günü" | "en kısa sürede" | "en kısa sürede" + yasal 30 gün | 30 gün cümlesi kararına kadar çıkarıldı → OD-01 |
| Sadakat puanı | 100 TL = 1 puan, 1 puan = 0,50 TL; ödemede kullanım yok | — | — | Dürüst tarif | → OD-09 |

## 11. Malzeme eşdeğerlikleri (mt / ms / site rehberi)

**Uyumlu olanlar:**
- St37 → S235JR 1.0038.
- St52-3 → S355JR veya S355J2 (1.0577).
- C45 1.0503 / Ck45 = C45E 1.1191 ≈ 1045.
- 42CrMo4 1.7225 ≈ 4140 (SIJ 4142 yazıyor; ikisi de yaklaşık).
- 100Cr6 1.3505 ≈ 52100.
- 304 1.4301 · 316/316L/316Ti 1.4401/1.4404/1.4571 · 321 1.4541.
- Dubleks 1.4462.
- 17-4PH 1.4542.
- D2 1.2379 · H13 1.2344 · O1 1.2510 · M2 1.3343.
- Alüminyum: 6061 = 3.3211, 6082 = 3.2315.

**Notlar:**
- **St37 numarası:** Denetime göre atıf verilen kaynaklarda 1.0038 numarası yok; yalnız site rehberinde var. DIN 17100'de St37-2 = 1.0037, RSt37-2 = 1.0038. Olgu `single_source` yapıldı; bir üretici veri sayfası eklenmeli.
- **Hardox:** 500 sınıfının HRC karşılığı yuvarlama farkıyla 47 / 48 olarak geçiyordu; tek kayıtta birleştirildi.
- **Paslanmaz sınıfları:** mt.paslanmaz-turleri ile ms.stainless-other farklı soruları karşılıyor ("nedir" ve "nasıl kesilir") ve ikisi de tutuldu. Soru varyantları ayrıştırıldı.

## 12. Et-kemik diş adımı ve paslanmaz

| Kaynak | Donuk / kemikli | Taze | Balık / hassas |
|---|---|---|---|
| nm.meat-tpi-fresh-frozen ve site rehberi | 3 TPI | 4 TPI | 6 TPI (bazı satıcılar tersini söylüyor) |
| cs.meatbone-options (önce) | "seyrek, yaklaşık 3–4 TPI" | — | "daha sık" |
| Starrett donuk et bıçağı | 2–4 TPI | — | — |

**Sonuç:**
- cs.meatbone-options sayı vermeden "donuk ve kemikliye seyrek, taze ve hassas kesime sık diş" diyor; ayrıntı nm.meat-tpi-fresh-frozen'da (OD-26).
- Et rehberinin SSS'si "paslanmaz zorunlu değildir" diyor; TGK Ek-4/1-a ile çelişiyor (OD-14, P0).

## 13. Ahşapta bıçak genişliği ve kıvrım yarıçapı

| Kaynak | 6 mm | 10 | 13 | 16 | 20 | 25 |
|---|---|---|---|---|---|---|
| nm.wood-width-radius-table | 16 | 40 | 65 | 100 | 140 | 180 |
| ms.contour-radius (metal) | 16 | 40 | 65 | — | 140 | 180 |
| Site ahşap rehberi | 16 | 40 | 65 | … | | |
| RÖNTGEN Tablo 4 (denetimde doğrulandı) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Sonuç:** Değerler tutarlı. Ancak rehber satılmayan 3, 6 ve 10 mm ahşap bıçaklarını ve 2–3 TPI'yı öneriyor; en dar ahşap bıçağımız 13 × 0,6 mm. Ayrıca:
- "400 mm kasnak → 0,4 mm" örneği var; en ince bıçağımız 0,6 mm.
- Kaynağı belirsiz "~12 diş" üst sınırı var.

Bu üç madde OD-40 ve OD-28'e bağlandı. nm.wood-tpi-three-teeth'teki "14 TPI ≈ 6 mm" denetimle 5,5 mm olarak düzeltildi.

## 14. Ürün iddiaları

| İddia | Konum | Çelişen | Sonuç |
|---|---|---|---|
| "Ağız tipini ürün sayfasında seçebilirsiniz" | Sünger rehberi, ürün metinleri | Sipariş ekranında diş veya ağız alanı yok (matriste diş listesi boş) | Kütüphane "siparişten önce bize yazın" diyor → OD-11 |
| "Karbür Uçlu … aşındırıcı kompozit" | Ürün ve kategori metni; mt.kompozit-ctp-karbon | Kompozit üreticileri grit kenarlı bıçak öneriyor | Kayıt nm.plastic-gfrp'ye birleştirildi, iddia kaldırıldı → OD-15 |
| "Metal bıçağını ahşapta kullanmak … düşürür / kullanmayın" | m42-mi-m51-mi rehberi, cs.bimetal-limits | nm, Olson ve LENOX: bi-metal ahşabı keser, çivili ahşapta önerilir | cs.wood-metal-crossuse'ta birleştirildi → OD-40 |
| Sünger-Tekstil "strafor" keser | qg.term-sunger-tekstil-bicagi | nm.foam-eps-xps: dişsiz bıçağın EPS için önerildiğine dair kaynak yok | Sözlük kaydı cs.textile-what'e birleştirildi; "EPS için önermiyoruz" |
| "Spezial … sert ağaç için" sorularıyla Spezial önerisi | cs.spezial-what, cs.wood-options, cs.materials-overview, cs.length-limits | SCHEMA: Spezial önerilebilir listede değil | Spezial yalnız cs.spezial-what'te kaldı; genel sert ağaç soruları nm.wood-hard-vs-soft'a taşındı → OD-30 |
| Garanti, üstünlük, menşe ve süreç iddiaları | Footer, hero, ürün sayfaları (%80 diş ömrü), seed dosyaları | Belge yok | Danışman söylemiyor; site düzeltmesi → OD-07 |
| Danışman davranış vaatleri ("danışman çizelgeyi verir", "eksik bilgide sayı vermez", "bilinmeyen malzemede karbon çeliği varsayar") | ms.tpi-tube-table, ms.decision-info-needed, ms.hardness-unknown, ms.unknown-material | Kodda karşılığı yok veya kısmi | Yumuşatıldı |
| Kaynak süreci: tavlama, taşlama, kontrol | cs.welding (hakkımızda) | Doğrulanmadı | Cevaptan çıkarıldı → OD-07 |

## 15. Sünger ağız eşlemesi

| Malzeme | cs.textile-edge-choice ve site rehberi | nm (kaynaklarla) | Ürün sayfası |
|---|---|---|---|
| Esnek PU (yatak, döşeme) | düz | düz (düşük-orta yoğunluk); HR'de tırtıklı | — |
| Hafızalı köpük | düz | düz **veya** tırtıklı | — |
| Kumaş | dalgalı | düz (tekstil makineleri) veya dalgalı | tırtıklı |
| Yalıtım, mineral yün | tırtıklı | dalgalı veya tırtıklı | — |

**Sonuç:** Kayıtlar nm.foam-edge-types'ta çatışmayı belirten tek cevap olarak birleştirildi → OD-27.

## 16. Danışman ve kural motoru kod sorunları (kütüphane cevaplarını etkileyenler)

- `rules.json R_MITRE_CUT_EFFECTIVE_THICKNESS_WARNING`: "%140 artar" yazıyor. Geometride 1/cos45° ≈ 1,41, yani ~%41 artış; kütüphane bu değeri kullanıyor (ms.tpi-mitre).
- `rules.json`:
  - Titanyum ve nikeli doğrudan karbüre yönlendiriyor.
  - Alüminyumda 18/24 ve 24/32 dişleri üretiyor.
  - Kaynaksız ömür değerleri var: "2–3 kat", 5.000 m, "%40–60".
  - Müşteri metninde "BI_METAL_M51 veya CARBIDE" iç kodları geçiyor.
- `front_desk`: `_contact`, `_identity` ve `_unknown_material` WhatsApp öneriyor (OD-06). `_returns` "orijinal ambalajında olmalı" diyor (OD-03).
- Sözlük normalizer kalıbında `kutuk` ahşap ailesine bağlıydı; "300 mm kütük kesimi" metal billet sorusu ahşaba yönleniyordu.
  - Birleşik `glossary_patterns.json`'da kalıp dolu malzemeye taşındı; pos ve neg testleri geçti.
  - Riskli eş anlamlar da çıkarıldı: genişlik için "en" ("en iyi" ile çakışıyor), talaş için "çapak", ölçü yazımı için "kesit", malzeme kodu için "kalite".

## 17. Kayıtlar arası soru çakışmaları

- Birleştirme sonrası birebir aynı soru **0**.
- 0,7 Jaccard eşiğinde kalan 7 benzer çift ya kök eşleşmesinden doğan yanlış pozitif ("paslanmaz" ile "paslanır") ya da ahşap / metal ayrımı bilinçli olarak korunan çiftler. Bu çiftlerin soru varyantlarına "ahşap", "metal" ve "et" gibi ayırt edici sözcükler eklendi.
- Ayrıntı: `_work/neardup.txt` ve `_work/merge_log.txt`.
