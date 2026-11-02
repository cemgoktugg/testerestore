import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Ahşap ailesi iki ayrı ürüne ayrıldı: "woodcut" (Uddeholm) aynen kalır,
 * Spezial Alman Çeliği "spezialstahl" tipine geçer. Ürün sayfası fiyatsız
 * kalmasın diye başlangıç satırları woodcut'tan kopyalanır; fiyatlar sonra
 * admin panelinden ayrı ayrı düzenlenir. Kolon listesi bilerek yazılmadı:
 * canlıda tablo elle kurulmuştu, jsonb_populate_record hepsini taşır.
 */
export class Migration20261102120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      do $$
      begin
        -- İç içe: tablo yokken alttaki sorgular hiç planlanmasın (temiz kurulum).
        if to_regclass('blade_price') is not null then
          if not exists (
            select 1 from "blade_price"
            where "blade_type" = 'spezialstahl' and "deleted_at" is null
          ) then
            insert into "blade_price"
            select (jsonb_populate_record(b, jsonb_build_object(
              'id', 'spezialstahl_' || b."id",
              'blade_type', 'spezialstahl',
              'created_at', now(),
              'updated_at', now()
            ))).*
            from "blade_price" b
            where b."blade_type" = 'woodcut' and b."deleted_at" is null;
          end if;
        end if;
      end $$;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`delete from "blade_price" where "blade_type" = 'spezialstahl';`);
  }
}
