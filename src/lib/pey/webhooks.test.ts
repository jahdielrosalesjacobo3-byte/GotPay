import { describe, expect, it } from "vitest";
import {
  parsePaymentWebhook,
  sanitizePayerMetadata,
} from "@/lib/pey/webhooks";

const TEST_CLABE = "012180015826225713";

describe("sanitización metadata.clabe", () => {
  it("recorta CLABE a últimos 4 dígitos", () => {
    const sanitized = sanitizePayerMetadata({
      clabe: TEST_CLABE,
      bankCode: 12,
    });
    expect(sanitized.clabeLast4).toBe("5713");
    expect(sanitized.bankCode).toBe(12);
    expect(JSON.stringify(sanitized)).not.toContain(TEST_CLABE);
  });

  it("parsePaymentWebhook no conserva los 18 dígitos", () => {
    const body = JSON.stringify({
      type: "codi.qr.payment_received",
      transactionId: "01TXNTEST",
      metadata: { clabe: TEST_CLABE, bankCode: 12 },
    });
    const parsed = parsePaymentWebhook(body, "wh-parse-001");
    expect(parsed.payer.clabeLast4).toBe("5713");
    expect(JSON.stringify(parsed)).not.toContain(TEST_CLABE);
  });
});