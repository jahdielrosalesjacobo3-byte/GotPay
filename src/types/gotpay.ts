/**
 * Contratos compartidos del enjambre GotPay.
 * Dueno del archivo: Cursor AI (bajo supervision de GotPay Agent).
 * Consumidores: Cursor AI (API/SSE), Antigravity (UI Caja + Modo Jurado), Muse (estados visuales/sonoros).
 */

export type ChargeStatus =
  | "CREATED"
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "PAID_LATE"
  | "CANCELLED";

export type ChargeChannel = "CODI_QR" | "CODI_PUSH" | "PAYMENT_LINK";

export interface GotPayCharge {
  readonly id: string;
  readonly numRef: string;
  readonly amount: number;
  readonly concept: string;
  readonly channel: ChargeChannel;
  readonly status: ChargeStatus;
  readonly codiQrId?: string;
  readonly qrData?: string;
  readonly payerPhoneMasked?: string;
  readonly transactionId?: string;
  readonly bankCode?: number;
  readonly clabeLast4?: string;
  readonly trackingKey?: string;
  readonly expiresAt: number;
  readonly createdAt: number;
  readonly paidAt?: number;
}

export interface CreateChargeRequest {
  readonly amount: number;
  readonly concept: string;
  readonly channel: "CODI_QR" | "CODI_PUSH";
  readonly phone?: string;
  readonly expirationSeconds?: number;
}

export type GotPayRealtimeEvent =
  | { readonly type: "charge.created"; readonly charge: GotPayCharge }
  | { readonly type: "charge.paid"; readonly charge: GotPayCharge }
  | { readonly type: "charge.paid_late"; readonly charge: GotPayCharge }
  | { readonly type: "charge.expired"; readonly chargeId: string }
  | { readonly type: "heartbeat"; readonly ts: number };

export function describeChargeStatus(status: ChargeStatus): string {
  switch (status) {
    case "CREATED":
      return "Creando cobro";
    case "PENDING":
      return "Esperando pago CoDi";
    case "PAID":
      return "Ya cayo (confirmado)";
    case "EXPIRED":
      return "Cobro expirado";
    case "PAID_LATE":
      return "Pago tardio: revisar antes de entregar";
    case "CANCELLED":
      return "Cancelado";
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}
