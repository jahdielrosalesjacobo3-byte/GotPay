import { PeyClientError } from "@/lib/pey/errors";

const DEFAULT_TIMEOUT_MS = 10_000;

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
      throw new PeyClientError(
        `pey respondió HTTP ${response.status}`,
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
      expiration: input.expiration,
      externalMetadata: input.externalMetadata,
    }),
  });

  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const codiQrId = readStringField(record, ["codiQrId", "id", "codi_qr_id"]);
  const qrPayload = readStringField(record, [
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

  return {
    codiQrId,
    qrPayload: qrPayload ?? codiQrId,
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
      phone: input.phone,
      expiration: input.expiration,
      externalMetadata: input.externalMetadata,
    }),
  });

  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const codiPnId = readStringField(record, ["codiPnId", "id", "codi_pn_id"]);

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