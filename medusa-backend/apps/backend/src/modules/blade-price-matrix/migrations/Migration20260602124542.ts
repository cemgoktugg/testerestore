import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260602124542 extends Migration {

  override async up(): Promise<void> {
    // Add raw_ jsonb columns required by bigNumber columns. Existing rows
    // (including soft-deleted ones from the previous integer-typed seed)
    // are backfilled with an empty bigNumber payload so the NOT NULL
    // constraint can be enforced. They'll be re-seeded after the migration.
    this.addSql(
      `alter table if exists "blade_price" add column if not exists "raw_width_mm" jsonb not null default '{"value":"0","precision":20}'::jsonb;`
    );
    this.addSql(
      `alter table if exists "blade_price" add column if not exists "raw_thickness_mm" jsonb not null default '{"value":"0","precision":20}'::jsonb;`
    );
    this.addSql(
      `alter table if exists "blade_price" alter column "raw_width_mm" drop default;`
    );
    this.addSql(
      `alter table if exists "blade_price" alter column "raw_thickness_mm" drop default;`
    );
    this.addSql(
      `alter table if exists "blade_price" alter column "width_mm" type numeric using ("width_mm"::numeric);`
    );
    this.addSql(
      `alter table if exists "blade_price" alter column "thickness_mm" type numeric using ("thickness_mm"::numeric);`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "blade_price" drop column if exists "raw_width_mm", drop column if exists "raw_thickness_mm";`);

    this.addSql(`alter table if exists "blade_price" alter column "width_mm" type integer using ("width_mm"::integer);`);
    this.addSql(`alter table if exists "blade_price" alter column "thickness_mm" type integer using ("thickness_mm"::integer);`);
  }

}
