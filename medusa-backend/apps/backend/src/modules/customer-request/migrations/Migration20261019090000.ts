import { Migration } from "@medusajs/framework/mikro-orm/migrations";
export class Migration20261019090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "customer_request" ("id" text not null, "request_number" text not null, "request_key" text not null, "kind" text not null, "status" text not null default 'new', "customer_id" text null, "order_id" text null, "name" text not null, "email" text not null, "phone" text null, "topic" text null, "message" text not null, "items" jsonb null, "public_reply" text null, "internal_note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_request_number" ON "customer_request" ("request_number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_request_key" ON "customer_request" ("request_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_request_customer_order" ON "customer_request" ("customer_id", "order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_request_open_order" ON "customer_request" ("order_id") WHERE deleted_at IS NULL AND kind IN ('return', 'exchange') AND status <> 'resolved';`);
  }
  override async down(): Promise<void> { this.addSql('drop table if exists "customer_request" cascade;'); }
}
