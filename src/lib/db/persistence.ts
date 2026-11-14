import fs from "node:fs";
import path from "node:path";

import type { GotPayCharge } from "@/types/gotpay";

export interface ProcessedWebhookRecord {
  readonly webhookId: string;
  readonly transactionId: string;
  readonly processedAt: number;
}

export interface StoreSnapshot {
  readonly version: 1;
  readonly charges: GotPayCharge[];
  readonly processedWebhooks: ProcessedWebhookRecord[];
  readonly processedTransactionIds: string[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "gotpay.json");
const TEMP_FILE = path.join(DATA_DIR, "gotpay.json.tmp");

export function isFilePersistenceEnabled(): boolean {
  return process.env.VITEST !== "true";
}

export function loadStoreSnapshot(): StoreSnapshot | null {
  if (!isFilePersistenceEnabled()) {
    return null;
  }
  if (!fs.existsSync(DATA_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreSnapshot;
    if (parsed.version !== 1 || !Array.isArray(parsed.charges)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistStoreSnapshot(snapshot: StoreSnapshot): void {
  if (!isFilePersistenceEnabled()) {
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload = `${JSON.stringify(snapshot)}\n`;
  fs.writeFileSync(TEMP_FILE, payload, "utf8");
  fs.renameSync(TEMP_FILE, DATA_FILE);
}

export function clearPersistedStoreForTests(): void {
  if (!isFilePersistenceEnabled()) {
    return;
  }
  if (fs.existsSync(TEMP_FILE)) {
    fs.unlinkSync(TEMP_FILE);
  }
  if (fs.existsSync(DATA_FILE)) {
    fs.unlinkSync(DATA_FILE);
  }
}