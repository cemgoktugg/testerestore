import { z } from "zod";

// Ready-made uzunluk sınırları (mm). Store /calculate ile aynı global aralık:
// 1000 mm alt, 15000 mm üst. Girdi tek tek doğrulanır ki uçuk bir boy
// yanlışlıkla ürün oluşturmasın.
export const MIN_LENGTH_MM = 1000;
export const MAX_LENGTH_MM = 15000;

/**
 * POST /admin/ready-made-products gövdesi.
 *
 * parent_id     → resim + açıklama + kategori kopyalanacak ANA ürün
 * blade_type    → fiyat matrisi ailesi (bi-metal / carbide / …). Ana ürünün
 *                 metadata.blade_type'ı ("M42") matris slug'ıyla ("bi-metal")
 *                 uyuşmadığı için AYRI alan — kullanıcı seçer/onaylar.
 * width/thickness/tooth_pitch → matriste fiyatı tanımlı kombinasyon
 * lengths_mm    → tek seferde birden çok hazır boy (toplu oluşturma)
 */
export const PostReadyMadeSchema = z.object({
  parent_id: z.string().min(1, "Ana ürün seçilmeli"),
  title_prefix: z.string().trim().min(2, "Başlık öneki gerekli"),
  blade_type: z.string().min(1, "Bıçak tipi gerekli"),
  width_mm: z.coerce.number().positive(),
  thickness_mm: z.coerce.number().positive(),
  tooth_pitch: z.string().trim().min(1).nullable().optional(),
  lengths_mm: z
    .array(
      z.coerce
        .number()
        .min(MIN_LENGTH_MM, `En az ${MIN_LENGTH_MM} mm olmalı`)
        .max(MAX_LENGTH_MM, `En fazla ${MAX_LENGTH_MM} mm olmalı`)
    )
    .min(1, "En az bir uzunluk girilmeli"),
  inventory: z.coerce.number().int().nonnegative().optional().default(10),
  // Ana ürünün açıklaması aynen kopyalansın mı (varsayılan: evet)
  copy_description: z.boolean().optional().default(true),
  // Fiyatı matris yerine elle ver (matriste satır yoksa). Boşsa matristen.
  price_override: z.coerce.number().positive().optional(),
});

export type PostReadyMadeBody = z.infer<typeof PostReadyMadeSchema>;
