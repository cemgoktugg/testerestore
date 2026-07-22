# Testere Store — Canlıya Alma Rehberi (Yol 1: Tek VPS + Docker)

Bu rehber, tüm projeyi **tek bir Ubuntu VPS**'te `docker compose` ile canlıya
alır: PostgreSQL + Redis + Medusa backend + Next.js storefront + otomatik HTTPS.
**Görseller kalıcı diskte kalır → bulut depolama ücreti YOK.**

```
İnternet
   │  https://testere.com          https://api.testere.com
   ▼                                        │
 ┌─────────────────── Caddy (80/443, otomatik SSL) ───────────────────┐
 │        │                                          │                 │
 │   storefront:3000                            backend:9000           │
 │   (Next.js)                                  (Medusa API+Admin)     │
 │                                              │        │             │
 │                                        postgres:5432  redis:6379    │
 └────────────────────────────────────────────────────────────────────┘
            görseller: ./backend-static (host diski, kalıcı)
```

---

## 0. Önce elinde ne olmalı (ön koşullar)

1. **VPS** — Ubuntu 22.04/24.04, en az **2 vCPU / 4 GB RAM / 40 GB disk**.
   (Öneri: Hetzner CPX21 ~€8/ay, DigitalOcean 4GB, veya bir Türk VPS sağlayıcısı.)
2. **Alan adı (domain)** — örn. `testere.com`. Ayrıca API için bir alt alan adı:
   `api.testere.com`.
3. **DNS kayıtları** — domain panelinden **iki A kaydı** ekleyin, ikisi de VPS IP'sine:
   | Tip | Ad | Değer |
   |-----|-----|-------|
   | A | `@` (veya `testere.com`) | VPS_IP |
   | A | `api` | VPS_IP |
   > `www` de istiyorsanız ayrıca `www` A kaydı ekleyip Caddyfile'a `www.testere.com` ekleriz.

---

## 1. VPS'e Docker kur

VPS'e SSH ile bağlanın (`ssh root@VPS_IP`) ve:

```bash
curl -fsSL https://get.docker.com | sh
docker --version   # kurulumu doğrula
```

## 2. Proje dosyalarını VPS'e taşı

Yerelde proje OneDrive altında. VPS'e taşımanın en temiz yolu bir git deposu:

```bash
# Yerelde (ilk sefer): projeyi git deposu yapıp bir remote'a (GitHub private repo) itin.
# Sonra VPS'te:
git clone <repo-url> /opt/testere
cd /opt/testere/deploy
```

> Git kullanmıyorsanız: yerelde `medusa-backend/`, `testerestore/` ve `deploy/`
> klasörlerini (node_modules, .next, .medusa HARİÇ) bir arşive alıp `scp` ile
> `/opt/testere/` altına kopyalayın. Klasör yapısı korunmalı.

## 3. Ortam değişkenlerini doldur

```bash
cd /opt/testere/deploy
cp .env.example .env
nano .env
```

Doldurulacak kritik alanlar (`.env.example` içindeki yorumlara bakın):
- `DOMAIN`, `API_DOMAIN`, `ACME_EMAIL`
- `POSTGRES_PASSWORD` → `openssl rand -hex 24`
- `JWT_SECRET`, `COOKIE_SECRET` → her biri `openssl rand -base64 48`
- `IYZICO_*` → **canlı** iyzico anahtarları (`IYZICO_BASE_URL=https://api.iyzipay.com`)
- `RESEND_API_KEY`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`

> `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`'i ilk kurulumda admin'den alacaksınız
> (Adım 6). Şimdilik geçici bir değer bırakıp, key'i aldıktan sonra
> `docker compose up -d --build storefront` ile storefront'u yeniden build edin.

## 4. Mevcut görselleri taşı (83 MB)

Yereldeki `medusa-backend/apps/backend/static/` içeriğini VPS'te
`deploy/backend-static/` klasörüne kopyalayın (kalıcı disk):

```bash
mkdir -p /opt/testere/deploy/backend-static
# scp örneği (yerelden çalıştırın):
# scp -r "medusa-backend/apps/backend/static/"* root@VPS_IP:/opt/testere/deploy/backend-static/
```

## 5. Başlat 🚀

```bash
cd /opt/testere/deploy
docker compose up -d --build
```

İlk build 5–10 dk sürebilir. Takip:
```bash
docker compose logs -f backend      # migration + başlatma loglarını izle
docker compose ps                   # tüm servisler "healthy/up" olmalı
```

Caddy, DNS doğru ise **otomatik olarak SSL sertifikası** alır. Birkaç dakika
içinde `https://testere.com` ve `https://api.testere.com` yayında olur.

## 6. Admin kullanıcısı + publishable key

```bash
# Admin kullanıcısı oluştur
docker compose exec backend npx medusa user -e admin@testere.com -p GucluSifre123

# Admin panel: https://api.testere.com/app  → giriş yap
# Settings > Publishable API Keys > anahtarı kopyala → .env'e yapıştır:
#   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
# Sonra storefront'u yeni key ile yeniden build et:
docker compose up -d --build storefront
```

## 7. Doğrulama (canlı sağlık kontrolü)

```bash
curl -I https://testere.com                       # HTTP 200
curl -s https://api.testere.com/health            # OK
curl -sI https://api.testere.com/static/<bir-resim>.png   # HTTP 200 (görseller public)
```
- Storefront'ta ürün resimleri görünmeli (artık public HTTPS host'tan geliyor).
- `https://testere.com/sitemap.xml` içindeki URL'ler `https://testere.com/...` olmalı.

---

## Güncelleme (yeni kod / yeni ürün)

```bash
cd /opt/testere && git pull        # yeni kodu çek
cd deploy && docker compose up -d --build
```
> **Yeni ürün eklediğinizde** storefront'u yeniden build edin — ürün sayfaları
> `dynamicParams=false` ile build'de üretiliyor (gerçek 404 için). Yeni ürün
> ancak yeniden build sonrası yayınlanır: `docker compose up -d --build storefront`.

## Yedekleme

```bash
# Veritabanı
docker compose exec postgres pg_dump -U medusa medusa > backup_$(date +%F).sql
# Görseller: deploy/backend-static/ klasörünü düzenli yedekleyin (rsync/scp).
```

## Sık sorunlar

| Belirti | Sebep / Çözüm |
|--------|----------------|
| SSL alınmıyor | DNS A kayıtları VPS IP'sine bakmıyor ya da 80/443 kapalı. `dig testere.com` ile kontrol edin; firewall'da 80/443 açın. |
| Resimler görünmüyor | `MEDUSA_BACKEND_URL` `https://api.testere.com` olmalı; `curl -I https://api.testere.com/static/<dosya>` 200 dönmeli; görseller `backend-static/` içinde mi? |
| Storefront eski key/URL | NEXT_PUBLIC_* imaja gömülür → `.env` değişince `docker compose up -d --build storefront`. |
| Backend "database" hatası | `docker compose logs backend`; migration çalıştı mı? `docker compose exec backend npx medusa db:migrate`. |

---

## ⚠️ Not: Bu paket test edilmeyi bekliyor
Dosyalar standart Medusa v2 + Next.js Docker desenine göre hazırlandı ama
**gerçek VPS'te ilk deploy'da küçük ayarlar gerekebilir** (özellikle Medusa v2
build yolları, native bağımlılıklar). VPS + domain hazır olduğunda ilk deploy'u
birlikte yapıp takılan yeri anında düzeltebiliriz.

## Opsiyonel iyileştirmeler (sonra)
- **Redis'i tam devreye almak** (event bus + cache + workflow engine): şu an
  `REDIS_URL` verili ama `medusa-config.ts`'te redis modülleri tanımlı değil →
  tek instance için in-memory çalışır. Ölçeklenince redis modüllerini ekleriz.
- **www yönlendirmesi**, **rate limiting**, **otomatik DB yedeği (cron)**.
