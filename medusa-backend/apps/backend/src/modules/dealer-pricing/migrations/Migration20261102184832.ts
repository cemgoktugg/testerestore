import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261102184832 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "dealer_quote" add column if not exists "accepted_at" timestamptz null, add column if not exists "ordered_at" timestamptz null, add column if not exists "revision" integer not null default 0, add column if not exists "revision_note" text null, add column if not exists "revision_requested_at" timestamptz null;`);

    this.addSql(`alter table if exists "dealer_quote_item" add column if not exists "variant_id" text null, add column if not exists "requested_unit_price" numeric null, add column if not exists "raw_requested_unit_price" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "dealer_quote" drop column if exists "accepted_at", drop column if exists "ordered_at", drop column if exists "revision", drop column if exists "revision_note", drop column if exists "revision_requested_at";`);

    this.addSql(`alter table if exists "dealer_quote_item" drop column if exists "variant_id", drop column if exists "requested_unit_price", drop column if exists "raw_requested_unit_price";`);
  }

}
