import type { GotPayCharge } from "@/types/gotpay";

import {
  loadStoreSnapshot,
  persistStoreSnapshot,
  type ProcessedWebhookRecord,
  type StoreSnapshot,
} from "@/lib/db/persistence";

export interface ChargesSummary {
  readonly paidCount: number;
  readonly paidTotalMxn: number;
  readonly pendingCount: number;
  readonly lateCount: number;
}

const charges = new Map<string, GotPayCharge>();
const chargesByNumRef = new Map<string, string>();
const chargesByCodiQrId = new Map<string, string>();
const processedWebhooks = new Map<string, ProcessedWebhookRecord>();
const processedTransactionIds = new Set<string>();

function cloneCharge(charge: GotPayCharge): GotPayCharge {
  return { ...charge };
}

function rebuildIndexesFromCharges(values: Iterable<GotPayCharge>): void {
  chargesByNumRef.clear();
  chargesByCodiQrId.clear();
  for (const charge of values) {
    chargesByNumRef.set(charge.numRef, charge.id);
    if (charge.codiQrId) {
      chargesByCodiQrId.set(charge.codiQrId, charge.id);
    }
  }
}

function hydrateFromDisk(): void {
  const snapshot = loadStoreSnapshot();
  if (!snapshot) {
    return;
  }
  charges.clear();
  processedWebhooks.clear();
  processedTransactionIds.clear();

  for (const charge of snapshot.charges) {
    charges.set(charge.id, Object.freeze(cloneCharge(charge)));
  }
  rebuildIndexesFromCharges(charges.values());

  for (const record of snapshot.processedWebhooks) {
    processedWebhooks.set(record.webhookId, record);
  }
  for (const txnId of snapshot.processedTransactionIds) {
    processedTransactionIds.add(txnId);
  }
}

function flushToDisk(): void {
  const snapshot: StoreSnapshot = {
    version: 1,
    charges: [...charges.values()].map(cloneCharge),
    processedWebhooks: [...processedWebhooks.values()],
    processedTransactionIds: [...processedTransactionIds],
  };
  persistStoreSnapshot(snapshot);
}

hydrateFromDisk();

export function saveCharge(charge: GotPayCharge): GotPayCharge {
  const frozen = Object.freeze(cloneCharge(charge));
  charges.set(frozen.id, frozen);
  chargesByNumRef.set(frozen.numRef, frozen.id);
  if (frozen.codiQrId) {
    chargesByCodiQrId.set(frozen.codiQrId, frozen.id);
  }
  flushToDisk();
  return frozen;
}

export function getChargeById(id: string): GotPayCharge | undefined {
  const charge = charges.get(id);
  return charge ? cloneCharge(charge) : undefined;
}

export function findChargeByNumRef(numRef: string): GotPayCharge | undefined {
  const id = chargesByNumRef.get(numRef);
  return id ? getChargeById(id) : undefined;
}

export function findChargeByCodiQrId(
  codiQrId: string,
): GotPayCharge | undefined {
  const id = chargesByCodiQrId.get(codiQrId);
  return id ? getChargeById(id) : undefined;
}

export function listRecentCharges(limit = 50): GotPayCharge[] {
  return [...charges.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map(cloneCharge);
}

export function computeChargesSummary(): ChargesSummary {
  let paidCount = 0;
  let paidTotalMxn = 0;
  let pendingCount = 0;
  let lateCount = 0;

  for (const charge of charges.values()) {
    switch (charge.status) {
      case "PAID":
        paidCount += 1;
        paidTotalMxn += charge.amount;
        break;
      case "PENDING":
      case "CREATED":
        pendingCount += 1;
        break;
      case "PAID_LATE":
        lateCount += 1;
        paidTotalMxn += charge.amount;
        break;
      case "EXPIRED":
      case "CANCELLED":
        break;
      default: {
        const exhaustive: never = charge.status;
        void exhaustive;
      }
    }
  }

  return { paidCount, paidTotalMxn, pendingCount, lateCount };
}

export function wasWebhookProcessed(webhookId: string): boolean {
  return processedWebhooks.has(webhookId);
}

export function wasTransactionProcessed(transactionId: string): boolean {
  return processedTransactionIds.has(transactionId);
}

export function markWebhookProcessed(
  webhookId: string,
  transactionId: string,
): void {
  processedWebhooks.set(webhookId, {
    webhookId,
    transactionId,
    processedAt: Date.now(),
  });
  processedTransactionIds.add(transactionId);
  flushToDisk();
}

/** Solo para pruebas automatizadas. */
export function __resetStoreForTests(): void {
  charges.clear();
  chargesByNumRef.clear();
  chargesByCodiQrId.clear();
  processedWebhooks.clear();
  processedTransactionIds.clear();
}

export function chargeContainsFullClabe(charge: GotPayCharge): boolean {
  const serialized = JSON.stringify(charge);
  return /\b\d{18}\b/.test(serialized);
}