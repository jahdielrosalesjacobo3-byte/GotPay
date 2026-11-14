"use client";

import { GotPayLogo } from "@/components/GotPayLogo";
import {
  formatMxn,
  getBankShortName,
  sanitizeClabeLast4,
} from "@/components/mockEngine";
import { PaymentOverlay } from "@/components/PaymentOverlay";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusChip,
} from "@/components/ui/fintech-primitives";
import { useGotPayPos } from "@/components/useGotPayPos";
import {
  amountToSpanishWords,
  buildChargeAnnouncement,
  formatShortFolio,
} from "@/lib/audio/announcer";
import type { ChargeStatus } from "@/types/gotpay";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Cpu,
  RefreshCw,
  Rocket,
  Scale,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import React from "react";

function getStepIndexForStatus(status?: ChargeStatus): number {
  if (!status) {
    return 0;
  }
  switch (status) {
    case "CREATED":
      return 1;
    case "PENDING":
      return 2;
    case "PAID":
    case "PAID_LATE":
      return 4;
    case "EXPIRED":
    case "CANCELLED":
      return 2;
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

const PIPELINE_STEPS: ReadonlyArray<{
  readonly step: number;
  readonly title: string;
  readonly detail: string;
}> = [
  {
    step: 1,
    title: "1. Solicitud CoDi creada",
    detail: "POST /api/charges -> $0.01 MXN, 0% comisión",
  },
  {
    step: 2,
    title: "2. Esperando autorización",
    detail: "QR en pantalla + SSE /api/events + Poll 2s",
  },
  {
    step: 3,
    title: "3. Webhook verificado",
    detail: "Firma Standard Webhooks + idempotencia + clabeLast4",
  },
  {
    step: 4,
    title: "4. Locución y confirmación",
    detail: "Overlay #0ADDA9 + voz es-MX («un centavo»)",
  },
];

export default function JuryEvaluationPage() {
  const {
    turnOpen,
    openTurn,
    hardware,
    activeCharge,
    overlayCharge,
    dismissOverlay,
    charges,
    sseState,
    pollTickCount,
    isSubmitting,
    isReconciling,
    createCharge,
    reconcileActiveCharge,
    simulateChargeOutcome,
    replayChargeVoice,
  } = useGotPayPos("api");

  const inspectedCharge = overlayCharge ?? activeCharge ?? charges[0] ?? null;
  const activeStep = getStepIndexForStatus(inspectedCharge?.status);

  const handleLaunchRealCentavo = async () => {
    if (!turnOpen) {
      await openTurn();
    }
    await createCharge({
      amount: 0.01,
      concept: "Prueba Jurado GotPay",
      channel: "CODI_QR",
      expirationSeconds: 360,
    });
  };

  const handleSimulateCompleteFlow = async (
    outcome: "PAID" | "PAID_LATE" = "PAID",
  ) => {
    if (!turnOpen) {
      await openTurn();
    }
    const target =
      activeCharge ?? {
        id: `01M7JURYDEMO${Date.now()}`,
        numRef: "1000004",
        amount: outcome === "PAID_LATE" ? 50 : 0.01,
        concept:
          outcome === "PAID_LATE"
            ? "Prueba Pago Tardío Jurado"
            : "Prueba Jurado GotPay",
        channel: "CODI_QR" as const,
        status: "PENDING" as const,
        codiQrId: "jury-demo-qr",
        qrData: JSON.stringify({
          TYP: 20,
          v: { NAM: "GOTPAY JURADO", AMO: 0.01, REF: 1000004 },
        }),
        bankCode: 40012,
        clabeLast4: "5713",
        createdAt: Date.now() - 2000,
        expiresAt: Date.now() + 298000,
      };
    simulateChargeOutcome(target, outcome);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] p-2 text-[var(--gp-navy)] sm:p-4">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#112645]/[0.08] bg-[var(--gp-white)] shadow-xs">
        {/* Topbar limpia estilo shadcn-fintech */}
        <header className="flex h-14 flex-wrap items-center justify-between gap-2 border-b border-[#112645]/[0.08] px-5">
          <div className="flex items-center gap-2.5">
            <GotPayLogo variant="icon" className="h-7 w-7 rounded-md" />
            <nav className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-[var(--gp-slate)]">GotPay</span>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--gp-slate)]/50" />
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--gp-navy)]">
                <Scale className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
                Modo Jurado ($0.01 MXN)
              </span>
            </nav>
            <span className="hidden rounded-md bg-[#112645]/[0.05] px-2 py-0.5 text-[11px] font-medium text-[var(--gp-slate)] sm:inline-block">
              Acceso directo sin login
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#112645]/10 bg-[#112645]/[0.02] px-2.5 text-xs font-medium text-[var(--gp-navy)]">
              <span
                className={`h-2 w-2 rounded-full ${
                  sseState === "connected"
                    ? "bg-[var(--gp-mint)]"
                    : "bg-[var(--gp-amber)]"
                }`}
              />
              <span>
                {sseState === "connected"
                  ? `SSE Activo · Poll #${pollTickCount}`
                  : `Poll 2s #${pollTickCount}`}
              </span>
            </span>
            <Link
              href="/"
              className="gp-touch-btn inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#112645]/12 bg-[var(--gp-white)] px-3 text-xs font-medium text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.04]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver al Panel</span>
            </Link>
          </div>
        </header>

        <main className="space-y-5 p-5 sm:p-6">
          {/* Encabezado y Acciones de Evaluación */}
          <Card className="p-5">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-[#026EFB]/[0.08] px-2.5 py-0.5 text-xs font-semibold text-[var(--gp-blue)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Evaluación en Vivo · Hackatón México 2026</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--gp-navy)] sm:text-2xl">
                  Probar GotPay con $0.01 MXN
                </h1>
                <p className="max-w-2xl text-xs leading-relaxed text-[var(--gp-slate)] sm:text-sm">
                  Genera un cobro CoDi real de un centavo ($0.01 MXN) o ejecuta
                  la simulación local para verificar la locución en español y el
                  enmascaramiento de privacidad (solo últimos 4 dígitos CLABE).
                </p>
                {hardware.lastSpokenText && (
                  <div
                    data-testid="jury-last-spoken"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#112645]/[0.04] px-2.5 py-1 font-mono text-xs font-medium text-[var(--gp-navy)]"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
                    <span>Voz emitida: «{hardware.lastSpokenText}»</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  disabled={isSubmitting}
                  data-testid="jury-real-001-btn"
                  onClick={() => void handleLaunchRealCentavo()}
                  className="gp-touch-btn inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[var(--gp-navy)] px-5 py-2.5 text-xs font-semibold text-[var(--gp-white)] shadow-xs transition hover:opacity-95 disabled:opacity-60"
                >
                  <Rocket className="h-4 w-4 text-[var(--gp-mint)]" />
                  <span>
                    {isSubmitting
                      ? "Generando QR…"
                      : "Probar GotPay con $0.01 MXN reales"}
                  </span>
                </button>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    data-testid="jury-simulate-001-btn"
                    onClick={() => void handleSimulateCompleteFlow("PAID")}
                    className="gp-touch-btn inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#112645]/12 bg-[var(--gp-white)] px-3.5 py-2 text-xs font-medium text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.04]"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
                    <span>Simular PAID ($0.01)</span>
                  </button>

                  <button
                    type="button"
                    data-testid="jury-simulate-late-btn"
                    onClick={() => void handleSimulateCompleteFlow("PAID_LATE")}
                    className="gp-touch-btn inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#112645]/12 bg-[var(--gp-white)] px-3.5 py-2 text-xs font-medium text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.04]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-[var(--gp-slate)]" />
                    <span>Simular PAID_LATE</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Pipeline de 4 etapas en tarjetas limpias de 1px */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE_STEPS.map((item) => {
              const completed = activeStep >= item.step;
              return (
                <Card
                  key={item.step}
                  data-testid={`jury-step-${item.step}`}
                  className="p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-[#112645]/[0.05] px-2 py-0.5 text-[11px] font-semibold text-[var(--gp-navy)]">
                      Etapa {item.step}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        completed
                          ? "bg-[var(--gp-mint)] text-[var(--gp-navy)]"
                          : "bg-[#112645]/[0.04] text-[var(--gp-slate)]"
                      }`}
                    >
                      {completed ? "Verificado" : "En espera"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-xs font-semibold text-[var(--gp-navy)]">
                    {item.title}
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--gp-slate)]">
                    {item.detail}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Inspector QR y Telemetría de Privacidad */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <Card className="flex flex-col items-center justify-center p-5 text-center md:col-span-5">
              {inspectedCharge ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#112645]/[0.05] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--gp-navy)]">
                      Folio #{formatShortFolio(inspectedCharge.numRef)}
                    </span>
                    <StatusChip status={inspectedCharge.status} />
                  </div>
                  <div className="gp-amount-display mt-2 text-3xl font-bold text-[var(--gp-navy)]">
                    {formatMxn(inspectedCharge.amount)}
                  </div>
                  <div className="mt-0.5 text-xs capitalize text-[var(--gp-slate)]">
                    {amountToSpanishWords(inspectedCharge.amount)}
                  </div>

                  <div className="mt-3 rounded-xl border border-[#112645]/[0.08] bg-[#112645]/[0.015] p-3">
                    <QrCodeCanvas
                      qrData={
                        inspectedCharge.qrData ??
                        JSON.stringify({
                          NAM: "GOTPAY JURADO",
                          AMO: inspectedCharge.amount,
                          REF: inspectedCharge.numRef,
                        })
                      }
                      size={210}
                    />
                  </div>

                  <div className="mt-3 flex w-full flex-wrap justify-center gap-2">
                    {inspectedCharge.status === "PENDING" && (
                      <button
                        type="button"
                        disabled={isReconciling}
                        onClick={() =>
                          void reconcileActiveCharge(inspectedCharge.id)
                        }
                        className="gp-touch-btn inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--gp-navy)] px-3.5 text-xs font-semibold text-[var(--gp-white)]"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            isReconciling ? "animate-spin" : ""
                          }`}
                        />
                        <span>
                          {isReconciling
                            ? "Consultando…"
                            : "Verificar pago"}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => replayChargeVoice(inspectedCharge)}
                      className="gp-touch-btn inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#112645]/12 bg-[var(--gp-white)] px-3.5 text-xs font-medium text-[var(--gp-navy)] hover:bg-[#112645]/[0.04]"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
                      <span>Escuchar Locución</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--gp-slate)]">
                  Selecciona «Probar GotPay con $0.01 MXN reales» para iniciar.
                </p>
              )}
            </Card>

            <Card className="md:col-span-7">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-[var(--gp-blue)]" />
                    <CardTitle className="text-base font-semibold">
                      Inspector de Privacidad y Telemetría
                    </CardTitle>
                  </div>
                  {inspectedCharge && (
                    <StatusChip status={inspectedCharge.status} />
                  )}
                </div>
                <CardDescription>
                  Regla Sec. 16.4: jamás se almacena ni transmite al cliente web
                  la CLABE de 18 dígitos del comprador; únicamente clabeLast4 y
                  bankCode.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {inspectedCharge && (
                  <div className="space-y-2.5 rounded-xl border border-[#112645]/[0.08] bg-[#112645]/[0.015] p-4 font-mono text-xs">
                    <div className="flex justify-between border-b border-[#112645]/[0.06] pb-2">
                      <span className="text-[var(--gp-slate)]">
                        charge.id (ULID):
                      </span>
                      <span className="font-semibold text-[var(--gp-navy)]">
                        {inspectedCharge.id}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#112645]/[0.06] pb-2">
                      <span className="text-[var(--gp-slate)]">
                        charge.numRef (7 dígitos):
                      </span>
                      <span className="font-semibold text-[var(--gp-navy)]">
                        {inspectedCharge.numRef}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#112645]/[0.06] pb-2">
                      <span className="text-[var(--gp-slate)]">
                        charge.status:
                      </span>
                      <span className="font-semibold text-[var(--gp-navy)]">
                        {inspectedCharge.status}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#112645]/[0.06] pb-2">
                      <span className="inline-flex items-center gap-1 text-[var(--gp-slate)]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
                        <span>charge.clabeLast4 (enmascarado):</span>
                      </span>
                      <span
                        data-testid="jury-clabe-last4"
                        className="font-semibold text-[var(--gp-navy)]"
                      >
                        ••••{" "}
                        {sanitizeClabeLast4(inspectedCharge.clabeLast4) ??
                          "Pendiente"}{" "}
                        ({getBankShortName(inspectedCharge.bankCode)})
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-[var(--gp-slate)]">
                        Locución generada (es-MX):
                      </span>
                      <span className="rounded-lg border border-[#112645]/[0.08] bg-[var(--gp-white)] p-2.5 font-sans font-medium text-[var(--gp-navy)]">
                        {buildChargeAnnouncement({
                          amount: inspectedCharge.amount,
                          status:
                            inspectedCharge.status === "PAID_LATE"
                              ? "PAID_LATE"
                              : "PAID",
                          numRef: inspectedCharge.numRef,
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <PaymentOverlay
        charge={overlayCharge}
        onDismiss={dismissOverlay}
        onReplayVoice={replayChargeVoice}
      />
    </div>
  );
}
