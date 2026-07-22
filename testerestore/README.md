# TestereStore — Premium Şerit Testere E-Ticaret

Next.js 16 + React 19 + Tailwind 4 üzerinde, **MedusaJS v2** ile entegre, şerit testereye özel parametrik e-ticaret frontend.

## Hızlı Başlangıç

```powershell
npm install
copy .env.example .env.local
# .env.local içine Medusa publishable key gir
npm run dev
```

Tarayıcı: <http://localhost:3000>

## Medusa Backend

Backend henüz yoksa **[medusa-backend/SETUP.md](./medusa-backend/SETUP.md)** kılavuzunu sırayla uygulayın.

Backend olmadan da frontend ÇALIŞIR — Medusa bağlantısı kurulmamışsa demo verisi kullanılır. Bu sayede tasarımı görmek için sıfır kurulum yeterlidir.

## Mimari Özet

```
testerestore/
├── app/                          ← Next.js 16 App Router
│   ├── page.tsx                  ← Anasayfa (HeroSlider + PremiumCatalog + BestSellers)
│   ├── products/[id]/page.tsx    ← Parametrik ürün detayı + variant configurator
│   ├── products/[id]/layout.tsx  ← Server-side metadata + JSON-LD
│   ├── cart/page.tsx             ← Medusa-aware sepet
│   ├── checkout/page.tsx         ← Adres/ödeme formu (Medusa cart update)
│   ├── context/CartContext.tsx   ← Medusa cart + legacy fallback
│   └── components/               ← Premium UI bileşenleri
├── lib/
│   ├── medusa/                   ← Tüm Medusa entegrasyonu burada
│   │   ├── config.ts             ← env okuma + MEDUSA_READY flag
│   │   ├── client.ts             ← @medusajs/js-sdk singleton
│   │   ├── types.ts              ← BladeProductMetadata + option title sabitleri
│   │   ├── format.ts             ← price/image helper'ları
│   │   ├── pricing.ts            ← Parametrik fiyat hesabı (per-meter + welding)
│   │   ├── variants.ts           ← Width×Thickness×TPI option matrix + variant resolver
│   │   ├── seo.ts                ← Metadata + JSON-LD üreteci
│   │   ├── services/             ← products/categories/cart/region
│   │   └── hooks/                ← useProducts, useProduct, useCategories, useAsync
│   ├── content-config.ts         ← Hero/CTA/section başlıkları (admin'e taşınmaya hazır)
│   ├── demo-products.ts          ← Fallback liste (Medusa yokken)
│   └── product-details-fallback.ts ← Fallback detay (Medusa yokken)
└── medusa-backend/               ← Backend kurulum + seed dosyaları
```

## Parametrik Fiyat Modeli

Her ürün için Medusa Admin'de:

1. **Options:** `Genişlik`, `Kalınlık`, `Diş Adımı` (isimler tıpa tıp olmalı)
2. **Variants:** her kombinasyon ayrı variant — fiyatı **metre başına** TRY
3. **Product metadata:**
   ```json
   { "price_calculation_type": "per_meter", "welding_cost": 90, "custom_length_enabled": true, "min_length_mm": 1000, "max_length_mm": 15000 }
   ```

Frontend hesabı: `total = ((length_mm / 1000) × variant_price + welding_cost) × quantity × discount_tier`

Detaylar: [lib/medusa/pricing.ts](./lib/medusa/pricing.ts), [lib/medusa/variants.ts](./lib/medusa/variants.ts)

## Ortam Değişkenleri

| Değişken | Açıklama |
|---|---|
| `MEDUSA_BACKEND_URL` | Server-side (SSR/route handler) |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Client-side (browser fetch) |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_xxx` — Medusa Admin → Settings → Publishable API Keys |
| `NEXT_PUBLIC_DEFAULT_REGION` | ISO ülke kodu, varsayılan `tr` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | ISO currency, varsayılan `try` |
| `NEXT_PUBLIC_SITE_URL` | OG image base URL (üretim için) |

## SEO

- Layout'ta global metadata (`app/layout.tsx`)
- Ürün sayfasında `generateMetadata` (`app/products/[id]/layout.tsx`)
- JSON-LD Product schema her ürün sayfasında inline enjekte
- Open Graph + Twitter Card

## Komutlar

```powershell
npm run dev       # geliştirme
npm run build     # üretim derlemesi
npm run lint      # ESLint
npm start         # üretim sunucusu
```

## Notlar

- **Tasarım korunmuştur** — Medusa entegrasyonu UI'a sadece veri pompalar, görsel hiyerarşi değiştirilmemiştir.
- Medusa olmadan demo modunda çalışmaya devam eder; konvansiyonlardan sapmak isterseniz `lib/medusa/types.ts`'deki sabitleri ve `pricing.ts` mantığını gözden geçirin.
