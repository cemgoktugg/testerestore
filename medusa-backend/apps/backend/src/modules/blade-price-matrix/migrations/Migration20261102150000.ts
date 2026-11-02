import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 8 mm satırları Uddeholm için girildi, ama "Yeni Satır" formu tablo filtresini
 * yok sayıp Bi-Metal ile açıldığından bi-metal'e yazıldı. Bi-metal'de 8 mm
 * yoktur: satırlar fiyatlarıyla woodcut'a taşınır, woodcut'ta aynı diş zaten
 * varsa bi-metal'deki kopya silinir.
 */
export class Migration20261102150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      do $$
      begin
        -- Temiz kurulumda tablo henüz yok.
        if to_regclass('blade_price') is null then
          return;
        end if;

        update "blade_price" b
        set "blade_type" = 'woodcut', "updated_at" = now()
        where b."blade_type" = 'bi-metal' and b."width_mm" = 8 and b."deleted_at" is null
          and not exists (
            select 1 from "blade_price" w
            where w."blade_type" = 'woodcut' and w."deleted_at" is null
              and w."width_mm" = b."width_mm" and w."thickness_mm" = b."thickness_mm"
              and coalesce(w."tooth_pitch", '') = coalesce(b."tooth_pitch", '')
          );

        update "blade_price"
        set "deleted_at" = now()
        where "blade_type" = 'bi-metal' and "width_mm" = 8 and "deleted_at" is null;
      end $$;
    `);
  }

  override async down(): Promise<void> {
    // Veri düzeltmesi: geri alınmaz (bi-metal'de 8 mm hiç olmamalıydı).
  }
}
