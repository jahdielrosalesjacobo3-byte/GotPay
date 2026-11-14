"use client";

import { ActiveChargeModal } from "@/components/ActiveChargeModal";
import { GotPayLogo } from "@/components/GotPayLogo";
import { MerchantDashboard } from "@/components/MerchantDashboard";
import { PaymentOverlay } from "@/components/PaymentOverlay";
import { PosKeypad } from "@/components/PosKeypad";
import { ShiftHistoryStrip } from "@/components/ShiftHistoryStrip";
import { useGotPayPos } from "@/components/useGotPayPos";
import {
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronRight,
  LayoutGrid,
  ListFilter,
  PanelLeft,
  RefreshCw,
  Scale,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

type WorkspaceSection = "all" | "pos" | "dashboard" | "transactions";

export default function GotPayCashierPage() {
  const {
    engineMode,
    setEngineMode,
    turnOpen,
    openTurn,
    hardware,
    charges,
    summary,
    activeCharge,
    overlayCharge,
    dismissOverlay,
    sseState,
    pollTickCount,
    isSubmitting,
    isReconciling,
    statusBanner,
    chargeError,
    clearChargeError,
    createCharge,
    reconcileActiveCharge,
    cancelActiveCharge,
    simulateChargeOutcome,
    triggerSseReconnectTest,
    replayChargeVoice,
  } = useGotPayPos("api");

  const [activeView, setActiveView] = useState<WorkspaceSection>("all");
  const [amountStr, setAmountStr] = useState<string>("0.01");
  const [concept, setConcept] = useState<string>("Cobro en mostrador");

  const handleQuickAmount = (val: number, defaultConcept?: string) => {
    setAmountStr(String(val));
    if (defaultConcept) {
      setConcept(defaultConcept);
    }
  };

  const handleCreateQrCharge = async () => {
    const amount = Number.parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    await createCharge({
      amount,
      concept: concept.trim() || "Cobro en mostrador",
      channel: "CODI_QR",
      expirationSeconds: 360,
    });
  };

  const handleCreatePushCharge = async (phone: string) => {
    const amount = Number.parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    await createCharge({
      amount,
      concept: concept.trim() || "Cobro en mostrador",
      channel: "CODI_PUSH",
      phone,
      expirationSeconds: 360,
    });
  };

  const handleSendPushFromModal = async (
    amount: number,
    chargeConcept: string,
    phone: string,
  ) => {
    await createCharge({
      amount,
      concept: chargeConcept,
      channel: "CODI_PUSH",
      phone,
      expirationSeconds: 360,
    });
  };

  const triggerInstantVoiceDemo = (
    amount: number,
    numRef: string,
    outcome: "PAID" | "PAID_LATE",
    demoConcept: string,
  ) => {
    const now = Date.now();
    simulateChargeOutcome(
      {
        id: `01M7VOICEDEMO${now}`,
        numRef,
        amount,
        concept: demoConcept,
        channel: "CODI_QR",
        status: "PENDING",
        bankCode: 40012,
        clabeLast4: "5713",
        createdAt: now - 5000,
        expiresAt: now + 295000,
      },
      outcome,
    );
  };

  const navItems: ReadonlyArray<{
    readonly id: WorkspaceSection;
    readonly label: string;
    readonly shortLabel: string;
    readonly testId: string;
    readonly icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "all",
      label: "Panel General",
      shortLabel: "General",
      testId: "nav-view-all",
      icon: LayoutGrid,
    },
    {
      id: "pos",
      label: "Cobro Rápido CoDi",
      shortLabel: "Cobro POS",
      testId: "nav-view-pos",
      icon: Calculator,
    },
    {
      id: "dashboard",
      label: "Analítica del Turno",
      shortLabel: "Analítica",
      testId: "nav-view-dashboard",
      icon: BarChart3,
    },
    {
      id: "transactions",
      label: "Transacciones",
      shortLabel: "Transacciones",
      testId: "nav-view-transactions",
      icon: ListFilter,
    },
  ];

  const currentNavLabel =
    navItems.find((i) => i.id === activeView)?.label ?? "Panel General";

  const quickDemoHandler = () => {
    setAmountStr("0.01");
    setConcept("Demo GotPay $0.01");
    void createCharge({
      amount: 0.01,
      concept: "Demo GotPay $0.01",
      channel: "CODI_QR",
      expirationSeconds: 360,
    });
  };

  return (
    <div className="flex min-h-screen bg-[#f4f6f9] text-[var(--gp-navy)]">
      {/* Sidebar Inset Limpio (Visible desde md: 768px+, Estilo shadcn-fintech + Horizon) */}
      <aside
        aria-label="Navegación principal de GotPay"
        className="hidden w-56 shrink-0 flex-col justify-between px-3 py-4 md:flex"
      >
        <div className="space-y-5">
          {/* Header de marca en Sidebar */}
          <div className="flex items-center gap-2.5 px-2">
            <GotPayLogo variant="icon" className="h-8 w-8 rounded-lg" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-[var(--gp-navy)]">
                GotPay
              </div>
              <div className="truncate text-xs text-[var(--gp-slate)]">
                Terminal FinTech CoDi
              </div>
            </div>
          </div>

          {/* Grupo: Operación */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-medium text-[var(--gp-slate)]/75">
              Operación
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={item.testId}
                    onClick={() => setActiveView(item.id)}
                    className={`gp-touch-btn flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      isCurrent
                        ? "gp-gradient-bg font-semibold text-[var(--gp-white)] shadow-xs"
                        : "text-[var(--gp-slate)] hover:bg-[#112645]/[0.05] hover:text-[var(--gp-navy)]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Grupo: Evaluación */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-medium text-[var(--gp-slate)]/75">
              Verificación
            </div>
            <Link
              href="/jurado"
              data-testid="sidebar-jury-link"
              className="gp-touch-btn flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--gp-slate)] transition hover:bg-[#112645]/[0.05] hover:text-[var(--gp-navy)]"
            >
              <Scale className="h-4 w-4 shrink-0 text-[var(--gp-blue)]" />
              <span>Modo Jurado ($0.01)</span>
            </Link>
          </div>
        </div>

        {/* Footer del Sidebar estilo NavUser de shadcn-fintech */}
        <div className="space-y-2.5">
          <div className="rounded-xl border border-[#112645]/[0.08] bg-[var(--gp-white)] p-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--gp-navy)]">
                Estado de Bocina
              </span>
              <span
                data-testid="turn-status-badge"
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  turnOpen
                    ? "bg-[var(--gp-mint)] text-[var(--gp-navy)]"
                    : "bg-[#112645]/[0.06] text-[var(--gp-slate)]"
                }`}
              >
                {turnOpen ? "Activa" : "Pendiente"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--gp-slate)]">
              Voz es-MX · WakeLock {hardware.wakeLockActive ? "ON" : "Listo"}
            </p>
            <button
              type="button"
              onClick={() => void openTurn()}
              className="gp-touch-btn mt-2.5 flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--gp-navy)] px-2.5 py-1.5 text-xs font-medium text-[var(--gp-white)] transition hover:opacity-95"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>{turnOpen ? "Probar audio" : "Activar turno"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--gp-navy)] text-xs font-semibold text-[var(--gp-white)]">
              GP
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-semibold text-[var(--gp-navy)]">
                Comercio Mostrador
              </div>
              <div className="truncate font-mono text-[11px] text-[var(--gp-slate)]">
                CLABE •••• 5713
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Panel Principal Inset (Estilo SidebarInset de shadcn-fintech) */}
      <div className="flex min-w-0 flex-1 flex-col bg-[var(--gp-white)] md:m-2 md:ml-0 md:rounded-2xl md:border md:border-[#112645]/[0.08] md:shadow-xs">
        {/* Header Minimalista h-14 con Breadcrumb y Controles Discretos */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#112645]/[0.08] bg-[var(--gp-white)]/95 px-4 backdrop-blur md:rounded-t-2xl sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="md:hidden">
              <GotPayLogo variant="icon" className="h-7 w-7 rounded-md" />
            </div>
            <PanelLeft className="hidden h-4 w-4 text-[var(--gp-slate)] md:block" />
            <div className="hidden h-4 w-px bg-[#112645]/10 md:block" />
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs"
            >
              <span className="font-medium text-[var(--gp-slate)]">GotPay</span>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--gp-slate)]/50" />
              <span className="font-semibold text-[var(--gp-navy)]">
                {currentNavLabel}
              </span>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Indicador SSE discreto */}
            <div
              data-testid="sse-status-pill"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#112645]/10 bg-[#112645]/[0.02] px-2.5 text-xs font-medium text-[var(--gp-navy)]"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  sseState === "connected"
                    ? "bg-[var(--gp-mint)]"
                    : "bg-[var(--gp-amber)]"
                }`}
              />
              <span className="hidden sm:inline">
                {sseState === "connected"
                  ? "SSE Activo"
                  : sseState === "reconnecting"
                    ? "Reconectando SSE"
                    : "Simulador"}
              </span>
              <button
                type="button"
                data-testid="test-sse-reconnect-btn"
                onClick={triggerSseReconnectTest}
                title="Probar reconexión SSE"
                className="ml-1 rounded p-0.5 text-[var(--gp-slate)] hover:bg-[#112645]/[0.06] hover:text-[var(--gp-navy)]"
              >
                <RefreshCw className="h-3 w-3" />
                <span className="sr-only">Reconectar SSE</span>
              </button>
            </div>

            {/* Selector API / Mock */}
            <div className="inline-flex h-8 items-center rounded-lg border border-[#112645]/10 bg-[#112645]/[0.03] p-0.5">
              <button
                type="button"
                data-testid="engine-mode-api"
                onClick={() => setEngineMode("api")}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  engineMode === "api"
                    ? "bg-[var(--gp-white)] text-[var(--gp-navy)] shadow-2xs"
                    : "text-[var(--gp-slate)] hover:text-[var(--gp-navy)]"
                }`}
              >
                API Real
              </button>
              <button
                type="button"
                data-testid="engine-mode-mock"
                onClick={() => setEngineMode("mock")}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  engineMode === "mock"
                    ? "bg-[var(--gp-white)] text-[var(--gp-navy)] shadow-2xs"
                    : "text-[var(--gp-slate)] hover:text-[var(--gp-navy)]"
                }`}
              >
                Mock Local
              </button>
            </div>

            {/* Botón de Apertura de Turno / Bocina */}
            <button
              type="button"
              data-testid="open-turn-btn"
              onClick={() => void openTurn()}
              className={`gp-touch-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                turnOpen
                  ? "border border-[#112645]/12 bg-[var(--gp-white)] text-[var(--gp-navy)] hover:bg-[#112645]/[0.03]"
                  : "bg-[var(--gp-navy)] text-[var(--gp-white)] shadow-2xs hover:opacity-95"
              }`}
            >
              {turnOpen ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              <span>
                {turnOpen ? "Bocina Lista" : "Abrir Turno y Bocina"}
              </span>
            </button>

            <Link
              href="/jurado"
              data-testid="jury-mode-link"
              className="gp-touch-btn hidden h-8 items-center gap-1.5 rounded-lg border border-[#112645]/12 bg-[var(--gp-white)] px-2.5 text-xs font-medium text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.03] sm:inline-flex"
            >
              <Scale className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
              <span>Jurado ($0.01)</span>
            </Link>
          </div>
        </header>

        {/* Navegación móvil compacta (<768px) */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[#112645]/[0.08] px-4 py-2 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`mobile-${item.testId}`}
                onClick={() => setActiveView(item.id)}
                className={`gp-touch-btn inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
                  isCurrent
                    ? "bg-[var(--gp-navy)] text-[var(--gp-white)]"
                    : "text-[var(--gp-slate)] hover:bg-[#112645]/[0.05]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Contenido Principal estilo Horizon + shadcn-fintech */}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4 sm:p-5">
          {/* HeaderBox estilo Horizon + barra de prueba de locución monocromática */}
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--gp-navy)] sm:text-xl">
                Bienvenido a{" "}
                <span className="text-[var(--gp-blue)]">GotPay</span>
              </h1>
              <p className="text-xs text-[var(--gp-slate)]">
                Terminal de cobro CoDi sin comisiones y confirmación por voz en
                tiempo real.
              </p>
              {hardware.lastSpokenText && (
                <p
                  data-testid="last-spoken-banner"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-[#112645]/[0.04] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--gp-navy)]"
                >
                  <Volume2 className="h-3 w-3 text-[var(--gp-blue)]" />
                  <span>Última locución: «{hardware.lastSpokenText}»</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium text-[var(--gp-slate)]">
                Probar voz:
              </span>
              <button
                type="button"
                data-testid="voice-test-001"
                onClick={() =>
                  triggerInstantVoiceDemo(
                    0.01,
                    "1000004",
                    "PAID",
                    "Prueba centavo GotPay",
                  )
                }
                className="gp-touch-btn h-7 rounded-md border border-[#112645]/10 bg-[var(--gp-white)] px-2.5 text-xs font-medium text-[var(--gp-navy)] shadow-2xs transition hover:bg-[#112645]/[0.04]"
              >
                $0.01
              </button>
              <button
                type="button"
                data-testid="voice-test-20"
                onClick={() =>
                  triggerInstantVoiceDemo(20, "1000005", "PAID", "Agua fresca")
                }
                className="gp-touch-btn h-7 rounded-md border border-[#112645]/10 bg-[var(--gp-white)] px-2.5 text-xs font-medium text-[var(--gp-navy)] shadow-2xs transition hover:bg-[#112645]/[0.04]"
              >
                $20
              </button>
              <button
                type="button"
                data-testid="voice-test-8550"
                onClick={() =>
                  triggerInstantVoiceDemo(
                    85.5,
                    "1000006",
                    "PAID",
                    "Orden de comida",
                  )
                }
                className="gp-touch-btn h-7 rounded-md border border-[#112645]/10 bg-[var(--gp-white)] px-2.5 text-xs font-medium text-[var(--gp-navy)] shadow-2xs transition hover:bg-[#112645]/[0.04]"
              >
                $85.50
              </button>
              <button
                type="button"
                data-testid="voice-test-late"
                onClick={() =>
                  triggerInstantVoiceDemo(
                    50,
                    "1000009",
                    "PAID_LATE",
                    "Orden vencida",
                  )
                }
                className="gp-touch-btn h-7 rounded-md border border-[#112645]/10 bg-[var(--gp-white)] px-2.5 text-xs font-medium text-[var(--gp-navy)] shadow-2xs transition hover:bg-[#112645]/[0.04]"
              >
                Pago tardío
              </button>
            </div>
          </div>

          {chargeError && (
            <div
              role="alert"
              data-testid="charge-error-banner"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-900"
            >
              <span>{chargeError}</span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearChargeError();
                    setEngineMode("mock");
                  }}
                  className="gp-touch-btn h-7 rounded-md border border-red-300 bg-white px-2.5 text-xs font-medium text-red-900"
                >
                  Usar Mock Local
                </button>
                <button
                  type="button"
                  onClick={clearChargeError}
                  className="gp-touch-btn h-7 rounded-md border border-red-300 bg-white px-2.5 text-xs font-medium text-red-900"
                >
                  Cerrar
                </button>
              </span>
            </div>
          )}

          {statusBanner && (
            <div
              role="status"
              data-testid="status-banner"
              className="rounded-lg border border-[#112645]/12 bg-[#112645]/[0.03] px-3.5 py-2 text-xs font-medium text-[var(--gp-navy)]"
            >
              {statusBanner}
            </div>
          )}

          {/* Vista Integral: Bento Grid idéntico a shadcn-fintech (defaultBlocks) + Horizon */}
          {activeView === "all" && (
            <div className="space-y-4">
              <MerchantDashboard
                charges={charges}
                summary={summary}
                sseState={sseState}
                turnOpen={turnOpen}
                wakeLockActive={hardware.wakeLockActive}
                onQuickCreateDemo={quickDemoHandler}
                posWidget={
                  <PosKeypad
                    amountStr={amountStr}
                    concept={concept}
                    isSubmitting={isSubmitting}
                    onAmountChange={setAmountStr}
                    onQuickAmount={handleQuickAmount}
                    onConceptChange={setConcept}
                    onCreateQrCharge={handleCreateQrCharge}
                    onCreatePushCharge={handleCreatePushCharge}
                  />
                }
              />

              <ShiftHistoryStrip
                charges={charges}
                summary={summary}
                onReplayVoice={replayChargeVoice}
                onCreateDemoCharge={quickDemoHandler}
              />
            </div>
          )}

          {activeView === "pos" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-5">
                <PosKeypad
                  amountStr={amountStr}
                  concept={concept}
                  isSubmitting={isSubmitting}
                  onAmountChange={setAmountStr}
                  onQuickAmount={handleQuickAmount}
                  onConceptChange={setConcept}
                  onCreateQrCharge={handleCreateQrCharge}
                  onCreatePushCharge={handleCreatePushCharge}
                />
              </div>
              <div className="md:col-span-7">
                <ShiftHistoryStrip
                  charges={charges}
                  summary={summary}
                  onReplayVoice={replayChargeVoice}
                  onCreateDemoCharge={quickDemoHandler}
                />
              </div>
            </div>
          )}

          {activeView === "dashboard" && (
            <div className="space-y-4">
              <MerchantDashboard
                charges={charges}
                summary={summary}
                sseState={sseState}
                turnOpen={turnOpen}
                wakeLockActive={hardware.wakeLockActive}
                onQuickCreateDemo={quickDemoHandler}
              />
              <ShiftHistoryStrip
                charges={charges}
                summary={summary}
                onReplayVoice={replayChargeVoice}
              />
            </div>
          )}

          {activeView === "transactions" && (
            <ShiftHistoryStrip
              charges={charges}
              summary={summary}
              onReplayVoice={replayChargeVoice}
              onCreateDemoCharge={quickDemoHandler}
            />
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#112645]/[0.08] pt-3 text-[11px] text-[var(--gp-slate)]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
              <span>
                GotPay («Ya me pagaron / Ya cayó») · Hackatón México 2026
              </span>
            </span>
            <span>
              Aplicación independiente. No sugiere respaldo oficial de Banco de
              México ni de pey.
            </span>
          </footer>
        </main>
      </div>

      {/* Modal de cobro activo con QR y pestaña Push */}
      <ActiveChargeModal
        charge={activeCharge}
        isReconciling={isReconciling}
        isCreatingPush={isSubmitting}
        pollTickCount={pollTickCount}
        sseState={sseState}
        onReconcile={reconcileActiveCharge}
        onCancel={cancelActiveCharge}
        onSendPushAlternative={handleSendPushFromModal}
        onSimulateOutcome={simulateChargeOutcome}
      />

      {/* Overlay de confirmación a pantalla completa (4s auto-cierre) */}
      <PaymentOverlay
        charge={overlayCharge}
        onDismiss={dismissOverlay}
        onReplayVoice={replayChargeVoice}
      />
    </div>
  );
}
