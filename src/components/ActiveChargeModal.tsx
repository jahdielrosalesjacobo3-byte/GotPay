"use client";

import { formatMxn, sanitizeMaskedPhone } from "@/components/mockEngine";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { amountToSpanishWords, formatShortFolio } from "@/lib/audio/announcer";
import { describeChargeStatus, type GotPayCharge } from "@/types/gotpay";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface ActiveChargeModalProps {
  readonly charge: GotPayCharge | null;
  readonly isReconciling: boolean;
  readonly isCreatingPush: boolean;
  readonly pollTickCount: number;
  readonly sseState: "connected" | "reconnecting" | "mock";
  readonly onReconcile: (chargeId: string) => Promise<void>;
  readonly onCancel: (chargeId: string) => Promise<void>;
  readonly onSendPushAlternative: (
    amount: number,
    concept: string,
    phone: string,
  ) => Promise<void>;
  readonly onSimulateOutcome: (
    charge: GotPayCharge,
    outcome: "PAID" | "PAID_LATE",
  ) => void;
}

function formatCountdown(msLeft: number): string {
  const totalSec = Math.max(0, Math.ceil(msLeft / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ActiveChargeModal({
  charge,
  isReconciling,
  isCreatingPush,
  pollTickCount,
  sseState,
  onReconcile,
  onCancel,
  onSendPushAlternative,
  onSimulateOutcome,
}: ActiveChargeModalProps) {
  const [activeTab, setActiveTab] = useState<"CODI_QR" | "CODI_PUSH">(
    "CODI_QR",
  );
  const [pushPhone, setPushPhone] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    if (!charge) {
      return;
    }
    setActiveTab(charge.channel === "CODI_PUSH" ? "CODI_PUSH" : "CODI_QR");
    setRemainingMs(Math.max(0, charge.expiresAt - Date.now()));

    const timer = setInterval(() => {
      setRemainingMs(Math.max(0, charge.expiresAt - Date.now()));
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, [charge]);

  if (!charge) {
    return null;
  }

  const isExpired = remainingMs <= 0 || charge.status === "EXPIRED";
  const shortFolio = formatShortFolio(charge.numRef);
  const maskedPhone = sanitizeMaskedPhone(charge.payerPhoneMasked);

  const handlePushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = pushPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setPhoneError("Ingresa los 10 dígitos del celular del comprador.");
      return;
    }
    setPhoneError(null);
    await onSendPushAlternative(charge.amount, charge.concept, digits);
    setPushPhone("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cobro activo en espera de pago"
      data-testid="active-charge-modal"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[var(--gp-navy)]/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#112645]/12 bg-[var(--gp-white)] p-6 text-[var(--gp-navy)] shadow-2xl">
        {/* Encabezado limpio estilo DialogHeader de shadcn-fintech */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#112645]/[0.08] pb-3.5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[var(--gp-navy)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--gp-white)]">
              Folio #{shortFolio}
            </span>
            <span className="text-xs font-medium text-[var(--gp-slate)]">
              {describeChargeStatus(charge.status)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="modal-polling-badge"
              className="rounded-md border border-[#112645]/10 bg-[#112645]/[0.03] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--gp-slate)]"
            >
              {sseState === "connected"
                ? `SSE + Poll 2s (#${pollTickCount})`
                : sseState === "reconnecting"
                  ? `Reconectando · Poll 2s (#${pollTickCount})`
                  : `Simulador · Poll 2s (#${pollTickCount})`}
            </span>
            <span
              data-testid="charge-countdown"
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-xs font-semibold ${
                isExpired
                  ? "bg-[var(--gp-amber)] text-[var(--gp-navy)]"
                  : "bg-[#112645]/[0.06] text-[var(--gp-navy)]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>
                {isExpired ? "EXPIRADO" : formatCountdown(remainingMs)}
              </span>
            </span>
          </div>
        </div>

        {/* Importe principal en Navy */}
        <div className="mt-4 text-center">
          <div
            data-testid="active-charge-amount"
            className="gp-amount-display text-4xl font-bold tracking-tight text-[var(--gp-navy)] sm:text-5xl"
          >
            {formatMxn(charge.amount)}
          </div>
          <p className="mt-1 text-xs font-medium capitalize text-[var(--gp-slate)]">
            {amountToSpanishWords(charge.amount)} · {charge.concept}
          </p>
        </div>

        {/* Selector QR vs Push */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-[#112645]/[0.05] p-1">
          <button
            type="button"
            data-testid="tab-codi-qr"
            onClick={() => setActiveTab("CODI_QR")}
            className={`gp-touch-btn inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "CODI_QR"
                ? "bg-[var(--gp-white)] text-[var(--gp-navy)] shadow-2xs"
                : "text-[var(--gp-slate)] hover:text-[var(--gp-navy)]"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>QR en Mostrador</span>
          </button>
          <button
            type="button"
            data-testid="tab-codi-push"
            onClick={() => setActiveTab("CODI_PUSH")}
            className={`gp-touch-btn inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "CODI_PUSH"
                ? "bg-[var(--gp-white)] text-[var(--gp-navy)] shadow-2xs"
                : "text-[var(--gp-slate)] hover:text-[var(--gp-navy)]"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Cobro al Celular (Push)</span>
          </button>
        </div>

        {/* Contenido QR o Push */}
        {activeTab === "CODI_QR" ? (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-[#112645]/[0.08] bg-[#112645]/[0.015] p-4">
            <QrCodeCanvas
              qrData={
                charge.qrData ??
                JSON.stringify({
                  NAM: "GOTPAY",
                  AMO: charge.amount,
                  REF: charge.numRef,
                })
              }
              size={250}
            />
            <p className="mt-2.5 text-center text-xs text-[var(--gp-slate)]">
              Escanea desde cualquier app bancaria con CoDi · 0% comisión
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[#112645]/[0.08] bg-[#112645]/[0.015] p-4">
            {charge.channel === "CODI_PUSH" && maskedPhone ? (
              <div className="mb-3 text-center">
                <span className="inline-block rounded-md bg-[var(--gp-mint)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--gp-navy)]">
                  Solicitud Push Enviada
                </span>
                <p
                  data-testid="masked-push-phone"
                  className="mt-1.5 font-mono text-lg font-bold text-[var(--gp-navy)]"
                >
                  Celular destino: {maskedPhone}
                </p>
                <p className="text-[11px] text-[var(--gp-slate)]">
                  Privacidad activa: nunca almacenamos el teléfono completo.
                </p>
              </div>
            ) : null}

            <form onSubmit={handlePushSubmit} className="space-y-2.5">
              <label className="block text-xs font-medium text-[var(--gp-navy)]">
                Enviar notificación de cobro al celular (10 dígitos):
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={pushPhone}
                  onChange={(e) =>
                    setPushPhone(
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="Ej. 5512345678"
                  data-testid="push-phone-input"
                  className="h-10 flex-1 rounded-lg border border-[#112645]/15 bg-[var(--gp-white)] px-3 font-mono text-sm font-semibold text-[var(--gp-navy)] focus:border-[var(--gp-blue)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isCreatingPush}
                  data-testid="send-push-btn"
                  className="gp-touch-btn h-10 rounded-lg bg-[var(--gp-navy)] px-4 text-xs font-semibold text-[var(--gp-white)] disabled:opacity-50"
                >
                  {isCreatingPush ? "Enviando…" : "Enviar Push"}
                </button>
              </div>
              {phoneError && (
                <p className="text-xs font-medium text-[var(--gp-navy)] underline decoration-[var(--gp-amber)]">
                  {phoneError}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Acciones de Reconciliación y Cancelación */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={isReconciling}
            data-testid="reconcile-now-btn"
            onClick={() => void onReconcile(charge.id)}
            className="gp-touch-btn inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[var(--gp-navy)] px-4 py-2 text-xs font-semibold text-[var(--gp-white)] transition hover:opacity-95 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isReconciling ? "animate-spin" : ""}`}
            />
            <span>
              {isReconciling
                ? "Verificando estado…"
                : "Verificar pago ahora"}
            </span>
          </button>

          <button
            type="button"
            data-testid="cancel-charge-btn"
            onClick={() => void onCancel(charge.id)}
            className="gp-touch-btn inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[#112645]/15 bg-[var(--gp-white)] px-4 py-2 text-xs font-semibold text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.04]"
          >
            <X className="h-3.5 w-3.5" />
            <span>Cancelar cobro</span>
          </button>
        </div>

        {/* Simulador discreto para pruebas sin recuadros multicolores */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#112645]/[0.08] pt-3">
          <span className="text-[11px] font-medium text-[var(--gp-slate)]">
            Simulación de webhook:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="simulate-paid-btn"
              onClick={() => onSimulateOutcome(charge, "PAID")}
              className="gp-touch-btn inline-flex min-h-[34px] items-center gap-1 rounded-md border border-[#112645]/12 bg-[#112645]/[0.03] px-2.5 py-1 text-xs font-medium text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.07]"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
              <span>Confirmado (PAID)</span>
            </button>
            <button
              type="button"
              data-testid="simulate-late-btn"
              onClick={() => onSimulateOutcome(charge, "PAID_LATE")}
              className="gp-touch-btn inline-flex min-h-[34px] items-center gap-1 rounded-md border border-[#112645]/12 bg-[#112645]/[0.03] px-2.5 py-1 text-xs font-medium text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.07]"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--gp-slate)]" />
              <span>Pago tardío (PAID_LATE)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
