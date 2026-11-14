import { describe, expect, it, beforeEach } from "vitest";
import { subscribeRealtime, realtimeContainsFullClabe } from "@/lib/events/bus";
import {
  __resetStoreForTests,
  chargeContainsFullClabe,
  getChargeById,
  saveCharge,
} from "@/lib/db/store";
import { processPeyPaymentWebhook } from "@/lib/db/lifecycle";
import type { GotPayCharge, GotPayRealtimeEvent } from "@/types/gotpay";

const TEST_CLABE = "012180015826225713";

describe("webhook idempotencia y privacidad CLABE", () => {
  beforeEach(() => {
    __resetStoreForTests();
  });

  it("webhook duplicado (mismo webhook-id) => una transición y un evento paid", async () => {
    const charge: GotPayCharge = {
      id: "01CHARGE000000000000000001",
      numRef: "1234567",
      amount: 0.01,
      concept: "Demo",
      channel: "CODI_QR",
      status: "PENDING",
      codiQrId: "01QR0000000000000000001",
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
    };
    await saveCharge(charge);

    const events: GotPayRealtimeEvent[] = [];
    subscribeRealtime((event) => {
      events.push(event);
    });

    const payment = {
      webhookId: "wh-dup-001",
      transactionId: "01TXN0000000000000000001",
      codiQrId: charge.codiQrId,
      numRef: charge.numRef,
      amount: charge.amount,
      type: "codi.qr.payment_received",
      datePaid: Math.floor(Date.now() / 1000),
      payer: {
        clabeLast4: TEST_CLABE.slice(-4),
        bankCode: 12,
      },
      orderId: charge.id,
    };

    const first = await processPeyPaymentWebhook(payment);
    const second = await processPeyPaymentWebhook(payment);

    expect(first.duplicate).toBe(false);
    expect(first.emitted).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.emitted).toBe(false);

    const paidEvents = events.filter((e) => e.type === "charge.paid");
    expect(paidEvents).toHaveLength(1);

    const updated = await getChargeById(charge.id);
    expect(updated?.status).toBe("PAID");
    expect(updated?.clabeLast4).toBe(TEST_CLABE.slice(-4));
    expect(updated?.bankCode).toBe(12);
  });

  it("metadata.clabe de 18 dígitos no aparece en store ni en SSE", async () => {
    const charge: GotPayCharge = {
      id: "01CHARGE000000000000000002",
      numRef: "7654321",
      amount: 1,
      concept: "Privacidad",
      channel: "CODI_QR",
      status: "PENDING",
      codiQrId: "01QR0000000000000000002",
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
    };
    await saveCharge(charge);

    const events: GotPayRealtimeEvent[] = [];
    subscribeRealtime((event) => {
      events.push(event);
    });

    await processPeyPaymentWebhook({
      webhookId: "wh-privacy-001",
      transactionId: "01TXN0000000000000000002",
      codiQrId: charge.codiQrId,
      numRef: charge.numRef,
      amount: charge.amount,
      type: "codi.qr.payment_received",
      payer: {
        clabeLast4: TEST_CLABE.slice(-4),
      },
      orderId: charge.id,
    });

    const updated = await getChargeById(charge.id);
    expect(updated).toBeDefined();
    expect(chargeContainsFullClabe(updated!)).toBe(false);
    expect(updated?.clabeLast4).toBe(TEST_CLABE.slice(-4));
    expect(JSON.stringify(updated)).not.toContain(TEST_CLABE);

    for (const event of events) {
      expect(realtimeContainsFullClabe(event)).toBe(false);
      expect(JSON.stringify(event)).not.toContain(TEST_CLABE);
    }
  });
});