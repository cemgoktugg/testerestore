import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261102134750 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "dealer_quote" drop constraint if exists "dealer_quote_number_unique";`);
    this.addSql(`create table if not exists "dealer_quote" ("id" text not null, "dealer_id" text not null, "number" integer not null, "status" text not null default 'draft', "note" text null, "sent_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dealer_quote_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dealer_quote_deleted_at" ON "dealer_quote" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dealer_quote_number_unique" ON "dealer_quote" ("number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dealer_quote_dealer_id" ON "dealer_quote" ("dealer_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "dealer_quote_item" ("id" text not null, "quote_id" text not null, "position" integer not null, "kind" text not null, "ref_id" text not null, "title" text not null, "detail" text null, "length_mm" integer null, "quantity" integer not null, "unit_price" numeric not null, "raw_unit_price" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dealer_quote_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dealer_quote_item_deleted_at" ON "dealer_quote_item" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dealer_quote_item_quote_id" ON "dealer_quote_item" ("quote_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "dealer" add column if not exists "logo_data" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "dealer_quote" cascade;`);

    this.addSql(`drop table if exists "dealer_quote_item" cascade;`);

    this.addSql(`alter table if exists "dealer" drop column if exists "logo_data";`);
  }

}
