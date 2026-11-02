import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261102105532 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "dealer_blade_price" drop constraint if exists "dealer_blade_price_dealer_id_blade_price_id_unique";`);
    this.addSql(`alter table if exists "dealer" drop constraint if exists "dealer_customer_id_unique";`);
    this.addSql(`create table if not exists "dealer" ("id" text not null, "customer_id" text not null, "company_name" text not null, "is_active" boolean not null default true, "customer_group_id" text not null, "price_list_id" text not null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dealer_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dealer_deleted_at" ON "dealer" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dealer_customer_id_unique" ON "dealer" ("customer_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "dealer_blade_price" ("id" text not null, "dealer_id" text not null, "blade_price_id" text not null, "price_per_meter" numeric null, "welding_fee" numeric null, "raw_price_per_meter" jsonb null, "raw_welding_fee" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dealer_blade_price_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dealer_blade_price_deleted_at" ON "dealer_blade_price" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dealer_blade_price_dealer_id_blade_price_id_unique" ON "dealer_blade_price" ("dealer_id", "blade_price_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "dealer" cascade;`);

    this.addSql(`drop table if exists "dealer_blade_price" cascade;`);
  }

}
