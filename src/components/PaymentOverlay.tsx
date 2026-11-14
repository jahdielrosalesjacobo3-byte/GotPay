"use client";

import {
  amountToSpanishWords,
  buildChargeAnnouncement,
  formatShortFolio,
} from "@/lib/audio/announcer";
import {
  formatMxn,
  getBankShortName,
  sanitizeClabeLast4,
  sanitizeMaskedPhone,
} from "@/components/mockEngine";
import type { GotPayCharge } from "@/types/gotpay";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface PaymentOverlayProps {
  readonly charge: GotPayCharge | null;
  readonly onDismiss: () => void;
  readonly onReplayVoice: (charge: GotPayCharge) => void;
}

const AUTO_DISMISS_MS = 4000;

export function PaymentOverlay({
  charge,
  onDismiss,
  onReplayVoice,
}: PaymentOverlayProps) {
  const [remainingMs, setRemainingMs] = useState<number>(AUTO_DISMISS_MS);

  useEffect(() => {
    if (!charge) {
      return;
    }
    setRemainingMs(AUTO_DISMISS_MS);
    const startedAt = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, AUTO_DISMISS_MS - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [charge, onDismiss]);

  if (!charge || (charge.status !== "PAID" && charge.status !== "PAID_LATE")) {
    return null;
  }

  const isLate = charge.status === "PAID_LATE";
  // Regla de marca: PAID = fondo menta (#0ADDA9) + texto navy (#112645, 8.6:1).
  // PAID_LATE = fondo ámbar (#F5A524) + texto navy (#112645, 7.42:1).
  const bgClass = isLate
    ? "bg-[var(--gp-amber)] text-[var(--gp-navy)]"
    : "bg-[var(--gp-mint)] text-[var(--gp-navy)]";

  const maskedClabe = sanitizeClabeLast4(charge.clabeLast4);
  const maskedPhone = sanitizeMaskedPhone(charge.payerPhoneMasked);
  const shortFolio = formatShortFolio(charge.numRef);
  const words = amountToSpanishWords(charge.amount);
  const spokenPhrase = buildChargeAnnouncement(charge);
  const progressPct = Math.round((remainingMs / AUTO_DISMISS_MS) * 100);

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={isLate ? "Alerta de pago tardío" : "Confirmación de pago"}
      data-testid="payment-overlay"
      data-overlay-status={charge.status}
      className={`fixed inset-0 z-50 flex flex-col justify-between p-5 sm:p-10 ${bgClass}`}
    >
      {/* Barra superior con temporizador de auto-cierre (4s) */}
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[var(--gp-navy)] sm:text-sm">
          <span className="inline-flex items-center gap-2">
            {isLate ? (
              <AlertTriangle className="h-4 w-4 stroke-[2.5]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
            )}
            <span>
              {isLate
                ? "ATENCIÓN EN CAJA GOTPAY · REVISAR ORDEN ANTES DE ENTREGAR"
                : "CONFIRMACIÓN INSTANTÁNEA GOTPAY · 0% COMISIÓN"}
            </span>
          </span>
          <span className="font-mono font-black">
            Auto-cierre en {Math.ceil(remainingMs / 1000)} s
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--gp-navy)]/20">
          <div
            className="h-full bg-[var(--gp-navy)] transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Comprobante central de alto contraste legible a >2 metros */}
      <div className="mx-auto my-auto flex w-full max-w-3xl flex-col items-center text-center">
        <div className="mb-4 inline-flex items-center gap-2.5 rounded-full bg-[var(--gp-navy)] px-6 py-2.5 text-base font-black uppercase tracking-widest text-[var(--gp-white)] shadow-lg sm:text-lg">
          {isLate ? (
            <AlertTriangle className="h-5 w-5 text-[var(--gp-amber)]" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-[var(--gp-mint)]" />
          )}
          <span>{isLate ? "PAGO TARDÍO" : "¡YA CAYÓ!"}</span>
          <span>·</span>
          <span>FOLIO {shortFolio}</span>
        </div>

        <h1 className="gp-amount-display text-6xl font-black tracking-tight text-[var(--gp-navy)] sm:text-8xl">
          {formatMxn(charge.amount)}
        </h1>

        <p className="mt-2 text-2xl font-extrabold capitalize text-[var(--gp-navy)] sm:text-3xl">
          «{words}»
        </p>

        {isLate && (
          <div className="mt-4 max-w-xl rounded-2xl border-2 border-[var(--gp-navy)] bg-[var(--gp-white)] px-5 py-3 text-sm font-black text-[var(--gp-navy)] shadow-md sm:text-base">
            Este pago se acreditó después de vencido o cancelado el cobro original. Verifica la orden antes de entregar mercancía.
          </div>
        )}

        {/* Recibo estructurado estilo Fintech (CERO CLABE de 18 dígitos) */}
        <div className="mt-6 grid w-full grid-cols-2 gap-3 rounded-2xl border-2 border-[var(--gp-navy)] bg-[var(--gp-white)] p-5 text-left text-[var(--gp-navy)] shadow-xl sm:grid-cols-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--gp-slate)]">
              Folio de Referencia
            </div>
            <div className="mt-1 font-mono text-lg font-black text-[var(--gp-navy)]">
              #{charge.numRef}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--gp-slate)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--gp-blue)]" />
              <span>Cuenta Pagadora</span>
            </div>
            <div
              data-testid="overlay-clabe-masked"
              className="mt-1 font-mono text-lg font-black text-[var(--gp-navy)]"
            >
              {maskedClabe
                ? `CLABE •••• ${maskedClabe}`
                : maskedPhone
                  ? `Tel ${maskedPhone}`
                  : "Protegida"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--gp-slate)]">
              Institución Emisora
            </div>
            <div className="mt-1 text-lg font-black text-[var(--gp-navy)]">
              {getBankShortName(charge.bankCode)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--gp-slate)]">
              Concepto
            </div>
            <div className="mt-1 truncate text-base font-extrabold text-[var(--gp-navy)]">
              {charge.concept}
            </div>
          </div>
        </div>

        {/* Transcripción exacta de la locución es-MX */}
        <div
          data-testid="overlay-spoken-phrase"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--gp-navy)]/20 bg-[var(--gp-navy)]/10 px-4 py-2 text-xs font-extrabold text-[var(--gp-navy)] sm:text-sm"
        >
          <Volume2 className="h-4 w-4 shrink-0" />
          <span>Locución es-MX: «{spokenPhrase}»</span>
        </div>
      </div>

      {/* Botonera inferior con objetivos táctiles >= 48px */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onReplayVoice(charge)}
          className="gp-touch-btn inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[var(--gp-navy)] bg-[var(--gp-white)] px-6 py-3.5 text-base font-black text-[var(--gp-navy)] shadow-md transition active:scale-[0.99]"
        >
          <Volume2 className="h-5 w-5" />
          <span>Repetir Voz en Bocina</span>
        </button>
        <button
          type="button"
          data-testid="overlay-dismiss-btn"
          onClick={onDismiss}
          className="gp-touch-btn inline-flex min-h-[52px] flex-[2] items-center justify-center gap-2 rounded-xl bg-[var(--gp-navy)] px-8 py-3.5 text-lg font-black text-[var(--gp-white)] shadow-xl transition active:scale-[0.99]"
        >
          <span>Listo · Siguiente Cliente</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
