"use client";

import { formatMxn, type ShiftSummary } from "@/components/mockEngine";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/fintech-primitives";
import type { GotPayCharge } from "@/types/gotpay";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  HeartPulse,
  Landmark,
  Plus,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Volume2,
  Wifi,
  Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";

interface MerchantDashboardProps {
  readonly charges: ReadonlyArray<GotPayCharge>;
  readonly summary: ShiftSummary;
  readonly sseState: "connected" | "reconnecting" | "mock";
  readonly turnOpen: boolean;
  readonly wakeLockActive: boolean;
  readonly onQuickCreateDemo: () => void;
  readonly posWidget?: React.ReactNode;
}

interface HourlyBucket {
  readonly hourLabel: string;
  readonly totalMxn: number;
  readonly targetMxn: number;
  readonly count: number;
}

function describeSemiArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = {
    x: cx + r * Math.cos((startAngle * Math.PI) / 180),
    y: cy + r * Math.sin((startAngle * Math.PI) / 180),
  };
  const end = {
    x: cx + r * Math.cos((endAngle * Math.PI) / 180),
    y: cy + r * Math.sin((endAngle * Math.PI) / 180),
  };
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function MerchantDashboard({
  charges,
  summary,
  sseState,
  turnOpen,
  wakeLockActive,
  onQuickCreateDemo,
  posWidget,
}: MerchantDashboardProps) {
  const [period, setPeriod] = useState<"hoy" | "7d" | "30d">("hoy");
  const [cardIndex, setCardIndex] = useState<0 | 1>(0);
  const [copiedRef, setCopiedRef] = useState(false);

  const confirmedCharges = useMemo(
    () =>
      charges.filter((c) => c.status === "PAID" || c.status === "PAID_LATE"),
    [charges],
  );

  const avgTicketMxn = useMemo(() => {
    const totalConfirmed = summary.paidCount + summary.lateCount;
    if (totalConfirmed === 0) {
      return 0;
    }
    return Math.round((summary.paidTotalMxn / totalConfirmed) * 100) / 100;
  }, [summary]);

  const channelBreakdown = useMemo(() => {
    let qrCount = 0;
    let pushCount = 0;
    for (const c of confirmedCharges) {
      if (c.channel === "CODI_PUSH") {
        pushCount += 1;
      } else {
        qrCount += 1;
      }
    }
    const total = Math.max(1, qrCount + pushCount);
    return {
      qrCount,
      pushCount,
      qrPct: Math.round((qrCount / total) * 100),
      pushPct: Math.round((pushCount / total) * 100),
    };
  }, [confirmedCharges]);

  const hourlySeries: ReadonlyArray<HourlyBucket> = useMemo(() => {
    const extraLiveMxn = Math.max(0, summary.paidTotalMxn - 105.51);
    const extraLiveCount = Math.max(
      0,
      summary.paidCount + summary.lateCount - 3,
    );
    const scale = period === "hoy" ? 1 : period === "7d" ? 6.5 : 24;

    return [
      {
        hourLabel:
          period === "hoy" ? "09:00" : period === "7d" ? "Lun" : "Sem 1",
        totalMxn: Math.round(140 * scale * 100) / 100,
        targetMxn: Math.round(115 * scale * 100) / 100,
        count: 3,
      },
      {
        hourLabel:
          period === "hoy" ? "10:00" : period === "7d" ? "Mar" : "Sem 2",
        totalMxn: Math.round(285 * scale * 100) / 100,
        targetMxn: Math.round(210 * scale * 100) / 100,
        count: 5,
      },
      {
        hourLabel:
          period === "hoy" ? "11:00" : period === "7d" ? "Mié" : "Sem 3",
        totalMxn: Math.round(410.5 * scale * 100) / 100,
        targetMxn: Math.round(300 * scale * 100) / 100,
        count: 7,
      },
      {
        hourLabel:
          period === "hoy" ? "12:00" : period === "7d" ? "Jue" : "Sem 4",
        totalMxn: Math.round(320 * scale * 100) / 100,
        targetMxn: Math.round(275 * scale * 100) / 100,
        count: 6,
      },
      {
        hourLabel:
          period === "hoy" ? "13:00" : period === "7d" ? "Hoy" : "Actual",
        totalMxn: Math.round((105.51 + extraLiveMxn) * scale * 100) / 100,
        targetMxn: Math.round(240 * scale * 100) / 100,
        count: 3 + extraLiveCount,
      },
    ];
  }, [summary, period]);

  const maxBucketMxn = useMemo(
    () =>
      Math.max(
        450,
        ...hourlySeries.map((b) => Math.max(b.totalMxn, b.targetMxn)),
      ),
    [hourlySeries],
  );

  const shiftCumulativeMxn = useMemo(
    () =>
      Math.round(
        hourlySeries.reduce((acc, item) => acc + item.totalMxn, 0) * 100,
      ) / 100,
    [hourlySeries],
  );

  const estimatedPosFeeSaved = useMemo(
    () => Math.round(shiftCumulativeMxn * 0.0417 * 100) / 100,
    [shiftCumulativeMxn],
  );

  const svgPoints = useMemo(() => {
    const width = 560;
    const height = 185;
    const padLeft = 46;
    const padRight = 22;
    const padTop = 20;
    const padBottom = 26;
    const usableW = width - padLeft - padRight;
    const usableH = height - padTop - padBottom;

    return hourlySeries.map((bucket, idx) => {
      const x =
        padLeft + (idx / Math.max(1, hourlySeries.length - 1)) * usableW;
      const ratio = Math.min(1, bucket.totalMxn / maxBucketMxn);
      const targetRatio = Math.min(1, bucket.targetMxn / maxBucketMxn);
      const y = padTop + usableH - ratio * usableH;
      const targetY = padTop + usableH - targetRatio * usableH;
      return { x, y, targetY, bucket };
    });
  }, [hourlySeries, maxBucketMxn]);

  const linePath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    return svgPoints
      .map(
        (pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`,
      )
      .join(" ");
  }, [svgPoints]);

  const targetLinePath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    return svgPoints
      .map(
        (pt, i) =>
          `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.targetY.toFixed(1)}`,
      )
      .join(" ");
  }, [svgPoints]);

  const areaPath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    const first = svgPoints[0]!;
    const last = svgPoints[svgPoints.length - 1]!;
    return `${linePath} L${last.x.toFixed(1)},159 L${first.x.toFixed(1)},159 Z`;
  }, [linePath, svgPoints]);

  const handleCopyClabe = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("•••• •••• •••• 5713").catch(() => {});
    }
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 1800);
  };

  // Doughnut Ring (Horizon TotalBalanceBox)
  const ringRadius = 22;
  const ringCirc = 2 * Math.PI * ringRadius;
  const qrArc = (channelBreakdown.qrPct / 100) * ringCirc;

  // Meta del turno
  const shiftBudget = 500;
  const shiftGoalPct = Math.min(
    100,
    Math.round((summary.paidTotalMxn / shiftBudget) * 100),
  );

  // Health Score Gauge (estilo HealthScore de shadcn-fintech)
  const healthScore = 98;
  const gaugeR = 58;
  const gaugeHalfCirc = Math.PI * gaugeR;
  const gaugeDash = (healthScore / 100) * gaugeHalfCirc;
  const gaugeGap = gaugeHalfCirc - gaugeDash;
  const gaugeTrackPath = describeSemiArc(80, 74, gaugeR, -180, 0);

  const healthFactors = [
    {
      id: "spei",
      label: "Liquidación SPEI 24/7",
      score: 100,
      color: "#0ADDA9",
      icon: Landmark,
    },
    {
      id: "voice",
      label: `Locución es-MX (${turnOpen ? "Activa" : "Lista"})`,
      score: turnOpen ? 100 : 92,
      color: "#026EFB",
      icon: Volume2,
    },
    {
      id: "privacy",
      label: "Privacidad CLABE (clabeLast4)",
      score: 100,
      color: "#02BEC8",
      icon: ShieldCheck,
    },
    {
      id: "sse",
      label: `Stream SSE (${sseState === "connected" ? "Conectado" : "Poll 2s"})`,
      score: 96,
      color: "#026EFB",
      icon: Zap,
    },
  ];

  return (
    <section
      aria-label="Dashboard financiero del comercio GotPay"
      data-testid="merchant-dashboard-section"
      className="space-y-4"
    >
      {/* Fila Compacta de 4 KPIs (Horizon TotalBalanceBox + 3 Métricas) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
        {/* KPI 1: Balance con Anillo Doughnut */}
        <Card
          data-testid="kpi-total-collected"
          className="col-span-2 flex items-center justify-between gap-3 p-4 md:col-span-5"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                className="-rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="28"
                  cy="28"
                  r={ringRadius}
                  fill="none"
                  stroke="#112645"
                  strokeOpacity="0.08"
                  strokeWidth="6"
                />
                <circle
                  cx="28"
                  cy="28"
                  r={ringRadius}
                  fill="none"
                  stroke="#026EFB"
                  strokeWidth="6"
                  strokeDasharray={`${qrArc} ${ringCirc}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-bold tabular-nums text-[var(--gp-navy)]">
                CoDi
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-[var(--gp-slate)]">
                Total Cobrado en el Turno
              </span>
              <div
                data-testid="summary-total-mxn"
                className="gp-amount-display text-2xl font-bold tracking-tight text-[var(--gp-navy)]"
              >
                {formatMxn(summary.paidTotalMxn)}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--gp-slate)]">
                <span className="inline-flex items-center gap-0.5 rounded bg-[var(--gp-mint)] px-1.5 py-0.2 font-semibold text-[var(--gp-navy)]">
                  <ArrowUpRight className="h-3 w-3" />
                  0% Comisión
                </span>
                <span>SPEI directo</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onQuickCreateDemo}
            className="gp-touch-btn inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#112645]/12 bg-[#112645]/[0.02] px-2.5 text-xs font-semibold text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.06]"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
            <span>$0.01</span>
          </button>
        </Card>

        {/* KPI 2: Confirmados */}
        <Card
          data-testid="kpi-paid-count"
          className="col-span-1 flex flex-col justify-between p-4 md:col-span-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--gp-slate)]">
              Confirmados
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
          </div>
          <div className="my-1">
            <span
              data-testid="summary-paid-count"
              className="gp-amount-display text-xl font-bold text-[var(--gp-navy)]"
            >
              {summary.paidCount}
            </span>
            <span className="ml-1 text-[11px] text-[var(--gp-slate)]">
              cobros
            </span>
          </div>
          <div className="text-[11px] text-[var(--gp-slate)]">
            QR {channelBreakdown.qrCount} · Push {channelBreakdown.pushCount}
          </div>
        </Card>

        {/* KPI 3: Ticket Promedio */}
        <Card
          data-testid="kpi-avg-ticket"
          className="col-span-1 flex flex-col justify-between p-4 md:col-span-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--gp-slate)]">
              Ticket Promedio
            </span>
            <Receipt className="h-3.5 w-3.5 text-[var(--gp-slate)]" />
          </div>
          <div className="gp-amount-display my-1 text-xl font-bold text-[var(--gp-navy)]">
            {formatMxn(avgTicketMxn)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--gp-slate)]">
            <span>Ahorro vs TPV</span>
            <span className="font-semibold text-[var(--gp-navy)]">
              +{formatMxn(estimatedPosFeeSaved)}
            </span>
          </div>
        </Card>

        {/* KPI 4: En Espera / Tardíos */}
        <Card
          data-testid="kpi-pending-late"
          className="col-span-2 flex flex-col justify-between p-4 md:col-span-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--gp-slate)]">
              Pendientes
            </span>
            <Clock className="h-3.5 w-3.5 text-[var(--gp-slate)]" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="gp-amount-display text-xl font-bold text-[var(--gp-navy)]">
              {summary.pendingCount}
            </span>
            <span className="text-[11px] text-[var(--gp-slate)]">activos ·</span>
            <span className="gp-amount-display text-sm font-semibold text-[var(--gp-navy)]">
              {summary.lateCount}
            </span>
            <span className="text-[11px] text-[var(--gp-slate)]">tardío</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--gp-slate)]">
            <span>{summary.lateCount > 0 ? "Revisar" : "Al día"}</span>
            <span>Poll 2s</span>
          </div>
        </Card>
      </div>

      {/* Bento Fila 1 (Estilo shadcn-fintech): FinancialOverview (8 cols) + AccountCards (4 cols) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <Card
          data-testid="shift-revenue-chart"
          className="flex flex-col justify-between md:col-span-8"
        >
          <CardHeader className="flex flex-col justify-between gap-2 pb-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base font-semibold">
                Panorama Financiero
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-[var(--gp-slate)]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--gp-blue)]" />
                  Turno ({formatMxn(shiftCumulativeMxn)})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--gp-teal)]" />
                  Meta Horaria
                </span>
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-[#112645]/10 bg-[#112645]/[0.03] p-0.5">
              {(
                [
                  { id: "hoy", label: "Hoy" },
                  { id: "7d", label: "7D" },
                  { id: "30d", label: "30D" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPeriod(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    period === tab.id
                      ? "bg-[var(--gp-white)] text-[var(--gp-navy)] shadow-2xs"
                      : "text-[var(--gp-slate)] hover:text-[var(--gp-navy)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-1">
            <div className="w-full overflow-x-auto">
              <svg
                viewBox="0 0 560 185"
                className="h-[195px] w-full min-w-[400px]"
                role="img"
                aria-label="Panorama financiero de ingresos del turno"
              >
                <defs>
                  <linearGradient
                    id="gpOverviewFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#026EFB" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#026EFB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[
                  { y: 22, label: formatMxn(maxBucketMxn) },
                  { y: 68, label: formatMxn(Math.round(maxBucketMxn * 0.66)) },
                  { y: 114, label: formatMxn(Math.round(maxBucketMxn * 0.33)) },
                  { y: 159, label: "$0" },
                ].map((row) => (
                  <g key={row.y}>
                    <line
                      x1="46"
                      y1={row.y}
                      x2="538"
                      y2={row.y}
                      stroke="#112645"
                      strokeOpacity="0.08"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="40"
                      y={row.y + 3}
                      textAnchor="end"
                      fill="#27354B"
                      fontSize="10"
                      opacity="0.7"
                    >
                      {row.label}
                    </text>
                  </g>
                ))}

                <path d={areaPath} fill="url(#gpOverviewFill)" />
                <path
                  d={targetLinePath}
                  fill="none"
                  stroke="#02BEC8"
                  strokeWidth="1.75"
                  strokeDasharray="4 4"
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#026EFB"
                  strokeWidth="2.25"
                />

                {svgPoints.map(({ x, y, targetY, bucket }) => (
                  <g key={bucket.hourLabel}>
                    <rect
                      x={x - 3}
                      y={targetY - 3}
                      width="6"
                      height="6"
                      rx="1"
                      fill="#FFFFFF"
                      stroke="#02BEC8"
                      strokeWidth="1.75"
                    />
                    <rect
                      x={x - 3.5}
                      y={y - 3.5}
                      width="7"
                      height="7"
                      rx="1.5"
                      fill="#FFFFFF"
                      stroke="#026EFB"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={Math.max(13, y - 8)}
                      textAnchor="middle"
                      fill="#112645"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {formatMxn(bucket.totalMxn)}
                    </text>
                    <text
                      x={x}
                      y="177"
                      textAnchor="middle"
                      fill="#27354B"
                      fontSize="10.5"
                      opacity="0.8"
                    >
                      {bucket.hourLabel}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Receptor CoDi (AccountCards de shadcn-fintech) */}
        <Card className="flex flex-col justify-between md:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CreditCard className="h-4 w-4 text-[var(--gp-slate)]" />
              <span>Tarjeta Terminal CoDi</span>
            </CardTitle>
            <button
              type="button"
              onClick={onQuickCreateDemo}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-[var(--gp-slate)] transition hover:bg-[#112645]/[0.05] hover:text-[var(--gp-navy)]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir</span>
            </button>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="gp-bank-card-mesh relative aspect-[1.72/1] w-full overflow-hidden rounded-xl p-4 text-[var(--gp-white)] shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-white/70">
                    {cardIndex === 0
                      ? "GotPay · Mostrador QR"
                      : "GotPay · Push Celular"}
                  </p>
                  <p className="gp-amount-display mt-0.5 text-xl font-bold text-white">
                    {formatMxn(summary.paidTotalMxn)}{" "}
                    <span className="text-xs font-normal text-white/75">
                      MXN
                    </span>
                  </p>
                </div>
                <Wifi className="h-5 w-5 rotate-90 text-white/75" />
              </div>

              <div className="my-2.5 flex items-center gap-2.5">
                <div className="h-5 w-7 rounded border border-white/25 bg-gradient-to-br from-[#F5A524]/85 to-[#F5A524]/40" />
                <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  SPEI 24/7
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="font-mono text-xs tracking-widest text-white/90">
                    ••••  ••••  ••••  5713
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/65">
                    Comercio · Solo clabeLast4
                  </p>
                </div>
                <span className="text-xs font-bold tracking-tight text-[var(--gp-mint)]">
                  CoDi
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCardIndex(0)}
                  aria-label="Canal QR"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[#112645]/12 text-[var(--gp-slate)] hover:bg-[#112645]/[0.05]"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setCardIndex(1)}
                  aria-label="Canal Push"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[#112645]/12 text-[var(--gp-slate)] hover:bg-[#112645]/[0.05]"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
                <span className="ml-1 text-xs tabular-nums text-[var(--gp-slate)]">
                  {cardIndex + 1} / 2
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyClabe}
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[var(--gp-slate)] transition hover:bg-[#112645]/[0.05] hover:text-[var(--gp-navy)]"
              >
                {copiedRef ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar •••• 5713</span>
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bento Fila 2 (Estilo shadcn-fintech): QuickTransfer/POS (4 cols) + MoneyMovement/SpendingLimit (4 cols) + HealthScore Gauge (4 cols) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {posWidget && <div className="md:col-span-4">{posWidget}</div>}

        {/* Widget MoneyMovement + SpendingLimit */}
        <Card
          className={`flex flex-col justify-between ${
            posWidget ? "md:col-span-4" : "md:col-span-6"
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ArrowLeftRight className="h-4 w-4 text-[var(--gp-slate)]" />
                <span>Movimiento por Hora</span>
              </CardTitle>
              <span className="rounded-md bg-[#112645]/[0.05] px-2 py-0.5 text-[11px] font-medium text-[var(--gp-slate)]">
                Turno Hoy
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-[var(--gp-slate)]">Flujo Neto</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--gp-mint)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--gp-navy)]">
                +{formatMxn(shiftCumulativeMxn)}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Barras agrupadas estilo MoneyMovement */}
            <div className="grid h-36 grid-cols-5 items-end gap-2.5 border-b border-[#112645]/[0.08] pb-2 pt-2">
              {hourlySeries.map((bucket) => {
                const actualH = Math.max(
                  14,
                  Math.round((bucket.totalMxn / maxBucketMxn) * 100),
                );
                const targetH = Math.max(
                  10,
                  Math.round((bucket.targetMxn / maxBucketMxn) * 100),
                );
                return (
                  <div
                    key={bucket.hourLabel}
                    className="flex h-full flex-col items-center justify-end"
                  >
                    <div className="flex h-28 w-full items-end justify-center gap-1">
                      <div
                        className="w-2.5 rounded-t bg-[var(--gp-blue)] transition-all"
                        style={{ height: `${actualH}%` }}
                        title={`Cobrado: ${formatMxn(bucket.totalMxn)}`}
                      />
                      <div
                        className="w-2.5 rounded-t bg-[var(--gp-teal)]/55 transition-all"
                        style={{ height: `${targetH}%` }}
                        title={`Meta: ${formatMxn(bucket.targetMxn)}`}
                      />
                    </div>
                    <span className="mt-1.5 text-[10px] font-medium text-[var(--gp-slate)]">
                      {bucket.hourLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Meta del Turno estilo SpendingLimit */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[var(--gp-slate)]">
                  Meta de Cobro del Turno
                </span>
                <span className="font-semibold tabular-nums text-[var(--gp-navy)]">
                  {formatMxn(summary.paidTotalMxn)} / {formatMxn(shiftBudget)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#112645]/[0.08]">
                <div
                  className="gp-gradient-bg h-full rounded-full transition-all"
                  style={{ width: `${Math.max(16, shiftGoalPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--gp-slate)]">
                <span>WakeLock: {wakeLockActive ? "Activo" : "Listo"}</span>
                <span>0% Comisión Banxico</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget HealthScore Semi-Circle Gauge (Estilo HealthScore de shadcn-fintech) */}
        <Card
          className={`flex flex-col justify-between ${
            posWidget ? "md:col-span-4" : "md:col-span-6"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <HeartPulse className="h-4 w-4 text-[var(--gp-blue)]" />
              <span>Salud Operativa</span>
            </CardTitle>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gp-mint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--gp-navy)]">
              <TrendingUp className="h-3 w-3" />
              +4 pts
            </span>
          </CardHeader>

          <CardContent className="flex flex-col items-center space-y-3">
            {/* Semi-circle SVG Gauge */}
            <div className="relative flex items-center justify-center">
              <svg
                width="160"
                height="90"
                viewBox="0 0 160 90"
                className="overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id="gpHealthGrad"
                    x1="0%"
                    y1="50%"
                    x2="100%"
                    y2="50%"
                  >
                    <stop offset="0%" stopColor="#026EFB" />
                    <stop offset="50%" stopColor="#02BEC8" />
                    <stop offset="100%" stopColor="#0ADDA9" />
                  </linearGradient>
                </defs>
                <path
                  d={gaugeTrackPath}
                  fill="none"
                  stroke="#112645"
                  strokeOpacity="0.1"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d={gaugeTrackPath}
                  fill="none"
                  stroke="url(#gpHealthGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${gaugeHalfCirc}`}
                  strokeDashoffset={`${gaugeGap}`}
                />
                <text
                  x="20"
                  y="86"
                  textAnchor="middle"
                  fill="#27354B"
                  fontSize="9"
                  opacity="0.5"
                >
                  0
                </text>
                <text
                  x="80"
                  y="10"
                  textAnchor="middle"
                  fill="#27354B"
                  fontSize="9"
                  opacity="0.5"
                >
                  50
                </text>
                <text
                  x="140"
                  y="86"
                  textAnchor="middle"
                  fill="#27354B"
                  fontSize="9"
                  opacity="0.5"
                >
                  100
                </text>
              </svg>
              <div className="absolute bottom-0 flex flex-col items-center">
                <span className="gp-amount-display text-2xl font-bold text-[var(--gp-navy)]">
                  {healthScore}
                </span>
                <span className="text-[11px] font-medium text-[var(--gp-slate)]">
                  Excelente
                </span>
              </div>
            </div>

            {/* Factores de salud estilo HealthScore */}
            <div className="w-full space-y-1.5 pt-1">
              {healthFactors.map((factor) => {
                const Icon = factor.icon;
                return (
                  <div
                    key={factor.id}
                    className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#112645]/[0.05] text-[var(--gp-navy)]">
                      <Icon className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
                    </div>
                    <span className="flex-1 truncate text-xs font-medium text-[var(--gp-navy)]">
                      {factor.label}
                    </span>
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[#112645]/[0.08]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${factor.score}%`,
                          backgroundColor: factor.color,
                        }}
                      />
                    </div>
                    <span className="w-7 text-right text-[11px] font-semibold tabular-nums text-[var(--gp-navy)]">
                      {factor.score}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
