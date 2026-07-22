import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260602063333 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "footer_feature" ("id" text not null, "icon" text not null default 'truck', "title" text not null, "description" text not null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "footer_feature_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_footer_feature_deleted_at" ON "footer_feature" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "footer_link_group" ("id" text not null, "title" text not null, "links" jsonb not null default '[]', "sort_order" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "footer_link_group_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_footer_link_group_deleted_at" ON "footer_link_group" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "footer_setting" ("id" text not null, "company_description" text not null, "contact_phone" text null, "contact_email" text null, "contact_address" text null, "copyright_text" text null, "legal_links" jsonb not null default '[]', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "footer_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_footer_setting_deleted_at" ON "footer_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "footer_feature" cascade;`);

    this.addSql(`drop table if exists "footer_link_group" cascade;`);

    this.addSql(`drop table if exists "footer_setting" cascade;`);
  }

}
