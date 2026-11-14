import { Pool, type PoolClient, type QueryResultRow } from "pg";

import type { ChargesSummary } from "@/lib/db/store-file";
import type {
  ChargeChannel,
  ChargeStatus,
  GotPayCharge,
} from "@/types/gotpay";

/**
 * Adaptador Postgres (Supabase) del store de GotPay.
 * Solo servidor: usa SUPABASE_DB_URL (rol de mínimo privilegio `gotpay_server`,
 * vía pooler de Supabase en modo transacción). Nunca exponer con NEXT_PUBLIC_.
 */

interface ChargeRow extends QueryResultRow {
  id: string;
  num_ref: string;
  codi_qr_id: string | null;
  amount: string;
  concept: string;
  channel: string;
  status: string;
  qr_data: string | null;
  payer_phone_masked: string | null;
  transaction_id: string | null;
  bank_code: number | null;
  clabe_last4: string | null;
  tracking_key: string | null;
  expires_at: string;
  created_at: string;
  paid_at: string | null;
  updated_at: Date;
}

export interface ChargeChange {
  readonly charge: GotPayCharge;
  readonly updatedAt: Date;
}

const CHARGE_COLUMNS =
  "id, num_ref, codi_qr_id, amount, concept, channel, status, qr_data, payer_phone_masked, transaction_id, bank_code, clabe_last4, tracking_key, expires_at, created_at, paid_at, updated_at";

let pool: Pool | undefined;

function getPool(): Pool {
  if (pool) {
    return pool;
  }
  const connectionString = process.env.SUPABASE_DB_URL?.trim();
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL no configurada en el servidor");
  }
  pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: { rejectUnauthorized: false },
  });
  pool.on("error", () => {
    // El pooler puede cerrar conexiones ociosas; la siguiente consulta reconecta.
  });
  return pool;
}

async function query<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, values as unknown[]);
  return result.rows;
}

function optionalString(value: string | null): string | undefined {
  return value ?? undefined;
}

function optionalNumber(value: string | number | null): number | undefined {
  return value === null ? undefined : Number(value);
}

function rowToCharge(row: ChargeRow): GotPayCharge {
  const charge: GotPayCharge = {
    id: row.id,
    numRef: row.num_ref,
    amount: Number(row.amount),
    concept: row.concept,
    channel: row.channel as ChargeChannel,
    status: row.status as ChargeStatus,
    expiresAt: Number(row.expires_at),
    createdAt: Number(row.created_at),
    codiQrId: optionalString(row.codi_qr_id),
    qrData: optionalString(row.qr_data),
    payerPhoneMasked: optionalString(row.payer_phone_masked),
    transactionId: optionalString(row.transaction_id),
    bankCode: optionalNumber(row.bank_code),
    clabeLast4: optionalString(row.clabe_last4),
    trackingKey: optionalString(row.tracking_key),
    paidAt: optionalNumber(row.paid_at),
  };
  return Object.fromEntries(
    Object.entries(charge).filter(([, v]) => v !== undefined),
  ) as unknown as GotPayCharge;
}

export async function pgSaveCharge(charge: GotPayCharge): Promise<GotPayCharge> {
  const rows = await query<ChargeRow>(
    `insert into gotpay.charges (id, num_ref, codi_qr_id, amount, concept, channel, status, qr_data, payer_phone_masked, transaction_id, bank_code, clabe_last4, tracking_key, expires_at, created_at, paid_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     on conflict (id) do update set
       num_ref = excluded.num_ref, codi_qr_id = excluded.codi_qr_id, amount = excluded.amount,
       concept = excluded.concept, channel = excluded.channel, status = excluded.status,
       qr_data = excluded.qr_data, payer_phone_masked = excluded.payer_phone_masked,
       transaction_id = excluded.transaction_id, bank_code = excluded.bank_code,
       clabe_last4 = excluded.clabe_last4, tracking_key = excluded.tracking_key,
       expires_at = excluded.expires_at, created_at = excluded.created_at, paid_at = excluded.paid_at
     returning ${CHARGE_COLUMNS}`,
    [
      charge.id,
      charge.numRef,
      charge.codiQrId ?? null,
      charge.amount,
      charge.concept,
      charge.channel,
      charge.status,
      charge.qrData ?? null,
      charge.payerPhoneMasked ?? null,
      charge.transactionId ?? null,
      charge.bankCode ?? null,
      charge.clabeLast4 ?? null,
      charge.trackingKey ?? null,
      charge.expiresAt,
      charge.createdAt,
      charge.paidAt ?? null,
    ],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("No se pudo guardar el cobro");
  }
  return rowToCharge(row);
}

async function selectOne(
  where: string,
  value: string,
): Promise<GotPayCharge | undefined> {
  const rows = await query<ChargeRow>(
    `select ${CHARGE_COLUMNS} from gotpay.charges where ${where} = $1 limit 1`,
    [value],
  );
  return rows[0] ? rowToCharge(rows[0]) : undefined;
}

export function pgGetChargeById(id: string): Promise<GotPayCharge | undefined> {
  return selectOne("id", id);
}

export function pgFindChargeByNumRef(
  numRef: string,
): Promise<GotPayCharge | undefined> {
  return selectOne("num_ref", numRef);
}

export function pgFindChargeByCodiQrId(
  codiQrId: string,
): Promise<GotPayCharge | undefined> {
  return selectOne("codi_qr_id", codiQrId);
}

export async function pgListRecentCharges(limit = 50): Promise<GotPayCharge[]> {
  const rows = await query<ChargeRow>(
    `select ${CHARGE_COLUMNS} from gotpay.charges order by created_at desc limit $1`,
    [limit],
  );
  return rows.map(rowToCharge);
}

export async function pgComputeChargesSummary(): Promise<ChargesSummary> {
  const rows = await query<{
    paid_count: string;
    paid_total: string | null;
    pending_count: string;
    late_count: string;
  }>(
    `select
       count(*) filter (where status = 'PAID') as paid_count,
       coalesce(sum(amount) filter (where status in ('PAID','PAID_LATE')), 0) as paid_total,
       count(*) filter (where status in ('PENDING','CREATED')) as pending_count,
       count(*) filter (where status = 'PAID_LATE') as late_count
     from gotpay.charges`,
  );
  const row = rows[0];
  return {
    paidCount: Number(row?.paid_count ?? 0),
    paidTotalMxn: Number(row?.paid_total ?? 0),
    pendingCount: Number(row?.pending_count ?? 0),
    lateCount: Number(row?.late_count ?? 0),
  };
}

export async function pgWasWebhookProcessed(webhookId: string): Promise<boolean> {
  const rows = await query(
    "select 1 from gotpay.processed_webhooks where webhook_id = $1 limit 1",
    [webhookId],
  );
  return rows.length > 0;
}

export async function pgWasTransactionProcessed(
  transactionId: string,
): Promise<boolean> {
  const rows = await query(
    "select 1 from gotpay.processed_webhooks where transaction_id = $1 limit 1",
    [transactionId],
  );
  return rows.length > 0;
}

export async function pgMarkWebhookProcessed(
  webhookId: string,
  transactionId: string,
): Promise<void> {
  await query(
    `insert into gotpay.processed_webhooks (webhook_id, transaction_id)
     values ($1, $2) on conflict (webhook_id) do nothing`,
    [webhookId, transactionId],
  );
}

/** Cambios de cobros posteriores a `since` (para SSE por polling en serverless). */
export async function pgListChargeChangesSince(
  since: Date,
  limit = 100,
): Promise<ChargeChange[]> {
  const rows = await query<ChargeRow>(
    `select ${CHARGE_COLUMNS} from gotpay.charges where updated_at > $1 order by updated_at asc limit $2`,
    [since, limit],
  );
  return rows.map((row) => ({ charge: rowToCharge(row), updatedAt: row.updated_at }));
}

export async function pgDatabaseNow(): Promise<Date> {
  const rows = await query<{ now: Date }>("select clock_timestamp() as now");
  return rows[0]?.now ?? new Date();
}

export async function pgPing(): Promise<boolean> {
  let client: PoolClient | undefined;
  try {
    client = await getPool().connect();
    await client.query("select 1 from gotpay.charges limit 1");
    return true;
  } catch {
    return false;
  } finally {
    client?.release();
  }
}
