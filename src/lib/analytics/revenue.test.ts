import { describe, expect, it } from "vitest";
import {
  computeConfirmationStats,
  computeRevenueSeries,
  estimateCardFeeSavings,
  ESTIMATED_CARD_TERMINAL_FEE_RATE,
} from "@/lib/analytics/revenue";
import type { ChargeStatus, GotPayCharge } from "@/types/gotpay";

// 2026-11-14 16:30 CDMX (UTC-6) = 22:30Z
const NOW = Date.parse("2026-11-14T22:30:00Z");

function charge(
  id: string,
  status: ChargeStatus,
  amount: number,
  paidIso?: string,
  expiresAt = NOW + 60_000,
): GotPayCharge {
  const paidAt = paidIso ? Date.parse(paidIso) : undefined;
  return {
    id,
    numRef: id,
    amount,
    concept: "t",
    channel: "CODI_QR",
    status,
    createdAt: (paidAt ?? NOW) - 30_000,
    expiresAt,
    ...(paidAt !== undefined ? { paidAt } : {}),
  };
}

const REAL_TODAY = [
  charge("a", "PAID", 0.01, "2026-11-14T22:12:00Z"), // 16:12 CDMX
  charge("b", "PAID", 0.01, "2026-11-14T22:13:39Z"), // 16:13
  charge("c", "PAID", 0.01, "2026-11-14T22:14:46Z"), // 16:14
];

describe("serie de ingresos real (America/Mexico_City)", () => {
  it("Hoy: agrupa por hora local y termina en la hora actual", () => {
    const series = computeRevenueSeries(REAL_TODAY, "hoy", NOW);
    const last = series[series.length - 1]!;
    expect(last.label).toBe("16:00");
    expect(last.count).toBe(3);
    expect(last.totalMxn).toBe(0.03);
    expect(series.reduce((a, b) => a + b.count, 0)).toBe(3);
    expect(series.length).toBeGreaterThanOrEqual(6);
  });

  it("ignora pendientes, cancelados y cobros de otros días en Hoy", () => {
    const series = computeRevenueSeries(
      [
        ...REAL_TODAY,
        charge("p", "PENDING", 50),
        charge("x", "CANCELLED", 20),
        charge("y", "PAID", 10, "2026-11-13T23:00:00Z"), // 17:00 del 13 nov
      ],
      "hoy",
      NOW,
    );
    expect(series.reduce((a, b) => a + b.totalMxn, 0)).toBeCloseTo(0.03, 5);
  });

  it("usa la fecha local: 00:30Z del 15 nov sigue siendo 14 nov en CDMX", () => {
    const late = charge("z", "PAID", 5, "2026-11-15T00:30:00Z"); // 18:30 CDMX 14 nov
    const now = Date.parse("2026-11-15T01:00:00Z"); // 19:00 CDMX
    const series = computeRevenueSeries([late], "hoy", now);
    expect(series.find((b) => b.label === "18:00")?.totalMxn).toBe(5);
  });

  it("7D: 7 días terminando en Hoy", () => {
    const series = computeRevenueSeries(
      [...REAL_TODAY, charge("y", "PAID_LATE", 10, "2026-11-12T18:00:00Z")],
      "7d",
      NOW,
    );
    expect(series).toHaveLength(7);
    expect(series[6]!.label).toBe("Hoy");
    expect(series[6]!.totalMxn).toBe(0.03);
    expect(series.find((b) => b.key === "2026-11-12")?.totalMxn).toBe(10);
  });

  it("30D: 4 semanas de 7 días; fuera de rango no cuenta", () => {
    const series = computeRevenueSeries(
      [
        ...REAL_TODAY,
        charge("w", "PAID", 7, "2026-10-25T18:00:00Z"),
        charge("old", "PAID", 99, "2026-09-01T18:00:00Z"),
      ],
      "30d",
      NOW,
    );
    expect(series).toHaveLength(4);
    expect(series[3]!.totalMxn).toBe(0.03);
    expect(series.reduce((a, b) => a + b.totalMxn, 0)).toBeCloseTo(7.03, 5);
  });

  it("sin cobros: buckets en cero (estado vacío)", () => {
    const series = computeRevenueSeries([], "7d", NOW);
    expect(series.every((b) => b.totalMxn === 0 && b.count === 0)).toBe(true);
  });
});

describe("indicadores", () => {
  it("ahorro estimado usa la tasa documentada sobre el total real", () => {
    expect(ESTIMATED_CARD_TERMINAL_FEE_RATE).toBe(0.0417);
    expect(estimateCardFeeSavings(100)).toBe(4.17);
    expect(estimateCardFeeSavings(0.03)).toBe(0);
    expect(estimateCardFeeSavings(-5)).toBe(0);
  });

  it("% confirmados vs expirados (PENDING vencido cuenta como expirado)", () => {
    const stats = computeConfirmationStats(
      [
        ...REAL_TODAY,
        charge("e", "EXPIRED", 1),
        charge("pv", "PENDING", 1, undefined, NOW - 1),
        charge("pa", "PENDING", 1, undefined, NOW + 60_000),
        charge("c", "CANCELLED", 1),
      ],
      NOW,
    );
    expect(stats).toEqual({ confirmed: 3, expired: 2, ratePct: 60 });
    expect(computeConfirmationStats([], NOW).ratePct).toBeNull();
  });
});
