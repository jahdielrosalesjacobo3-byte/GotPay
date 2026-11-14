export type PeyErrorCode =
  | "CONFIG"
  | "TIMEOUT"
  | "HTTP"
  | "PARSE"
  | "UNKNOWN";

export class PeyClientError extends Error {
  readonly code: PeyErrorCode;
  readonly status?: number;
  readonly body?: string;

  constructor(
    message: string,
    code: PeyErrorCode,
    options?: { status?: number; body?: string; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "PeyClientError";
    this.code = code;
    this.status = options?.status;
    this.body = options?.body;
  }
}