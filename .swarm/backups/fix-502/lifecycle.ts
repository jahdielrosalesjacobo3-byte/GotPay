import {
  createCodiPush,
  createCodiQr,
  getCodiQrTransaction,
  maskPhoneForDisplay,
} from "@/lib/pey/client";
import {
  findChargeByCodiQrId,
  findChargeByNumRef,
  getChargeById,
  markWebhookProcessed,
  saveCharge,
  wasTransactionProcessed,
  wasWebhookProcessed,
} from "@/lib/db/store";
import { publishRealtime } from "@/lib/events/bus";
import {
  isPaymentReceivedType,
  parsePaymentWebhook,
  type ParsedPeyPaymentWebhook,
} from "@/lib/pey/webhooks";
import type {
  ChargeStatus,
  CreateChargeRequest,
  GotPayCharge,
  GotPayRealtimeEvent,
} from "@/types/gotpay";
import { ulid } from "ulid";

const DEFAULT_EXPIRATION_SECONDS = 600;

function randomNumRef(): string {
  const n = Math.floor(1_000_000 + Math.random() * 9_000_000);
  return String(n);
}

function transitionStatus(
  current: ChargeStatus,
  next: ChargeStatus,
): ChargeStatus {
  if (current === next) {
    return current;
  }
  switch (current) {
    case "CREATED":
      if (next === "PENDING" || next === "CANCELLED") {
        return next;
      }
      break;
    case "PENDING":
      if (
        next === "PAID" ||
        next === "PAID_LATE" ||
        next === "EXPIRED" ||
        next === "CANCELLED"
      ) {
        return next;
      }
      break;
    case "EXPIRED":
    case "CANCELLED":
      if (next === "PAID_LATE") {
        return next;
      }
      break;
    case "PAID":
    case "PAID_LATE":
      return current;
    default: {
      const exhaustive: never = current;
      void exhaustive;
    }
  }
  return current;
}

function emitChargeEvent(
  type: "charge.created" | "charge.paid" | "charge.paid_late",
  charge: GotPayCharge,
): void {
  switch (type) {
    case "charge.created":
      publishRealtime({ type, charge });
      break;
    case "charge.paid":
      publishRealtime({ type, charge });
      break;
    case "charge.paid_late":
      publishRealtime({ type, charge });
      break;
    default: {
      const exhaustive: never = type;
      void exhaustive;
    }
  }
}

export async function createChargeFromRequest(
  input: CreateChargeRequest,
): Promise<GotPayCharge> {
  const id = ulid();
  const numRef = randomNumRef();
  const now = Date.now();
  const expirationSeconds = input.expirationSeconds ?? DEFAULT_EXPIRATION_SECONDS;
  const expiresAt = now + expirationSeconds * 1000;

  let draft: GotPayCharge = {
    id,
    numRef,
    amount: input.amount,
    concept: input.concept,
    channel: input.channel,
    status: "CREATED",
    expiresAt,
    createdAt: now,
  };

  draft = saveCharge(draft);

  if (input.channel === "CODI_QR") {
    const peyQr = await createCodiQr({
      amount: input.amount,
      concept: input.concept,
      numRef,
      expiration: expirationSeconds,
      externalMetadata: { orderId: id },
    });
    draft = saveCharge({
      ...draft,
      status: "PENDING",
      codiQrId: peyQr.codiQrId,
      qrData: peyQr.qrPayload,
    });
  } else {
    if (!input.phone) {
      throw new Error("phone requerido para CODI_PUSH");
    }
    const peyPush = await createCodiPush({
      amount: input.amount,
      concept: input.concept,
      numRef,
      phone: input.phone,
      expiration: expirationSeconds,
      externalMetadata: { orderId: id },
    });
    draft = saveCharge({
      ...draft,
      status: "PENDING",
      codiQrId: peyPush.codiPnId,
      payerPhoneMasked: maskPhoneForDisplay(input.phone),
    });
  }

  emitChargeEvent("charge.created", draft);
  return draft;
}

function resolvePaidStatus(charge: GotPayCharge): "PAID" | "PAID_LATE" {
  const now = Date.now();
  if (
    charge.status === "EXPIRED" ||
    charge.status === "CANCELLED" ||
    now > charge.expiresAt
  ) {
    return "PAID_LATE";
  }
  if (charge.status === "PENDING" || charge.status === "CREATED") {
    return "PAID";
  }
  return "PAID_LATE";
}

function applyPaymentToCharge(
  charge: GotPayCharge,
  payment: ParsedPeyPaymentWebhook,
): { charge: GotPayCharge; eventType: "charge.paid" | "charge.paid_late" | null } {
  const targetStatus = resolvePaidStatus(charge);
  const paidAt = payment.datePaid
    ? payment.datePaid * 1000
    : Date.now();

  const updated: GotPayCharge = saveCharge({
    ...charge,
    status: transitionStatus(charge.status, targetStatus),
    transactionId: payment.transactionId,
    bankCode: payment.payer.bankCode ?? charge.bankCode,
    clabeLast4: payment.payer.clabeLast4 ?? charge.clabeLast4,
    paidAt,
    trackingKey: payment.transactionId,
  });

  if (updated.status === charge.status && charge.status === "PAID") {
    return { charge: updated, eventType: null };
  }
  if (updated.status === "PAID") {
    return { charge: updated, eventType: "charge.paid" };
  }
  if (updated.status === "PAID_LATE") {
    return { charge: updated, eventType: "charge.paid_late" };
  }
  return { charge: updated, eventType: null };
}

export interface WebhookProcessResult {
  readonly duplicate: boolean;
  readonly charge?: GotPayCharge;
  readonly emitted: boolean;
}

export function processPeyPaymentWebhook(
  payment: ParsedPeyPaymentWebhook,
): WebhookProcessResult {
  if (!isPaymentReceivedType(payment.type)) {
    return { duplicate: false, emitted: false };
  }

  if (wasWebhookProcessed(payment.webhookId)) {
    return { duplicate: true, emitted: false };
  }
  if (wasTransactionProcessed(payment.transactionId)) {
    markWebhookProcessed(payment.webhookId, payment.transactionId);
    return { duplicate: true, emitted: false };
  }

  let charge: GotPayCharge | undefined;
  if (payment.orderId) {
    charge = getChargeById(payment.orderId);
  }
  if (!charge && payment.numRef) {
    charge = findChargeByNumRef(payment.numRef);
  }
  if (!charge && payment.codiQrId) {
    charge = findChargeByCodiQrId(payment.codiQrId);
  }

  if (!charge) {
    markWebhookProcessed(payment.webhookId, payment.transactionId);
    return { duplicate: false, emitted: false };
  }

  const { charge: updated, eventType } = applyPaymentToCharge(charge, payment);
  markWebhookProcessed(payment.webhookId, payment.transactionId);

  if (eventType) {
    emitChargeEvent(eventType, updated);
    return { duplicate: false, charge: updated, emitted: true };
  }

  return { duplicate: false, charge: updated, emitted: false };
}

export function parseAndProcessPeyWebhook(
  rawBody: string,
  webhookId: string,
): WebhookProcessResult {
  const payment = parsePaymentWebhook(rawBody, webhookId);
  return processPeyPaymentWebhook(payment);
}

export async function reconcileCharge(
  chargeId: string,
): Promise<{ charge: GotPayCharge; reconciled: boolean }> {
  const charge = getChargeById(chargeId);
  if (!charge) {
    throw new Error("Cobro no encontrado");
  }
  if (!charge.codiQrId || charge.channel !== "CODI_QR") {
    return { charge, reconciled: false };
  }

  const tx = await getCodiQrTransaction(charge.codiQrId);
  const record =
    tx && typeof tx === "object" ? (tx as Record<string, unknown>) : {};
  const status =
    typeof record.status === "string"
      ? record.status
      : typeof record.state === "string"
        ? record.state
        : "";

  const paid =
    status.toLowerCase().includes("paid") ||
    status.toLowerCase().includes("completed") ||
    record.paid === true;

  if (!paid) {
    return { charge, reconciled: false };
  }

  const transactionId =
    typeof record.transactionId === "string"
      ? record.transactionId
      : typeof record.id === "string"
        ? record.id
        : undefined;

  if (transactionId && wasTransactionProcessed(transactionId)) {
    const current = getChargeById(chargeId) ?? charge;
    return { charge: current, reconciled: false };
  }

  const payment: ParsedPeyPaymentWebhook = {
    webhookId: `reconcile-${ulid()}`,
    transactionId: transactionId ?? `reconcile-txn-${ulid()}`,
    codiQrId: charge.codiQrId,
    numRef: charge.numRef,
    amount: charge.amount,
    type: "codi.qr.payment_received",
    datePaid: Math.floor(Date.now() / 1000),
    payer: {},
    orderId: charge.id,
  };

  const result = processPeyPaymentWebhook(payment);
  const updated = result.charge ?? getChargeById(chargeId) ?? charge;
  return { charge: updated, reconciled: result.emitted };
}

export function cancelCharge(chargeId: string): GotPayCharge {
  const charge = getChargeById(chargeId);
  if (!charge) {
    throw new Error("Cobro no encontrado");
  }
  if (charge.status !== "PENDING" && charge.status !== "CREATED") {
    return charge;
  }
  const updated = saveCharge({
    ...charge,
    status: transitionStatus(charge.status, "CANCELLED"),
  });
  return updated;
}