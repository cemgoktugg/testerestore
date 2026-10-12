# Testere Store — Dokploy ile Yayınlama Rehberi

VPS'inde **Dokploy** kurulu olduğu için tüm stack'i Dokploy'un **Compose**
özelliğiyle yayınlıyoruz. Dokploy'un Traefik'i domain + SSL'i otomatik yönetir
(Caddy'ye gerek yok). Görseller kalıcı diskte kalır → **bulut depolama ücreti yok.**

Kullanılacak dosya: **`docker-compose.yml`** (Caddi'siz, Traefik label'lı).

---

## 0. Ön koşullar

1. **Proje bir git deposunda olmalı** (GitHub/GitLab/Gitea — private olur).
   Dokploy repoyu klonlayıp compose'u build edecek. Repo kökü şunları içermeli:
   `testerestore/`, `medusa-backend/`, `deploy/`.
2. **DNS A kayıtları** → Dokploy'un çalıştığı VPS IP'sine:
   | Tip | Ad | Değer |
   |-----|-----|-------|
   | A | `@` / `testere.com` | VPS_IP |
   | A | `api` | VPS_IP |
3. **Canlı anahtarlar hazır:** iyzico CANLI key/secret, Resend key. Publishable
   key'i ilk deploy sonrası admin'den alacağız (Adım 6).

---

## 1. Kodu git deposuna gönder (yerelde, tek sefer)

Proje şu an git deposu değil. Yerelde:
```bash
cd "<proje kökü>"           # testerestore/, medusa-backend/, deploy/ içeren klasör
git init && git add -A && git commit -m "İlk sürüm"
git branch -M main
git remote add origin <private-repo-url>
git push -u origin main
```
> `.env`, `node_modules`, `.next`, `.medusa` zaten .gitignore'da — commit edilmez.

## 2. Dokploy'da Compose servisi oluştur

1. Dokploy paneli → **Create Project** (örn. "testere") → içine **Create Service → Compose**.
2. **Provider: Git** → repoyu bağla → Branch: `main`.
3. **Compose Path:** `docker-compose.yml`

## 3. Ortam değişkenlerini gir (Environment sekmesi)

`deploy/.env.example` içindeki TÜM değişkenleri Dokploy'un **Environment**
alanına yapıştır ve doldur. Kritik olanlar:

```
DOMAIN=testere.com
API_DOMAIN=api.testere.com
POSTGRES_DB=medusa
POSTGRES_USER=medusa
POSTGRES_PASSWORD=<openssl rand -hex 24>
JWT_SECRET=<openssl rand -base64 48>
COOKIE_SECRET=<openssl rand -base64 48>
MEDUSA_BACKEND_URL=https://api.testere.com
STOREFRONT_URL=https://testere.com
STORE_CORS=https://testere.com
ADMIN_CORS=https://api.testere.com
AUTH_CORS=https://testere.com,https://api.testere.com
IYZICO_API_KEY=<canlı>
IYZICO_SECRET_KEY=<canlı>
IYZICO_BASE_URL=https://api.iyzipay.com
IYZICO_CALLBACK_URL=https://api.testere.com/iyzico/callback
RESEND_API_KEY=<resend key>
RESEND_FROM_EMAIL=siparis@testere.com
RESEND_FROM_NAME=Testere Store
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.testere.com
NEXT_PUBLIC_SITE_URL=https://testere.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_gecici_sonra_degistir
NEXT_PUBLIC_DEFAULT_REGION=tr
NEXT_PUBLIC_DEFAULT_CURRENCY=try
OPENAI_API_KEY=<şerit testere danışmanı için — sk-proj-...>
```

> ⚠️ **Advisor servisi ilk kez ekleniyorsa `Stop → Deploy` şart** (sadece
> Redeploy yetmez). Yeni servis + iki yeni volume (`advisor_chroma`,
> `advisor_data`) ancak recreate ile oluşur.
>
> İlk açılışta advisor ansiklopediyi bir kez vektör DB'ye indeksler (tek
> seferlik OpenAI embedding maliyeti). Sonraki deploy'larda `advisor_chroma`
> volume'ü sayesinde tekrarlanmaz.
> Dokploy bunları compose'un yanına `.env` olarak yazar; compose `${VAR}` ile okur.
> `DOMAIN`/`API_DOMAIN` aynı zamanda compose'daki Traefik label'larını besler →
> domain + SSL otomatik kurulur (ekstra ayar gerekmez).

## 4. Deploy 🚀

**Deploy** butonuna bas. İlk build 5–10 dk sürebilir (backend + storefront imajları).
**Logs** sekmesinden izle; `backend` container'ında migration çalışıp sunucu
başlamalı. Servisler ayağa kalkınca Traefik ~10 sn içinde SSL sertifikalarını alır.

> **Domain label çalışmazsa (yedek):** Compose servisinin **Domains** sekmesinden
> elle ekle — `storefront` servisi port `3000` → `testere.com`, `backend` servisi
> port `9000` → `api.testere.com`. Cert Resolver: Let's Encrypt.

## 5. Mevcut görselleri taşı (83 MB, kalıcı)

Yereldeki `medusa-backend/apps/backend/static/` içeriğini, Dokploy'daki bu servisin
kalıcı **`files/backend-static`** klasörüne koy:
- Dokploy'da servis → **Advanced/Volumes** veya **File Manager** ile, ya da VPS'e
  SSH atıp app dizinindeki `files/backend-static/` altına `scp` ile kopyala.
- Compose bunu `/app/.medusa/server/static`'e bağlıyor → ürün görselleri
  `https://api.testere.com/static/...` olarak public gelir.

## 6. Admin kullanıcısı + publishable key

Dokploy → `backend` servisi → **Terminal** (container'a exec):
```bash
npx medusa user -e admin@testere.com -p '<en az 16 karakterlik rastgele şifre>'
```
> Örnek şifre kullanma; ilk admin oluştuktan sonra `ADMIN_EMAIL`/`ADMIN_PASSWORD`
> env'lerini Dokploy'dan silebilirsin (her deploy'da yalnızca "yoksa oluştur" çalışır).
- Admin panel: **https://api.testere.com/app** → giriş yap.
- **Settings → Publishable API Keys** → anahtarı kopyala.
- Dokploy Environment'ta `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`'i gerçek key ile
  güncelle → **Redeploy** (NEXT_PUBLIC_* imaja gömülür, yeniden build şart).

## 7. Doğrulama

```
https://testere.com                → site açılıyor, ürün resimleri görünüyor
https://api.testere.com/health     → OK
https://api.testere.com/app        → admin girişi
https://testere.com/sitemap.xml    → URL'ler https://testere.com/... (localhost DEĞİL)
```
- Bir test siparişi ver (iyzico canlı — küçük tutar) → callback + e-posta çalışıyor mu.

---

## Güncelleme akışı
Kod değişince: `git push` → Dokploy **Redeploy** (veya otomatik deploy webhook'u kur).
- **Yeni ürün eklendiğinde storefront'u yeniden deploy et** — ürün sayfaları
  `dynamicParams=false` ile build'de üretiliyor (gerçek 404 için); yeni ürün ancak
  yeniden build sonrası yayında olur.

## Güvenlik
- **`JWT_SECRET` ve `COOKIE_SECRET` zorunlu:** üretimde boşsa veya "supersecret"
  ile başlıyorsa backend AÇILMAZ (eskiden bilinen varsayılana düşüyordu → herkes
  admin oturumu üretebilirdi). Her biri için uzun rastgele değer:
  `openssl rand -hex 32`. Değiştirirsen tüm oturumlar kapanır (beklenen).
- **Hız sınırları Traefik'te** (docker-compose.yml label'ları): giriş/kayıt/şifre
  sıfırlama dakikada 10, form uçları dakikada 5, danışman dakikada 30 (IP başına).
- **Danışman günlük tavanı:** `ADVISOR_DAILY_LIMIT` (varsayılan 3000 mesaj/gün).
  Ayrıca OpenAI panelinde projeye **aylık bütçe limiti** koy.
- **Dokploy paneli** (`:3000`) düz HTTP ile herkese açık olmamalı: Dokploy →
  Settings → Web Server'dan bir alan adı + HTTPS tanımla, 2FA'yı aç ve sağlayıcı
  güvenlik duvarında 3000 portunu yalnızca kendi IP'ne aç.

## Yedekler
`db-backup` servisi her gün `db_backups` volume'una yedek alır:
`db_YYYY-MM-DD_HHMM.dump` (veritabanı, 14 gün) ve `static_….tar.gz` (ürün
görselleri, 3 gün). Loglar: Dokploy → servis → Logs → `db-backup`
(`[yedek] … tamam` satırları).

**Sunucu dışına kopya şart** (sunucu kaybolursa aynı diskteki yedek de gider):
Dokploy → Compose → **Volume Backups** → `db_backups` volume'u → S3 uyumlu bir
hedef (Cloudflare R2, Backblaze B2, AWS S3) → günlük.

**Geri yükleme** (Dokploy → `db-backup` servisi → Terminal):
```sh
ls -lh /backups                       # yedekleri listele
# DİKKAT: mevcut veritabanının ÜZERİNE yazar. Önce backend'i durdur.
pg_restore --clean --if-exists --no-owner -d "$PGDATABASE" /backups/db_2026-10-12_0300.dump
```
Görseller: `/static` bu serviste kazara silinmesin diye salt okunur bağlı.
Geri yükleme gerekirse docker-compose.yml'de `db-backup` altındaki
`backend_static:/static:ro` satırından `:ro`'yu geçici kaldırıp redeploy et,
sonra aynı terminalde: `tar -xzf /backups/static_….tar.gz -C /static`.

## Notlar
- **Test edilmedi:** İlk deploy'da Medusa v2 build yolları / native bağımlılıklar
  için ufak ayar gerekebilir — logları izleyip birlikte düzeltebiliriz.
- **certResolver adı** (`letsencrypt`) Dokploy Traefik ayarınla eşleşmeli; farklıysa
  compose label'larında ya da Domains UI'da düzelt.
- Postgres/Redis bu compose içinde. İstersen Dokploy'un tek-tık Database'leriyle de
  değiştirilebilir (o zaman DATABASE_URL/REDIS_URL'i onların connection string'i yap).
