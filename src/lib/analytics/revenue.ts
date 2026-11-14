import type { GotPayCharge } from "@/types/gotpay";

/**
 * Cálculos del dashboard a partir de cobros reales (sin series fijas).
 * Todas las fechas se agrupan en la zona America/Mexico_City.
 */

export const DASHBOARD_TIME_ZONE = "America/Mexico_City";

/**
 * Tasa ESTIMADA de comisión de una terminal punto de venta con tarjeta:
 * supuesto de producto de 3.6% + IVA (16%) ≈ 4.17%.
 * Solo se usa para rotular un "ahorro estimado"; no es un dato de pey ni de Banxico.
 */
export const ESTIMATED_CARD_TERMINAL_FEE_RATE = 0.0417;

export type RevenuePeriod = "hoy" | "7d" | "30d";

export interface RevenueBucket {
  readonly key: string;
  readonly label: string;
  readonly totalMxn: number;
  readonly count: number;
}

interface ZonedParts {
  readonly dayKey: string;
  readonly hour: number;
}

const DAY_MS = 86_400_000;
const MAX_HOURLY_BUCKETS = 12;
const MIN_HOURLY_BUCKETS = 6;
const WEEKLY_BUCKETS = 4;

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function zonedParts(ms: number): ZonedParts {
  const parts = partsFormatter.formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    dayKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")) % 24,
  };
}

/** Desplaza una clave de día YYYY-MM-DD n días (aritmética de calendario pura). */
function shiftDayKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

function weekdayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  return WEEKDAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? dayKey;
}

function shortDateLabel(dayKey: string): string {
  const [, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTH_LABELS[m - 1] ?? ""}`.trim();
}

function roundMxn(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isConfirmedCharge(charge: GotPayCharge): boolean {
  return charge.status === "PAID" || charge.status === "PAID_LATE";
}

interface PaidPoint {
  readonly dayKey: string;
  readonly hour: number;
  readonly amount: number;
}

function paidPoints(charges: ReadonlyArray<GotPayCharge>): PaidPoint[] {
  const points: PaidPoint[] = [];
  for (const charge of charges) {
    if (!isConfirmedCharge(charge)) continue;
    const ts = charge.paidAt ?? charge.createdAt;
    if (!Number.isFinite(ts)) continue;
    const { dayKey, hour } = zonedParts(ts);
    points.push({ dayKey, hour, amount: charge.amount });
  }
  return points;
}

function hourlyBuckets(points: PaidPoint[], now: number): RevenueBucket[] {
  const today = zonedParts(now);
  const todays = points.filter((p) => p.dayKey === today.dayKey);
  const end = today.hour;
  const earliest = todays.reduce((min, p) => Math.min(min, p.hour), end);
  let start = Math.min(earliest, Math.max(0, end - (MIN_HOURLY_BUCKETS - 1)));
  if (end - start + 1 > MAX_HOURLY_BUCKETS) {
    start = end - (MAX_HOURLY_BUCKETS - 1);
  }
  const buckets: RevenueBucket[] = [];
  for (let h = start; h <= end; h += 1) {
    const inHour = todays.filter((p) => p.hour === h);
    buckets.push({
      key: `${today.dayKey}T${String(h).padStart(2, "0")}`,
      label: `${String(h).padStart(2, "0")}:00`,
      totalMxn: roundMxn(inHour.reduce((acc, p) => acc + p.amount, 0)),
      count: inHour.length,
    });
  }
  return buckets;
}

function dailyBuckets(points: PaidPoint[], now: number): RevenueBucket[] {
  const todayKey = zonedParts(now).dayKey;
  const buckets: RevenueBucket[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dayKey = shiftDayKey(todayKey, -i);
    const inDay = points.filter((p) => p.dayKey === dayKey);
    buckets.push({
      key: dayKey,
      label: i === 0 ? "Hoy" : weekdayLabel(dayKey),
      totalMxn: roundMxn(inDay.reduce((acc, p) => acc + p.amount, 0)),
      count: inDay.length,
    });
  }
  return buckets;
}

/** 4 semanas de 7 días que terminan hoy (≈ últimos 30 días). */
function weeklyBuckets(points: PaidPoint[], now: number): RevenueBucket[] {
  const todayKey = zonedParts(now).dayKey;
  const buckets: RevenueBucket[] = [];
  for (let w = WEEKLY_BUCKETS - 1; w >= 0; w -= 1) {
    const endKey = shiftDayKey(todayKey, -7 * w);
    const startKey = shiftDayKey(endKey, -6);
    const inWeek = points.filter(
      (p) => p.dayKey >= startKey && p.dayKey <= endKey,
    );
    buckets.push({
      key: `${startKey}_${endKey}`,
      label: w === 0 ? "Esta sem." : shortDateLabel(startKey),
      totalMxn: roundMxn(inWeek.reduce((acc, p) => acc + p.amount, 0)),
      count: inWeek.length,
    });
  }
  return buckets;
}

export function computeRevenueSeries(
  charges: ReadonlyArray<GotPayCharge>,
  period: RevenuePeriod,
  now: number = Date.now(),
): RevenueBucket[] {
  const points = paidPoints(charges);
  switch (period) {
    case "hoy":
      return hourlyBuckets(points, now);
    case "7d":
      return dailyBuckets(points, now);
    case "30d":
      return weeklyBuckets(points, now);
    default: {
      const exhaustive: never = period;
      return exhaustive;
    }
  }
}

export function estimateCardFeeSavings(totalMxn: number): number {
  return roundMxn(Math.max(0, totalMxn) * ESTIMATED_CARD_TERMINAL_FEE_RATE);
}

export interface ConfirmationStats {
  readonly confirmed: number;
  readonly expired: number;
  /** Porcentaje 0–100 de confirmados sobre (confirmados + expirados); null si no hay base. */
  readonly ratePct: number | null;
}

/** Cuenta como expirado un EXPIRED o un PENDING/CREATED cuyo vencimiento ya pasó. */
export function computeConfirmationStats(
  charges: ReadonlyArray<GotPayCharge>,
  now: number = Date.now(),
): ConfirmationStats {
  let confirmed = 0;
  let expired = 0;
  for (const charge of charges) {
    switch (charge.status) {
      case "PAID":
      case "PAID_LATE":
        confirmed += 1;
        break;
      case "EXPIRED":
        expired += 1;
        break;
      case "PENDING":
      case "CREATED":
        if (charge.expiresAt < now) expired += 1;
        break;
      case "CANCELLED":
        break;
      default: {
        const exhaustive: never = charge.status;
        void exhaustive;
      }
    }
  }
  const base = confirmed + expired;
  return {
    confirmed,
    expired,
    ratePct: base === 0 ? null : Math.round((confirmed / base) * 100),
  };
}
