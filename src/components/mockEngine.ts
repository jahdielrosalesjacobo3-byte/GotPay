import type {
  ChargeStatus,
  CreateChargeRequest,
  GotPayCharge,
} from "@/types/gotpay";

export interface ShiftSummary {
  readonly paidCount: number;
  readonly paidTotalMxn: number;
  readonly pendingCount: number;
  readonly lateCount: number;
}

/**
 * Garantiza privacidad de pagadores (Reglas Sec. 16.4):
 * jamás devuelve más de los últimos 4 dígitos de la CLABE.
 */
export function sanitizeClabeLast4(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) {
    return undefined;
  }
  return digits.slice(-4);
}

/**
 * Enmascara cualquier teléfono para mostrar únicamente ***1234.
 */
export function sanitizeMaskedPhone(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) {
    return "****";
  }
  return `***${digits.slice(-4)}`;
}

export function formatMxn(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getBankShortName(bankCode?: number): string {
  switch (bankCode) {
    case 40012:
      return "BBVA";
    case 40014:
      return "Santander";
    case 40002:
      return "Banamex";
    case 40072:
      return "Banorte";
    case 40127:
      return "Azteca";
    case 40137:
      return "Bancoppel";
    case 40638:
      return "Nu";
    default:
      return bankCode ? `Banco ${bankCode}` : "SPEI/CoDi";
  }
}

export function statusBadgeLabel(status: ChargeStatus): string {
  switch (status) {
    case "CREATED":
      return "Creando";
    case "PENDING":
      return "Esperando pago";
    case "PAID":
      return "Ya cayó";
    case "EXPIRED":
      return "Expirado";
    case "PAID_LATE":
      return "Pago tardío";
    case "CANCELLED":
      return "Cancelado";
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

export function computeSummaryFromCharges(
  charges: ReadonlyArray<GotPayCharge>,
): ShiftSummary {
  let paidCount = 0;
  let paidTotalMxn = 0;
  let pendingCount = 0;
  let lateCount = 0;

  for (const charge of charges) {
    switch (charge.status) {
      case "PAID":
        paidCount += 1;
        paidTotalMxn = Math.round((paidTotalMxn + charge.amount) * 100) / 100;
        break;
      case "PENDING":
      case "CREATED":
        pendingCount += 1;
        break;
      case "PAID_LATE":
        lateCount += 1;
        paidTotalMxn = Math.round((paidTotalMxn + charge.amount) * 100) / 100;
        break;
      case "EXPIRED":
      case "CANCELLED":
        break;
      default: {
        const exhaustiveCheck: never = charge.status;
        void exhaustiveCheck;
      }
    }
  }

  return { paidCount, paidTotalMxn, pendingCount, lateCount };
}

let mockSeq = 104;

const INITIAL_ANCHOR_TS = 1763145600000;

export function createInitialMockCharges(): GotPayCharge[] {
  return [
    {
      id: "01M7DEMO000000000000000103",
      numRef: "1000103",
      amount: 85.5,
      concept: "Orden de 3 tacos + agua",
      channel: "CODI_QR",
      status: "PAID",
      codiQrId: "mock-qr-103",
      transactionId: "tx-mock-103",
      bankCode: 40012,
      clabeLast4: "5713",
      trackingKey: "GOTPAY202611140103",
      createdAt: INITIAL_ANCHOR_TS - 8 * 60 * 1000,
      expiresAt: INITIAL_ANCHOR_TS + 2 * 60 * 1000,
      paidAt: INITIAL_ANCHOR_TS - 7 * 60 * 1000,
    },
    {
      id: "01M7DEMO000000000000000102",
      numRef: "1000102",
      amount: 20,
      concept: "Agua fresca grande",
      channel: "CODI_QR",
      status: "PAID",
      codiQrId: "mock-qr-102",
      transactionId: "tx-mock-102",
      bankCode: 40072,
      clabeLast4: "9042",
      trackingKey: "GOTPAY202611140102",
      createdAt: INITIAL_ANCHOR_TS - 19 * 60 * 1000,
      expiresAt: INITIAL_ANCHOR_TS - 9 * 60 * 1000,
      paidAt: INITIAL_ANCHOR_TS - 18 * 60 * 1000,
    },
    {
      id: "01M7DEMO000000000000000101",
      numRef: "1000101",
      amount: 0.01,
      concept: "Prueba de sonido GotPay",
      channel: "CODI_QR",
      status: "PAID",
      codiQrId: "mock-qr-101",
      transactionId: "tx-mock-101",
      bankCode: 40014,
      clabeLast4: "1188",
      trackingKey: "GOTPAY202611140101",
      createdAt: INITIAL_ANCHOR_TS - 35 * 60 * 1000,
      expiresAt: INITIAL_ANCHOR_TS - 25 * 60 * 1000,
      paidAt: INITIAL_ANCHOR_TS - 34 * 60 * 1000,
    },
  ];
}

export function buildMockCharge(req: CreateChargeRequest): GotPayCharge {
  mockSeq += 1;
  const now = Date.now();
  const expirationSec = req.expirationSeconds ?? 300;
  const numRef = String(1_000_000 + mockSeq);
  const id = `01M7MOCK${String(now).slice(-10)}${String(mockSeq).padStart(8, "0")}`;

  const qrPayload = JSON.stringify({
    TYP: 20,
    v: {
      NAM: "GOTPAY MOSTRADOR",
      AMO: req.amount,
      DES: req.concept,
      REF: Number(numRef),
      ORD: id,
    },
  });

  return {
    id,
    numRef,
    amount: req.amount,
    concept: req.concept,
    channel: req.channel,
    status: "PENDING",
    codiQrId: `mock-codi-${mockSeq}`,
    qrData: req.channel === "CODI_QR" ? qrPayload : undefined,
    payerPhoneMasked:
      req.channel === "CODI_PUSH" ? sanitizeMaskedPhone(req.phone) : undefined,
    createdAt: now,
    expiresAt: now + expirationSec * 1000,
  };
}
