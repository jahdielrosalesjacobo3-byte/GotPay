import { PeyClientError } from "@/lib/pey/errors";

const DEFAULT_TIMEOUT_MS = 10_000;

/** pey exige expiration = 0 (sin vencimiento) o >= 360 s (docs Create QR / Create Push). */
export const PEY_MIN_EXPIRATION_SECONDS = 360;

export function normalizePeyExpiration(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return PEY_MIN_EXPIRATION_SECONDS;
  }
  return Math.max(PEY_MIN_EXPIRATION_SECONDS, Math.round(seconds));
}

/** Extrae solo error.type/message del cuerpo de error de pey (nunca headers ni llaves). */
function extractPeyErrorMessage(bodyText: string): string | undefined {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: unknown; type?: unknown } | string;
      message?: unknown;
    };
    const err = parsed.error;
    if (typeof err === "string") return err.slice(0, 200);
    const message =
      (err && typeof err.message === "string" && err.message) ||
      (typeof parsed.message === "string" && parsed.message) ||
      undefined;
    const type = err && typeof err.type === "string" ? err.type : undefined;
    if (!message) return type;
    return (type ? `${type} — ${message}` : message).slice(0, 200);
  } catch {
    return undefined;
  }
}

function getBaseUrl(): string {
  const base =
    process.env.PEY_API_BASE_URL?.trim() || "https://api.pey.mx";
  return base.replace(/\/$/, "");
}

function getApiKey(): string {
  const key = process.env.PEY_API_KEY?.trim();
  if (!key) {
    throw new PeyClientError(
      "PEY_API_KEY no configurada en el servidor",
      "CONFIG",
    );
  }
  return key;
}

async function peyFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<unknown> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const bodyText = await response.text();
    if (!response.ok) {
      const detail = extractPeyErrorMessage(bodyText);
      throw new PeyClientError(
        detail
          ? `pey respondió HTTP ${response.status}: ${detail}`
          : `pey respondió HTTP ${response.status}`,
        "HTTP",
        { status: response.status, body: bodyText },
      );
    }

    if (!bodyText) {
      return {};
    }

    try {
      return JSON.parse(bodyText) as unknown;
    } catch (cause) {
      throw new PeyClientError("Respuesta JSON inválida de pey", "PARSE", {
        cause,
        body: bodyText,
      });
    }
  } catch (error) {
    if (error instanceof PeyClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new PeyClientError("Timeout al llamar a pey", "TIMEOUT", {
        cause: error,
      });
    }
    throw new PeyClientError("Error de red al llamar a pey", "UNKNOWN", {
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
}

export interface CreateCodiQrInput {
  readonly amount: number;
  readonly concept: string;
  readonly numRef: string;
  readonly expiration: number;
  readonly externalMetadata?: { readonly orderId: string };
}

export interface CreateCodiQrResult {
  readonly codiQrId: string;
  readonly qrPayload: string;
  readonly raw: unknown;
}

export interface CreateCodiPushInput {
  readonly amount: number;
  readonly concept: string;
  readonly numRef: string;
  readonly phone: string;
  readonly expiration: number;
  readonly externalMetadata?: { readonly orderId: string };
}

export interface CreateCodiPushResult {
  readonly codiPnId: string;
  readonly raw: unknown;
}

function readStringField(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

export async function createCodiQr(
  input: CreateCodiQrInput,
): Promise<CreateCodiQrResult> {
  const raw = await peyFetch("/codi/qr", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      concept: input.concept,
      numRef: input.numRef,
      expiration: normalizePeyExpiration(input.expiration),
      metadata: input.externalMetadata,
    }),
  });

  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const codiQrId = readStringField(record, ["codiQrId", "id", "codi_qr_id"]);
  const qrPayload = readStringField(record, [
    "qrString",
    "qr",
    "qrData",
    "payload",
    "codiQr",
    "qrPayload",
  ]);

  if (!codiQrId) {
    throw new PeyClientError(
      "pey no devolvió codiQrId al crear QR",
      "PARSE",
      { body: JSON.stringify(record) },
    );
  }

  if (!qrPayload) {
    throw new PeyClientError("pey no devolvió qrString al crear QR", "PARSE");
  }

  return {
    codiQrId,
    qrPayload,
    raw,
  };
}

export async function createCodiPush(
  input: CreateCodiPushInput,
): Promise<CreateCodiPushResult> {
  const raw = await peyFetch("/codi/pn", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      concept: input.concept,
      numRef: input.numRef,
      phoneNumber: input.phone.replace(/\D/g, "").slice(-10),
      expiration: normalizePeyExpiration(input.expiration),
      metadata: input.externalMetadata,
    }),
  });

  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const codiPnId = readStringField(record, [
    "transactionId",
    "codiId",
    "codiPnId",
    "id",
  ]);

  if (!codiPnId) {
    throw new PeyClientError(
      "pey no devolvió codiPnId al crear push",
      "PARSE",
      { body: JSON.stringify(record) },
    );
  }

  return { codiPnId, raw };
}

export async function getCodiQrTransaction(
  codiQrId: string,
): Promise<unknown> {
  return peyFetch(
    `/transaction/codi/qr/${encodeURIComponent(codiQrId)}`,
    { method: "GET" },
  );
}

export async function getTransaction(transactionId: string): Promise<unknown> {
  return peyFetch(`/transaction/${encodeURIComponent(transactionId)}`, {
    method: "GET",
  });
}

export function maskPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "****";
  }
  return `***${digits.slice(-4)}`;
}