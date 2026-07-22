import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260616133659 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "site_seo" ("id" text not null, "site_name" text not null default 'Testere Store', "default_title" text not null, "title_template" text not null default '%s | Testere Store', "default_description" text not null, "default_keywords" text null, "default_og_image" text null, "twitter_handle" text null, "facebook_url" text null, "instagram_url" text null, "linkedin_url" text null, "youtube_url" text null, "google_site_verification" text null, "yandex_site_verification" text null, "bing_site_verification" text null, "robots_default" text not null default 'index, follow', "canonical_base_url" text null, "default_locale" text not null default 'tr_TR', "page_overrides" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "site_seo_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_site_seo_deleted_at" ON "site_seo" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "site_seo" cascade;`);
  }

}
