import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260601134419 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "hero_slide" ("id" text not null, "badge" text not null, "badge_icon" text not null default 'zap', "title_prefix" text not null, "title_suffix" text null, "highlight" text not null, "description" text not null, "image_url" text not null, "primary_cta_label" text not null, "primary_cta_href" text not null, "secondary_cta_label" text null, "secondary_cta_href" text null, "accent" text null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hero_slide_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hero_slide_deleted_at" ON "hero_slide" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hero_slide" cascade;`);
  }

}
