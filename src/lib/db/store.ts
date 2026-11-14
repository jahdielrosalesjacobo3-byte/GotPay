import * as fileStore from "@/lib/db/store-file";
import {
  pgComputeChargesSummary,
  pgFindChargeByCodiQrId,
  pgFindChargeByNumRef,
  pgGetChargeById,
  pgListRecentCharges,
  pgMarkWebhookProcessed,
  pgSaveCharge,
  pgWasTransactionProcessed,
  pgWasWebhookProcessed,
} from "@/lib/db/store-postgres";
import type { ChargesSummary } from "@/lib/db/store-file";
import type { GotPayCharge } from "@/types/gotpay";

/**
 * Fachada asíncrona del store. GOTPAY_STORE=supabase usa Postgres (Supabase);
 * cualquier otro valor (por defecto "file") usa memoria + .data/gotpay.json.
 */
export type StoreMode = "file" | "supabase";

export type { ChargesSummary };

export function getStoreMode(): StoreMode {
  return process.env.GOTPAY_STORE?.trim().toLowerCase() === "supabase"
    ? "supabase"
    : "file";
}

function useSupabase(): boolean {
  return getStoreMode() === "supabase";
}

export async function saveCharge(charge: GotPayCharge): Promise<GotPayCharge> {
  return useSupabase() ? pgSaveCharge(charge) : fileStore.saveCharge(charge);
}

export async function getChargeById(
  id: string,
): Promise<GotPayCharge | undefined> {
  return useSupabase() ? pgGetChargeById(id) : fileStore.getChargeById(id);
}

export async function findChargeByNumRef(
  numRef: string,
): Promise<GotPayCharge | undefined> {
  return useSupabase()
    ? pgFindChargeByNumRef(numRef)
    : fileStore.findChargeByNumRef(numRef);
}

export async function findChargeByCodiQrId(
  codiQrId: string,
): Promise<GotPayCharge | undefined> {
  return useSupabase()
    ? pgFindChargeByCodiQrId(codiQrId)
    : fileStore.findChargeByCodiQrId(codiQrId);
}

export async function listRecentCharges(limit = 50): Promise<GotPayCharge[]> {
  return useSupabase()
    ? pgListRecentCharges(limit)
    : fileStore.listRecentCharges(limit);
}

export async function computeChargesSummary(): Promise<ChargesSummary> {
  return useSupabase()
    ? pgComputeChargesSummary()
    : fileStore.computeChargesSummary();
}

export async function wasWebhookProcessed(webhookId: string): Promise<boolean> {
  return useSupabase()
    ? pgWasWebhookProcessed(webhookId)
    : fileStore.wasWebhookProcessed(webhookId);
}

export async function wasTransactionProcessed(
  transactionId: string,
): Promise<boolean> {
  return useSupabase()
    ? pgWasTransactionProcessed(transactionId)
    : fileStore.wasTransactionProcessed(transactionId);
}

export async function markWebhookProcessed(
  webhookId: string,
  transactionId: string,
): Promise<void> {
  if (useSupabase()) {
    await pgMarkWebhookProcessed(webhookId, transactionId);
    return;
  }
  fileStore.markWebhookProcessed(webhookId, transactionId);
}

/** Solo para pruebas automatizadas (store en memoria). */
export function __resetStoreForTests(): void {
  fileStore.__resetStoreForTests();
}

export function chargeContainsFullClabe(charge: GotPayCharge): boolean {
  return fileStore.chargeContainsFullClabe(charge);
}
