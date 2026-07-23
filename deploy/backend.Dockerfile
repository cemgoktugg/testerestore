# ============================================================================
# Medusa v2 backend — production imajı
# Build context: medusa-backend/apps/backend  (self-contained Medusa app)
#   Stage 1: `medusa build` → .medusa/server üretir
#   Stage 2: sadece .medusa/server'ı çalıştırır (yalın)
# ============================================================================

# ---- Stage 1: build --------------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app

# Bazı native bağımlılıklar için derleme araçları
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Önce sadece manifest → katman cache'i
COPY package.json package-lock.json* ./
RUN npm install

# Kaynak kod + Medusa üretim derlemesi (.medusa/server)
COPY . .
RUN npx medusa build

# ---- Stage 2: runtime ------------------------------------------------------
FROM node:20-slim AS runner
WORKDIR /app/.medusa/server
ENV NODE_ENV=production

# Derlenmiş sunucu + admin
COPY --from=builder /app/.medusa/server ./

# Seed script'leri (tsconfig build'den exclude ettiği için .medusa/server'a
# girmiyor) — tek seferlik canlı seed için explicit kopyala. medusa exec bunları
# swc ile çalıştırır; `../modules/X/service` import'ları compiled .js'e çözülür.
COPY --from=builder /app/src/scripts ./src/scripts
COPY --from=builder /app/seed-on-boot.sh ./seed-on-boot.sh

# Üretim bağımlılıkları (derlenmiş sunucunun kendi package.json'ı)
RUN npm install --omit=dev \
 && npm cache clean --force

# Yüklenen görsellerin kalıcı dizini (compose bir volume bağlar)
RUN mkdir -p ./static

EXPOSE 9000

# Sıra: 1) migration  2) admin (ADMIN_EMAIL varsa)  3) tek seferlik seed'i
# ARKA PLANDA başlat (SEED_ON_BOOT=1 ise; sunucuyu bloklamaz, deploy sağlıklı
# kalır)  4) sunucuyu ön planda başlat.
CMD ["sh", "-c", "npx medusa db:migrate && ([ -n \"$ADMIN_EMAIL\" ] && npx medusa user -e \"$ADMIN_EMAIL\" -p \"$ADMIN_PASSWORD\" || true) && (sh ./seed-on-boot.sh &) && npm run start"]
