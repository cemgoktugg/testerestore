# Bilgi kütüphanesi

Danışmanın (ve sitenin) tek doğruluk kaynağı. Her alan bir JSON dosyasıdır
(`<alan>.json`; şema: kayıt kimliği, soru varyantları, kısa "siz" hitaplı
cevap, kaynaklı olgular, site bağlantıları). `glossary.json` terim sözlüğüdür.

- Yükleme ve arama: `llm/kb.py` (API'siz, kayıt düzeyinde TF-IDF).
- Yönlendirme: `llm/kb_router.py` (ilk 8 aday → küçük model yalnızca SEÇER;
  müşteriye kütüphanedeki onaylı metin gider).
- Kurallar: yalnızca TestereStore ürünleri, teslim süresi yok, her sayının
  kaynağı var; kaynaklar çelişirse tek değer dayatılmaz.
