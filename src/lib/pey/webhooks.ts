import { Webhook } from "standardwebhooks";

export interface PeyWebhookHeaders {
  readonly "webhook-id"?: string | null;
  readonly "webhook-timestamp"?: string | null;
  readonly "webhook-signature"?: string | null;
}

export interface SanitizedPayerMetadata {
  readonly clabeLast4?: string;
  readonly bankCode?: number;
}

export interface ParsedPeyPaymentWebhook {
  readonly webhookId: string;
  readonly transactionId: string;
  readonly codiQrId?: string;
  readonly numRef?: string;
  readonly amount?: number;
  readonly type: string;
  readonly datePaid?: number;
  readonly payer: SanitizedPayerMetadata;
  readonly orderId?: string;
}

const CLABE_DIGITS = 18;

export function extractClabeLast4(clabe: unknown): string | undefined {
  if (typeof clabe !== "string") {
    return undefined;
  }
  const digits = clabe.replace(/\D/g, "");
  if (digits.length < 4) {
    return undefined;
  }
  return digits.slice(-4);
}

export function extractBankCode(metadata: Record<string, unknown>): number | undefined {
  const bankCode = metadata.bankCode ?? metadata.bank_code;
  if (typeof bankCode === "number" && Number.isFinite(bankCode)) {
    return bankCode;
  }
  if (typeof bankCode === "string" && bankCode.trim() !== "") {
    const parsed = Number(bankCode);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function sanitizePayerMetadata(
  metadata: unknown,
): SanitizedPayerMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const record = metadata as Record<string, unknown>;
  const clabe = record.clabe;
  if (typeof clabe === "string" && clabe.replace(/\D/g, "").length === CLABE_DIGITS) {
    return {
      clabeLast4: extractClabeLast4(clabe),
      bankCode: extractBankCode(record),
    };
  }
  return {
    clabeLast4: extractClabeLast4(clabe),
    bankCode: extractBankCode(record),
  };
}

export function assertNoFullClabeInPayload(payload: unknown): void {
  const json = JSON.stringify(payload);
  const clabePattern = /\b\d{18}\b/g;
  const matches = json.match(clabePattern);
  if (!matches) {
    return;
  }
  for (const match of matches) {
    if (!json.includes(`"clabe":"${match}"`) && !json.includes(`"clabe": "${match}"`)) {
      continue;
    }
    throw new Error("CLABE completa detectada en payload sanitizado");
  }
}

function getWebhookSecret(): string {
  const secret = process.env.PEY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("PEY_WEBHOOK_SECRET no configurada");
  }
  return secret;
}

export function verifyPeyWebhook(
  rawBody: string,
  headers: PeyWebhookHeaders,
): void {
  const webhookId = headers["webhook-id"];
  const webhookTimestamp = headers["webhook-timestamp"];
  const webhookSignature = headers["webhook-signature"];

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw new Error("Faltan cabeceras Standard Webhooks");
  }

  const wh = new Webhook(getWebhookSecret());
  wh.verify(rawBody, {
    "webhook-id": webhookId,
    "webhook-timestamp": webhookTimestamp,
    "webhook-signature": webhookSignature,
  });
}

export function parsePaymentWebhook(
  rawBody: string,
  webhookId: string,
): ParsedPeyPaymentWebhook {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error("Cuerpo de webhook no es JSON válido");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Webhook sin cuerpo de objeto");
  }

  const body = parsed as Record<string, unknown>;
  const transactionId =
    typeof body.transactionId === "string"
      ? body.transactionId
      : typeof body.transaction_id === "string"
        ? body.transaction_id
        : undefined;

  if (!transactionId) {
    throw new Error("Webhook sin transactionId");
  }

  const type = typeof body.type === "string" ? body.type : "unknown";
  const metadata = body.metadata;
  const payer = sanitizePayerMetadata(metadata);

  const external =
    body.externalMetadata && typeof body.externalMetadata === "object"
      ? (body.externalMetadata as Record<string, unknown>)
      : body.external_metadata && typeof body.external_metadata === "object"
        ? (body.external_metadata as Record<string, unknown>)
        : undefined;

  const orderId =
    external && typeof external.orderId === "string"
      ? external.orderId
      : typeof body.orderId === "string"
        ? body.orderId
        : undefined;

  return {
    webhookId,
    transactionId,
    codiQrId:
      typeof body.codiQrId === "string"
        ? body.codiQrId
        : typeof body.codi_qr_id === "string"
          ? body.codi_qr_id
          : undefined,
    numRef: typeof body.numRef === "string" ? body.numRef : undefined,
    amount: typeof body.amount === "number" ? body.amount : undefined,
    type,
    datePaid:
      typeof body.datePaid === "number"
        ? body.datePaid
        : typeof body.date_paid === "number"
          ? body.date_paid
          : undefined,
    payer,
    orderId,
  };
}

export function isPaymentReceivedType(type: string): boolean {
  return (
    type === "codi.qr.payment_received" ||
    type === "codi.pn.payment_received" ||
    type.includes("payment_received")
  );
}
