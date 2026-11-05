import { Migration } from "@medusajs/framework/mikro-orm/migrations";
export class Migration20261019091000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "newsletter_subscription" add column if not exists "confirmation_nonce" text null, add column if not exists "consent_requested_at" timestamptz null, add column if not exists "confirmation_sent_at" timestamptz null, add column if not exists "confirmed_at" timestamptz null, add column if not exists "unsubscribed_at" timestamptz null, add column if not exists "consent_text_version" text null;`);
    this.addSql(`alter table "newsletter_subscription" alter column "is_active" set default false, alter column "is_confirmed" set default false;`);
    // Do not delete or assert consent for historical subscriptions.
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_newsletter_email" ON "newsletter_subscription" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_newsletter_verified_flow_email" ON "newsletter_subscription" (lower("email")) WHERE deleted_at IS NULL AND confirmation_nonce IS NOT NULL;`);
  }
  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_newsletter_verified_flow_email";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_newsletter_email";`);
    this.addSql(`alter table "newsletter_subscription" drop column if exists "confirmation_nonce", drop column if exists "consent_requested_at", drop column if exists "confirmation_sent_at", drop column if exists "confirmed_at", drop column if exists "unsubscribed_at", drop column if exists "consent_text_version";`);
    this.addSql(`alter table "newsletter_subscription" alter column "is_active" set default true, alter column "is_confirmed" set default true;`);
  }
}
