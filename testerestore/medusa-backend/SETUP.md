# Medusa Backend Kurulumu — TestereStore

Bu dosya, frontend ile entegre çalışacak Medusa v2 backend'inin nasıl kurulacağını adım adım gösterir.

## 1. Ön Gereksinimler

- Node.js **20.x veya üzeri**
- PostgreSQL 15+ (Docker tavsiye edilir)
- Redis (opsiyonel ama tavsiye edilir)
- npm 10+ veya pnpm

PostgreSQL'i Docker ile başlatmak için:

```powershell
docker run -d --name testere-postgres `
  -e POSTGRES_USER=medusa `
  -e POSTGRES_PASSWORD=medusa `
  -e POSTGRES_DB=medusa-testere `
  -p 5432:5432 `
  postgres:15
```

## 2. Backend'i Oluştur

Proje kök klasöründe (`testerestore/`):

```powershell
npx create-medusa-app@latest medusa-backend `
  --no-browser `
  --db-url "postgres://medusa:medusa@localhost:5432/medusa-testere"
```

Sorulara yanıt:
- "Install Next.js Starter?" → **No** (frontend zaten hazır)
- "Do you want to seed the database?" → **Yes**

## 3. Backend .env

`medusa-backend/.env` aşağıdaki gibi olmalı:

```env
MEDUSA_ADMIN_ONBOARDING_TYPE=default
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:9000,http://localhost:7000
AUTH_CORS=http://localhost:3000,http://localhost:9000
REDIS_URL=redis://localhost:6379
JWT_SECRET=supersecret-change-me
COOKIE_SECRET=supersecret-change-me
DATABASE_URL=postgres://medusa:medusa@localhost:5432/medusa-testere
```

## 4. Migrate & Seed

```powershell
cd medusa-backend
npx medusa db:migrate
npx medusa user -e admin@testere.com -p Admin123!
npm run seed
npm run dev
```

Admin paneli: <http://localhost:9000/app>

## 5. Publishable API Key Üret

1. Admin → **Settings → Publishable API Keys → Create**
2. Adı: `Storefront`
3. Sales Channel: **Default Sales Channel**
4. Oluşturduğun `pk_xxx` key'ini kopyala

## 6. Frontend'i Bağla

Frontend kök (`testerestore/`) `.env.local`:

```env
MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_buraya_yapıştır
NEXT_PUBLIC_DEFAULT_REGION=tr
NEXT_PUBLIC_DEFAULT_CURRENCY=try
```

Frontend'i yeniden başlat: `npm run dev`

## 7. Türkiye Region & TRY Currency

Admin → **Settings → Regions → Create**:
- Name: `Türkiye`
- Currency: `TRY`
- Countries: `Turkey (TR)`
- Tax rate: `20%` (KDV)
- Payment providers: `Manual` (test için)

## 8. Kategorileri Oluştur

Admin → **Products → Categories → Add**

Aşağıdaki ağacı oluştur:
```
Şerit Testereler
├── Bi-Metal
│   ├── M42
│   └── M51
├── Ahşap
├── Et ve Kemik
├── Sünger / Tekstil
└── Karbür Uçlu
```

Handle örnekleri: `bimetal`, `bimetal-m42`, `bimetal-m51`, `wood`, `meat-bone`, `sponge-textile`, `carbide-tipped`.

## 9. Şerit Testere Ürünleri Oluştur

Her şerit testere ürünü için:

**Ürün Bilgileri:**
- Title: `Bi-Metal M42 Premium Şerit Testere Bıçağı`
- Handle: `bimetal-premium` (frontend URL'leri ile aynı olmalı)
- Subtitle / Description: pazarlama metni
- Category: ilgili kategori
- Thumbnail: ana görsel
- Images: galeri görselleri

**Options (frontend bunlara göre variant arar):**
| Option Title | Örnek değerler |
|---|---|
| Genişlik | 6mm, 10mm, 13mm, 20mm, 27mm, 34mm, 41mm |
| Kalınlık | 0.65mm, 0.90mm, 1.10mm, 1.30mm |
| Diş Adımı | 3/4 TPI, 4/6 TPI, 5/8 TPI, 6/10 TPI, 8/12 TPI, 10/14 TPI |

> ⚠️ Option title'lar **AYNEN** `Genişlik`, `Kalınlık`, `Diş Adımı` olmalı — frontend `lib/medusa/types.ts` içindeki sabitlerle eşleşiyor.

**Variants:**
Tüm (genişlik × kalınlık × TPI) kombinasyonlarını oluştur. Her variant için:
- **Title:** `27mm / 0.90mm / 4/6 TPI` gibi
- **SKU:** `BIM42-27-090-46`
- **Price:** Bu variant'ın **metre başına** fiyatı (örn. 210 TL)
- **Manage inventory:** isteğe bağlı
- **Metadata:**
  ```json
  { "welding_cost": 90 }
  ```

**Product Metadata** (parametrik fiyat ve özel uzunluk):
```json
{
  "blade_type": "M42",
  "material_usage": ["metal", "profile", "solid"],
  "width_mm": "27",
  "thickness_mm": "0.90",
  "tooth_pitch": ["3/4 TPI", "4/6 TPI", "5/8 TPI", "6/10 TPI"],
  "custom_length_enabled": true,
  "min_length_mm": 1000,
  "max_length_mm": 15000,
  "price_calculation_type": "per_meter",
  "welding_cost": 90,
  "product_type": "blade",
  "long_description": "M42 kalite şerit testerelerimiz, yüksek kaliteli HSS (Co %8) ...",
  "applications": [
    "Yapısal çelikler ve profiller",
    "İnce ve kalın etli çelik borular",
    "Düşük alaşımlı dolu çelik malzemeler"
  ],
  "technical_features": [
    "IDEAL marka makinelerde kusursuz kaynak garantisi",
    "Isıl işlemli HSS M42 dişler ile maksimum körelme mukavemeti",
    "Gelişmiş değişken diş adımı (Vario) tasarımı"
  ],
  "is_best_seller": true,
  "best_seller_rank": 1,
  "rating": 4.9,
  "reviews_count": 312,
  "sold_count": "5.200",
  "seo_title": "M42 Bi-Metal Şerit Testere | Premium Kalite",
  "seo_description": "Metal kesimi için yüksek performanslı M42 bi-metal şerit testere. Özel uzunlukta kaynak garantili."
}
```

## 10. Makine Ürünü (Kraken)

Makine ürünleri için variant matrisi kullanma, tek variant yeterli:
- Title: `Kraken Professional Şerit Testere Makinesi`
- Handle: `kraken-machine`
- Price: 48.500 TRY
- **Metadata:**
  ```json
  {
    "product_type": "machine",
    "custom_length_enabled": false,
    "price_calculation_type": "fixed",
    "long_description": "Kraken endüstriyel şerit testere makinesi ...",
    "applications": ["Profil ve metal lama kesimi", "Mobilya tomruk dilimleme"],
    "technical_features": ["2.2 kW motor", "350 mm volan", "Lazer kılavuz"]
  }
  ```

## 11. Hızlı Doğrulama

Backend ve frontend ayakta iken:

```powershell
# Frontend (testerestore/)
npm run dev
```

- <http://localhost:3000> → Premium Catalog ve Best Sellers Medusa'dan veri çekmeli
- <http://localhost:3000/products/bimetal-premium> → Configurator Medusa variant'larından width/thickness/TPI üretmeli
- Sepete ekle → Admin → Carts içinde görünür olmalı

## 12. Üretim Notları

- Frontend ortam değişkeni `NEXT_PUBLIC_SITE_URL` ekle (örn. `https://testerestore.com`) — SEO/OG image için
- Stripe vs ödeme provider için: <https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe>
- File storage için MinIO/S3 modülü: <https://docs.medusajs.com/resources/architectural-modules/file>

## 13. Sorun Giderme

- `401 Unauthorized` → Publishable key eksik veya yanlış sales channel'a bağlı
- `Cannot read calculated_price` → Region/currency ayarı yapılmamış
- Variant bulunamıyor → Option title'lar (`Genişlik`, `Kalınlık`, `Diş Adımı`) tıpa tıp uyumlu olmalı
- Görsel yüklenmiyor → `next.config.ts` içindeki `remotePatterns` listesine backend hostname'i ekleyin
