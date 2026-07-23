#!/bin/sh
# ============================================================================
# TEK SEFERLİK CANLI SEED (deploy'da arka planda çalışır)
#
# Koşul: SEED_ON_BOOT=1  VE  marker dosyası yok.
# Marker kalıcı `static` volume'unda → bir kez çalışır, sonraki deploy'larda
# tekrar ETMEZ. Her seed `|| devam` ile hataya toleranslı; çoğu idempotent.
# cwd = /app/.medusa/server  (Dockerfile WORKDIR).
# ============================================================================
MARKER="./static/.seeded"

if [ "$SEED_ON_BOOT" != "1" ]; then
  echo "[seed] SEED_ON_BOOT!=1 → seed atlanıyor"
  exit 0
fi
if [ -f "$MARKER" ]; then
  echo "[seed] zaten seed edilmiş ($MARKER) → atlanıyor"
  exit 0
fi

# Ana sunucu tam ayağa kalksın diye kısa bekleme (kaynak çakışmasını azaltır)
sleep 20
echo "[seed] ============================================"
echo "[seed]   TEK SEFERLİK SEED BAŞLIYOR"
echo "[seed] ============================================"

run() {
  echo "[seed] >>> $1 çalışıyor..."
  if timeout 300 npx medusa exec "./src/scripts/$1"; then
    echo "[seed] <<< $1 TAMAM"
  else
    echo "[seed] !!! $1 HATA/timeout (devam ediliyor)"
  fi
}

# Sıra önemli: önce region+kategori+ürün+key, sonra fiyat/vergi/kargo, sonra içerik
run seed-testere.ts              # TRY + Türkiye region + 8 kategori + ürünler + publishable key
run seed-blade-prices.ts         # şerit fiyat matrisi (idempotent)
run seed-tr-kdv.ts               # %20 KDV
run seed-tr-shipping.ts          # kargo seçenekleri
run seed-tr-shipping-update.ts   # kargo güncelleme
run seed-meat-bone-textile.ts    # ek ürünler
run seed-ready-made-blades.ts    # hazır şeritler
run attach-default-blade-images.ts
run backfill-ready-made-images.ts
run enable-iyzico-region.ts      # iyzico'yu Türkiye region'ına bağla
run seed-hero-slides.ts          # anasayfa hero
run seed-footer.ts               # footer
run update-footer-legal-links.ts
run seed-site-seo.ts             # SEO varsayılanları

touch "$MARKER"
echo "[seed] ============================================"
echo "[seed]   SEED TAMAMLANDI — marker yazıldı ($MARKER)"
echo "[seed] ============================================"
