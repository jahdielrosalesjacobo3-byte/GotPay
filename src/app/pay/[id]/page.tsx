"use client";

import { formatMxn } from "@/components/mockEngine";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { formatShortFolio } from "@/lib/audio/announcer";
import {
  describeChargeStatus,
  type ChargeStatus,
  type GotPayCharge,
} from "@/types/gotpay";
import { Clock } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function formatCountdown(msLeft: number): string {
  const totalSec = Math.max(0, Math.ceil(msLeft / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function isAwaitingPayment(status: ChargeStatus): boolean {
  return status === "CREATED" || status === "PENDING";
}

function isPaid(status: ChargeStatus): boolean {
  return status === "PAID" || status === "PAID_LATE";
}

export default function PayChargePage() {
  const params = useParams();
  const rawId = params.id;
  const chargeId = typeof rawId === "string" ? rawId : "";

  const [charge, setCharge] = useState<GotPayCharge | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const fetchCharge = useCallback(async (): Promise<GotPayCharge | null> => {
    if (!chargeId) {
      setNotFound(true);
      return null;
    }
    try {
      const res = await fetch(`/api/charges/${encodeURIComponent(chargeId)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setNotFound(true);
        setCharge(null);
        return null;
      }
      if (!res.ok) {
        setLoadError("No pudimos cargar el cobro. Intenta de nuevo.");
        return null;
      }
      const payload = (await res.json()) as { charge?: GotPayCharge };
      const remote = payload.charge;
      if (!remote) {
        setLoadError("Respuesta inválida del servidor.");
        return null;
      }
      setNotFound(false);
      setLoadError(null);
      setCharge(remote);
      return remote;
    } catch {
      setLoadError("Sin conexión. Revisa tu red e intenta de nuevo.");
      return null;
    }
  }, [chargeId]);

  useEffect(() => {
    void fetchCharge();
  }, [fetchCharge]);

  useEffect(() => {
    if (!charge || !isAwaitingPayment(charge.status)) {
      return;
    }
    const interval = setInterval(() => {
      void fetchCharge();
    }, 2000);
    return () => clearInterval(interval);
  }, [charge, fetchCharge]);

  useEffect(() => {
    if (!charge) {
      return;
    }
    setRemainingMs(Math.max(0, charge.expiresAt - Date.now()));
    const timer = setInterval(() => {
      setRemainingMs(Math.max(0, charge.expiresAt - Date.now()));
    }, 500);
    return () => clearInterval(timer);
  }, [charge]);

  if (!chargeId || notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--gp-white)] p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-[var(--gp-navy)]">
            Cobro no encontrado
          </h1>
          <p className="mt-2 text-sm text-[var(--gp-slate)]">
            Verifica el enlace que te compartieron o pide uno nuevo al
            comercio.
          </p>
        </div>
      </main>
    );
  }

  if (loadError && !charge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--gp-white)] p-6">
        <div className="max-w-md text-center">
          <p className="text-base font-semibold text-[var(--gp-navy)]">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void fetchCharge()}
            className="gp-touch-btn mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--gp-navy)] px-6 text-sm font-semibold text-[var(--gp-white)]"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  if (!charge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--gp-white)] p-6">
        <p className="animate-pulse text-sm font-semibold text-[var(--gp-navy)]">
          Cargando cobro…
        </p>
      </main>
    );
  }

  if (isPaid(charge.status)) {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center bg-[var(--gp-paid-bg)] p-6 text-[var(--gp-paid-fg)]"
        data-testid="pay-page-paid"
      >
        <h1 className="text-3xl font-bold tracking-tight">Ya cayó</h1>
        <p className="mt-2 text-center text-sm font-medium">
          {describeChargeStatus(charge.status)}
        </p>
        <p className="gp-amount-display mt-6 text-4xl font-bold">
          {formatMxn(charge.amount)}
        </p>
        <p className="mt-1 text-sm capitalize opacity-90">{charge.concept}</p>
        <p className="mt-4 font-mono text-xs opacity-80">
          Folio #{formatShortFolio(charge.numRef)}
        </p>
      </main>
    );
  }

  const expired =
    charge.status === "EXPIRED" ||
    charge.status === "CANCELLED" ||
    remainingMs <= 0;
  const showQr =
    !expired && isAwaitingPayment(charge.status) && Boolean(charge.qrData);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col bg-[var(--gp-white)] px-4 py-8 text-[var(--gp-navy)]">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gp-slate)]">
          GotPay
        </p>
        <p className="gp-amount-display mt-2 text-4xl font-bold tracking-tight">
          {formatMxn(charge.amount)}
        </p>
        <p className="mt-1 text-sm font-medium capitalize text-[var(--gp-slate)]">
          {charge.concept}
        </p>
        <p className="mt-2 font-mono text-xs text-[var(--gp-navy)]">
          Folio #{formatShortFolio(charge.numRef)}
        </p>
      </header>

      <p className="mt-4 text-center text-sm font-semibold text-[var(--gp-navy)]">
        {describeChargeStatus(charge.status)}
      </p>

      {isAwaitingPayment(charge.status) && !expired ? (
        <div
          className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 self-center rounded-lg bg-[#112645]/[0.06] px-4 py-2 font-mono text-sm font-semibold text-[var(--gp-navy)]"
          data-testid="pay-countdown"
        >
          <Clock className="h-4 w-4" aria-hidden />
          <span>{formatCountdown(remainingMs)}</span>
        </div>
      ) : null}

      {expired ? (
        <div className="mt-8 rounded-xl border border-[#112645]/12 bg-[#112645]/[0.03] p-6 text-center">
          <p className="text-base font-bold text-[var(--gp-navy)]">
            {charge.status === "CANCELLED"
              ? "Este cobro fue cancelado."
              : "Este cobro ya no está disponible para pago."}
          </p>
          <p className="mt-2 text-sm text-[var(--gp-slate)]">
            Si ya pagaste, pide confirmación al comercio con tu folio.
          </p>
        </div>
      ) : null}

      {showQr ? (
        <section className="mt-8 flex flex-col items-center">
          <QrCodeCanvas
            qrData={
              charge.qrData ??
              JSON.stringify({
                NAM: "GOTPAY",
                AMO: charge.amount,
                REF: charge.numRef,
              })
            }
            size={280}
            allowSave
          />
          <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-[var(--gp-navy)]">
            Mantén presionado el QR, guárdalo y ábrelo desde la galería en tu
            app del banco
          </p>
        </section>
      ) : null}
    </main>
  );
}