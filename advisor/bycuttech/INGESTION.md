# Bilgi Bankasına Yeni Kaynak Ekleme

Bu belge, BYCUTTECH Şerit Testere AI'ın bilgi bankasını büyütürken izlenecek
standart süreci tanımlar. Amaç, her yeni kaynağın **izlenebilir, kapsamı
belli ve doğrulanmış** biçimde girmesi; sayısal bir kararın arkasında kimin
sözü olduğunun her zaman bilinmesidir.

İlke: **onaylanmamış bir kaynak üretimde sayısal karar veremez.**

---

## 0. Kaynak nereye eklenir

| Dosya | İçerik | Sayısal karar verebilir mi |
|---|---|---|
| `bycuttech_rag_v2/bycuttech_encyclopedia_v2.json` | Ürünler, varyantlar, kesim tabloları, TPI matrisleri, arıza tablosu | **Evet** |
| `bycuttech_rag_v2/premium_source_registry.json` | Kaynak künyeleri, lisans ve kapsam | Hayır (künye) |
| `bycuttech_rag_v2/premium_verified_facts.json` | Kaynak kapsamı korunmuş tekil olgular | Kapsamı uyuyorsa |
| `bycuttech_rag_v2/evaluation_cases.json` | Davranış ve doğruluk vakaları | — |

`advisor/` kökündeki kopyalar **kullanılmıyor** (dosya adları kaymış hâlde
duruyor). Tek geçerli konum `advisor/bycuttech_rag_v2/`.

---

## 1. Kaynağı kaydet

`premium_source_registry.json` içine bir kayıt aç:

```json
{
  "source_id": "WIKUS-SELECTION",
  "publisher": "WIKUS-Sägenfabrik",
  "title": "Sägeband-Auswahl",
  "url": "https://…",
  "source_tier": "A",
  "authority_type": "manufacturer_selection_tool",
  "content_type": "pdf",
  "language": "de",
  "allowed_usage": "normalized_facts_only",
  "license_status": "public_manufacturer_document",
  "scope": { "brand": "WIKUS", "blade_type": "bimetal" },
  "numeric_authority": true,
  "integration_status": "ingestion_queue"
}
```

`source_id` sonradan **değiştirilmez**; plan içinde bu id ile taşınır.

## 2. Resmi mi, ikincil mi?

`authority_type` alanı kaynak önceliğini belirler
(`bycuttech/sources.py::_AUTHORITY_ORDER`). Sıra:

1. `machine_manual` — tam makine modelinin üretici kılavuzu
2. `owned_product_catalog` — BYCUTTECH kendi katalogu
3. `owned_cutting_table` / `owned_*_table`
4. `manufacturer_technical_guide` / `manufacturer_selection_tool`
5. `standard_body` (ISO/ASTM)
6. `supplier_application_guide`
7. `secondary`

Perakendeci blogu, forum, anonim PDF → `secondary`, `numeric_authority: false`.
Bu kaynaklar **sayısal karar veremez**; yalnızca açıklayıcı metin olabilir.

## 3. Lisans ve kullanım durumunu kaydet

`allowed_usage` seçenekleri:

- `full_structured_ingestion_and_numeric_use` — BYCUTTECH'e ait kaynaklar
- `normalized_facts_only` — yalnızca normalize edilmiş olgu + kısa özet + link
- `metadata_only` — yalnızca künye; içerik alınmaz

**Telifli katalogların tam metni kopyalanmaz.** İzin verilen: normalize
edilmiş teknik olgular, kısa özetler ve kaynak bağlantısı. Etkileşimli
seçiciler (ör. LENOX selector) kullanım şartları doğrulanmadan otomatik
çekilmez.

## 4. Marka kapsamını belirle

`scope` alanı zorunludur:

```json
"scope": { "brand": "WIKUS", "blade_type": "bimetal" }
```

Kapsam yazılmazsa olgu başka markanın ürününe taşınabilir hâle gelir.
`bycuttech/sources.py::ConflictResolver.applicable_facts` kapsamı uymayan
olguyu **filtreler**; yalnızca `general_principle: true` işaretliler
markalar arası kullanılabilir.

> Örnek: Morse'un "karbür bıçak alıştırma istemez" politikası BYCUTTECH
> ADVANZ'a uygulanmaz. Bu kural `CR-BREAKIN-001` ile korunuyor ve
> `ADV-005` vakasıyla test ediliyor.

## 5. Teknik olguları normalize et

`premium_verified_facts.json` biçimi:

```json
{
  "fact_id": "WIKUS-BIMETAL-TPI-10-14",
  "source_id": "WIKUS-SELECTION",
  "predicate": "bimetal_variable_tpi_contact_range",
  "value": { "tpi": "10/14", "min_mm": 0, "max_mm": 20 },
  "scope": { "brand": "WIKUS", "blade_type": "bimetal" },
  "verification_status": "verified_from_source"
}
```

Birimler SI ve açık olmalı (`_mm`, `_m_min`, `_cm2_min`). Serbest metne
gömülü sayı kabul edilmez.

## 6. Sayısal değerleri doğrula

- Değer en az bir ikinci kaynakla karşılaştırılır; fark varsa
  `verification_sources` listesine ikisi de yazılır.
- Baskı hatası tespit edilirse orijinal değer `printed_value` altında
  saklanır, düzeltme `qa_note` ile açıklanır, durum
  `corrected_or_flagged` olur.
- Tablonun geçerli olduğu aralık `workpiece_dimension_mm` ile yazılır.
  **Bu aralığın dışına ekstrapolasyon yapılmaz** (`SCOPE-001`).

## 7. Çatışmaları işaretle

Çözülemeyen çelişki `qa_issues` altına eklenir:

```json
{
  "id": "QA-009",
  "severity": "high",
  "status": "requires_product_owner_review",
  "subject": "…",
  "catalog_value": "…",
  "verified_value": "…",
  "basis": "…"
}
```

`status` alanı `corrected` veya `normalized` DEĞİLSE, ilgili ürün için
motor `verification_required` üretir ve sayı yerine teknik inceleme ister
(`bycuttech/engine.py::_apply_open_qa`).

## 8. Kaynak metadata'sını koru

Plan içinde yalnızca `source_id` taşınır; künye
`KnowledgeBase.source_ref()` ile çözülür. Kullanıcı kaynak isterse
**yalnızca gerçekten kullanılan** kayıtlar gösterilir.

## 9. Değerlendirme vakası ekle

Her yeni kaynak veya kural için `evaluation_cases.json`'a en az bir vaka
eklenir. Vaka olmadan kaynak üretime alınmaz.

```json
{
  "id": "TECH-011",
  "category": "…",
  "turns": ["…"],
  "expect": { "product_id": "…", "tpi": "…" }
}
```

Yeni bir `expect` anahtarı eklenirse `tests/test_evaluation_cases.py`
içindeki `_checks()` sözlüğüne denetleyicisi de eklenmelidir; aksi hâlde
test raporunda "denetlenmeyen iddia" olarak görünür (sessizce geçmiş
sayılmaz).

## 10. Onay ve yayın

```bash
cd advisor
python tests/test_bycuttech_integration.py   # bütünlük + regresyon
python tests/test_evaluation_cases.py        # 50+ davranış vakası (eşik %95)
python tests/test_machine_search.py          # makine arama regresyonu
```

Manifest güncellenir (dosya boyutu + SHA-256):

```bash
python - <<'EOF'
import json, hashlib, pathlib
d = pathlib.Path("bycuttech_rag_v2")
m = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
for entry in m["files"]:
    p = d / entry["file"]
    entry["bytes"] = p.stat().st_size
    entry["sha256"] = hashlib.sha256(p.read_bytes()).hexdigest()
(d / "manifest.json").write_text(
    json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
EOF
```

Ancak bundan sonra `integration_status` `ingestion_queue` yerine
`integrated_v2_facts` yapılır.

---

## Önbellek ve sürümleme

`bycuttech/knowledge.py` dosyaların mtime + boyutunu izler. Paket dosyası
değiştiğinde indeks bir sonraki istekte kendiliğinden yenilenir; ayrıca
işlem yapmak gerekmez. Konteynerde dosya değişmiyorsa JSON istek başına
yeniden parse **edilmez**.

## Şu an bekleyen kaynaklar

`integration_status` alanı `ingestion_queue` olanlar üretimde sayısal
karar vermez. Bugün bekleyenler: RÖNTGEN, DoALL, Bahco katalogları.
LENOX selector kullanım şartları doğrulanana kadar otomatik çekilmeyecek.
ISO/ASTM tam metinleri kurumsal lisans olmadan alınmayacak — yalnızca
künye düzeyinde tutuluyor.
