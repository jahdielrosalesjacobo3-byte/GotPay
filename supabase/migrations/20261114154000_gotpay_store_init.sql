-- GotPay store (aplicada en el proyecto Supabase «gotpay» vía apply_migration).
create schema if not exists gotpay;
revoke all on schema gotpay from public, anon, authenticated;

create table gotpay.charges (
  id text primary key,
  num_ref text not null unique,
  codi_qr_id text unique,
  amount numeric(12,2) not null check (amount > 0),
  concept text not null,
  channel text not null check (channel in ('CODI_QR','CODI_PUSH','PAYMENT_LINK')),
  status text not null check (status in ('CREATED','PENDING','PAID','EXPIRED','PAID_LATE','CANCELLED')),
  qr_data text,
  payer_phone_masked text,
  transaction_id text,
  bank_code integer,
  clabe_last4 text check (clabe_last4 is null or clabe_last4 ~ '^[0-9]{4}$'),
  tracking_key text,
  expires_at bigint not null,
  created_at bigint not null,
  paid_at bigint,
  updated_at timestamptz not null default clock_timestamp()
);
create index charges_created_at_idx on gotpay.charges (created_at desc);
create index charges_updated_at_idx on gotpay.charges (updated_at);

create or replace function gotpay.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger charges_touch_updated_at before insert or update on gotpay.charges
for each row execute function gotpay.touch_updated_at();

create table gotpay.processed_webhooks (
  webhook_id text primary key,
  transaction_id text not null,
  processed_at timestamptz not null default now()
);
create index processed_webhooks_txn_idx on gotpay.processed_webhooks (transaction_id);

alter table gotpay.charges enable row level security;
alter table gotpay.processed_webhooks enable row level security;
revoke all on all tables in schema gotpay from public, anon, authenticated;
revoke all on function gotpay.touch_updated_at() from public, anon, authenticated;
grant usage on schema gotpay to service_role;
grant select, insert, update, delete on all tables in schema gotpay to service_role;

-- Rol de servidor de mínimo privilegio (la contraseña se fija aparte como verificador
-- SCRAM; nunca se versiona). Se conecta por el pooler: gotpay_server.<project-ref>.
-- create role gotpay_server login noinherit password '<SCRAM-SHA-256 verifier>' connection limit 20;
grant usage on schema gotpay to gotpay_server;
grant select, insert, update on gotpay.charges to gotpay_server;
grant select, insert on gotpay.processed_webhooks to gotpay_server;
create policy gotpay_server_all_charges on gotpay.charges for all to gotpay_server using (true) with check (true);
create policy gotpay_server_all_webhooks on gotpay.processed_webhooks for all to gotpay_server using (true) with check (true);
alter role gotpay_server set search_path = gotpay;
alter role gotpay_server set statement_timeout = '8s';
