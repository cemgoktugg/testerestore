# BYCUTTECH Şerit Testere AI - RAG v2 Geliştirme ve Kaynak Paketi

Bu paket, mevcut BYCUTTECH RAG ve e-ticaret yapısını bozmadan doğal konuşan, kapsam kontrollü ve kaynak izlenebilir bir şerit testere asistanı geliştirmek için hazırlanmıştır.

## Başlangıç

Claude Code içinde proje kökünü açın ve `CLAUDE_CODE_MASTER_PROMPT.md` dosyasının tamamını prompt olarak verin. Aynı çalışma alanına bu paketi ve önceki `bycuttech_ansiklopedi_v1.json` dosyasını koyun. Claude Code önce mevcut projeyi incelemeli, çalışan yapıyı ve testleri kaydetmeli, ardından eklemeli planla ilerlemelidir.

## Dosyalar

- `CLAUDE_CODE_MASTER_PROMPT.md`: Mevcut yapıyı koruyarak yapılacak geliştirme için tam uygulama promptu.
- `RUNTIME_SYSTEM_PROMPT.md`: Canlı chatbotun kullanacağı sistem promptu.
- `premium_source_registry.json`: Birincil ve premium kaynak kayıt defteri.
- `premium_verified_facts.json`: Kaynak kapsamı korunmuş ilk doğrulanmış teknik gerçekler.
- `source_ingestion_policy.md`: Telif, lisans, sürüm, sayısal veri ve chunk politikası.
- `source_coverage_matrix.csv`: Kaynak kapsamı ve entegrasyon durumu.
- `evaluation_cases.json`: 50 otomatik davranış ve teknik doğruluk vakası.
- `bycuttech_encyclopedia_v1.json`: Önceki yapılandırılmış BYCUTTECH bilgi tabanı.
- `bycuttech_encyclopedia_v2.json`: V1 bilgi tabanı ile yeni premium kaynak/fact kayıtlarının birleşik sürümü.
- `manifest.json`: Sayılar ve dosya SHA-256 değerleri.

## Mimari karar

RAG tek başına sayısal teknik karar vermeyecek. Sistem üç katmandır:

1. Deterministik kural ve hesaplama motoru
2. Kaynaklı hybrid retrieval
3. Doğal dil cevap üretimi

Ürün varyantı, TPI, hız, Q, süre, ilerleme ve gerginlik değerleri LLM tarafından tahmin edilmez. LLM yalnızca doğrulanmış typed sonuçları doğal biçimde açıklar.

## Premium kaynakların mevcut durumu

İlk aşamada BYCUTTECH/Starrett kayıtlarıyla birlikte WIKUS TPI tabloları, WIKUS genel gerginlik ve parametre girdileri, Starrett ve M.K. Morse marka bazlı alıştırma politikaları, Blaser soğutma ölçüm yöntemi, ISO 4875 metadata ve örnek KASTO makine sınırı yapılandırılmış olarak eklenmiştir.

RÖNTGEN, DoALL ve Bahco katalogları `ingestion_queue` durumundadır. LENOX selector otomatik scrape edilmeyecek; kullanım şartları ve olası izin/API yolu doğrulandıktan sonra adaptör geliştirilecektir. ISO ve ASTM tam metinleri kurumsal lisans olmadan alınmayacaktır.

## En kritik regresyon kontrolleri

- `bilinmiyorsa karbon çeliği` davranışı bulunmamalı.
- `varsayılan 8/12 TPI` bulunmamalı.
- Şerit testere dışı sorular cevaplanmamalı.
- Selamlamalar doğal karşılanmalı.
- Ürün matrisinde olmayan SKU üretilmemeli.
- 50-125 mm tablo kapsamı dışına Q ekstrapole edilmemeli.
- Marka bazlı alıştırma politikaları karıştırılmamalı.
- Makine kılavuzu hız, ölçü ve gerginlikte üst otorite olmalı.
