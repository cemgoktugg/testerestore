import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260616103422 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_review" ("id" text not null, "product_id" text not null, "customer_id" text null, "author_name" text not null, "is_verified_purchase" boolean not null default false, "rating" integer not null, "title" text null, "body" text not null, "is_approved" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_deleted_at" ON "product_review" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_review" cascade;`);
  }

}
