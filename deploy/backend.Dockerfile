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

# Üretim bağımlılıkları (derlenmiş sunucunun kendi package.json'ı)
RUN npm install --omit=dev \
 && npm cache clean --force

# Yüklenen görsellerin kalıcı dizini (compose bir volume bağlar)
RUN mkdir -p ./static

EXPOSE 9000

# Önce migration'ları çalıştır, sonra (ADMIN_EMAIL varsa) admin kullanıcısını
# oluştur (zaten varsa hata vermeden geçer), sonra sunucuyu başlat.
CMD ["sh", "-c", "npx medusa db:migrate && ([ -n \"$ADMIN_EMAIL\" ] && npx medusa user -e \"$ADMIN_EMAIL\" -p \"$ADMIN_PASSWORD\" || true) && npm run start"]
