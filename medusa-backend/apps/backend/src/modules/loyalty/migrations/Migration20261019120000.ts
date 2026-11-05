import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261019120000 extends Migration {
  override async up(): Promise<void> {
    // Geçmişteki çift bakiyeleri sessizce birleştirme. Eskiden burada hata
    // fırlatılıyordu; backend açılışta `db:migrate && start` çalıştığı için tek
    // bir çift kayıt siteyi tamamen kapatırdı. Artık çift varsa yalnızca bu
    // benzersizlik indeksi atlanır ve günlüğe uyarı düşer; kayıtlar elle
    // birleştirildikten sonra indeks aynı komutla elle kurulabilir.
    this.addSql(`do $$ begin if exists (select customer_id from loyalty_account where deleted_at is null group by customer_id having count(*) > 1) then raise warning 'loyalty_account: aynı müşteriye ait birden fazla hesap var; IDX_loyalty_account_customer kurulmadı, kayıtları birleştirip indeksi elle kurun'; else create unique index if not exists "IDX_loyalty_account_customer" on loyalty_account (customer_id) where deleted_at is null; end if; end $$;`);
    this.addSql(`alter table loyalty_transaction add column if not exists idempotency_key text null, add column if not exists target_points integer null;`);
    this.addSql(`create unique index if not exists "IDX_loyalty_transaction_key" on loyalty_transaction (idempotency_key) where deleted_at is null;`);
    this.addSql(`create table if not exists loyalty_redemption (id text primary key, customer_id text not null, request_key text not null, points integer not null check (points > 0), code text not null, promotion_id text null, status text not null default 'draft' check (status in ('draft','reserved','ready')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz null);`);
    this.addSql(`create unique index if not exists "IDX_loyalty_redemption_request" on loyalty_redemption (customer_id, request_key) where deleted_at is null;`);
    this.addSql(`create unique index if not exists "IDX_loyalty_redemption_code" on loyalty_redemption (code) where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_loyalty_redemption_deleted_at" on loyalty_redemption (deleted_at) where deleted_at is null;`);
  }
  override async down(): Promise<void> {
    // Preserve ledger/redemption records on rollback; only remove the new constraints.
    this.addSql(`drop index if exists "IDX_loyalty_account_customer";`);
    this.addSql(`drop index if exists "IDX_loyalty_transaction_key";`);
  }
}
