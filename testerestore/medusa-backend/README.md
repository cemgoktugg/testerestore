# TestereStore — Medusa Backend Yer Tutucu

Bu klasör, frontend ile entegre çalışacak Medusa v2 backend'inin kurulumu için **yer tutucu** olarak hizmet eder. Bu klasördeki dosyalar (henüz) çalışan bir Medusa projesi değildir; Medusa'yı `create-medusa-app` ile aynı kök altında oluşturduktan sonra ihtiyacınız olacak şablon/seed materyallerini içerir.

## Yapı

```
medusa-backend/
├── README.md           ← Buradasınız
├── SETUP.md            ← Adım adım kurulum kılavuzu
├── seed-testere.ts     ← Custom Medusa CLI seed script
└── seed-data/
    ├── categories.json
    └── products.json
```

## Hızlı Başlangıç

1. **[SETUP.md](./SETUP.md)** dosyasını sırayla takip edin.
2. Backend hazır olunca `seed-testere.ts` dosyasını oluşturulan Medusa projesinin `src/scripts/` klasörüne kopyalayın.
3. Seed'i çalıştırın:
   ```powershell
   cd medusa-backend
   npx medusa exec ./src/scripts/seed-testere.ts
   ```
4. Frontend `.env.local` içinde publishable API key'i set edin ve `npm run dev`.

## Frontend Entegrasyon Noktaları

Frontend (kök `testerestore/`) aşağıdaki Medusa konvansiyonlarına bağımlı:

| Yer | Konvansiyon |
|---|---|
| `lib/medusa/types.ts` | Option title'lar: **`Genişlik`**, **`Kalınlık`**, **`Diş Adımı`** |
| `lib/medusa/pricing.ts` | `product.metadata.price_calculation_type` ∈ `"per_meter"\|"fixed"` |
| `lib/medusa/pricing.ts` | `product.metadata.welding_cost` (number) veya `variant.metadata.welding_cost` |
| `lib/medusa/types.ts` | `product.metadata.product_type` ∈ `"blade"\|"machine"` |
| `lib/medusa/services/products.ts` | `metadata.is_best_seller` + `best_seller_rank` ile sıralama |

Bu konvansiyonlardan sapmak için frontend ilgili dosyalarını güncelleyin.
