#!/bin/sh
# ============================================================================
# TEK SEFERLİK CANLI SEED (deploy'da arka planda çalışır)
#
# Koşul: SEED_ON_BOOT=1  VE  marker yok.
# Durumu ./static/seed-status.txt'e yazar → panel.<domain>/static/seed-status.txt
# adresinden UZAKTAN izlenebilir (log'a erişmeye gerek yok).
# cwd = /app/.medusa/server  (Dockerfile WORKDIR).
# ============================================================================
STATUS="./static/seed-status.txt"
MARKER="./static/.seeded"
mkdir -p ./static 2>/dev/null

log() {
  echo "[seed] $1"
  echo "$(date '+%H:%M:%S' 2>/dev/null) | $1" >> "$STATUS" 2>/dev/null
}

if [ "$SEED_ON_BOOT" != "1" ]; then
  echo "[seed] SEED_ON_BOOT='$SEED_ON_BOOT' (1 değil) → atlanıyor"
  echo "SKIP: SEED_ON_BOOT='$SEED_ON_BOOT' (1 olmali)" > "$STATUS" 2>/dev/null
  exit 0
fi
if [ -f "$MARKER" ]; then
  echo "[seed] zaten seed edilmiş → atlanıyor"
  echo "SKIP: zaten seed edildi (marker var)" > "$STATUS" 2>/dev/null
  exit 0
fi

echo "BASLADI" > "$STATUS" 2>/dev/null
# Ana sunucu tam ayağa kalksın diye kısa bekleme (kaynak çakışmasını azaltır)
sleep 20
log "=== TEK SEFERLIK SEED BASLIYOR ==="

run() {
  log ">>> $1 basladi"
  if timeout 300 npx medusa exec "./src/scripts/$1" > "/tmp/seed-$1.log" 2>&1; then
    log "<<< $1 OK"
  else
    log "!!! $1 HATA/timeout (devam ediliyor)"
    # Hatanın son 3 satırını status'a ekle (uzaktan teşhis için)
    tail -3 "/tmp/seed-$1.log" 2>/dev/null | sed 's/^/    /' >> "$STATUS" 2>/dev/null
  fi
}

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
log "=== SEED TAMAMLANDI ==="
