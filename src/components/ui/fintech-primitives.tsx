"use client";

import type { ChargeChannel, ChargeStatus } from "@/types/gotpay";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Link2,
  QrCode,
  Smartphone,
  Sparkles,
  XCircle,
} from "lucide-react";
import React, { type ReactNode } from "react";

export function Card({
  children,
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { readonly children: ReactNode }) {
  return (
    <div
      className={`gp-fintech-card bg-[var(--gp-white)] text-[var(--gp-navy)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const isRow =
    className.includes("flex-row") &&
    !className.includes("sm:flex-row") &&
    !className.includes("md:flex-row") &&
    !className.includes("lg:flex-row");
  const layoutClass = isRow ? "flex" : "flex flex-col space-y-1";
  return <div className={`${layoutClass} p-5 pb-3 ${className}`}>{children}</div>;
}

export function CardTitle({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <h3
      className={`text-sm font-semibold tracking-tight text-[var(--gp-navy)] ${className}`}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <p className={`text-xs text-[var(--gp-slate)] ${className}`}>{children}</p>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={`p-5 pt-0 ${className}`}>{children}</div>;
}

/**
 * Badge de estado minimalista estilo fintech con contraste AA/AAA garantizado:
 * Texto SIEMPRE en navy (#112645) o blanco sobre navy (#112645).
 * PROHIBIDO usar menta/verde como color de texto sobre blanco.
 */
export function StatusChip({ status }: { readonly status: ChargeStatus }) {
  switch (status) {
    case "PAID":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#112645]/15 bg-[var(--gp-mint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--gp-navy)]">
          <CheckCircle2 className="h-3 w-3 stroke-[2.4] text-[var(--gp-navy)]" />
          <span>Confirmado</span>
        </span>
      );
    case "PAID_LATE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#112645]/20 bg-[var(--gp-amber)] px-2 py-0.5 text-[11px] font-semibold text-[var(--gp-navy)]">
          <AlertTriangle className="h-3 w-3 stroke-[2.4] text-[var(--gp-navy)]" />
          <span>Pago tardío</span>
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--gp-navy)] px-2 py-0.5 text-[11px] font-semibold text-[var(--gp-white)]">
          <Clock className="h-3 w-3 stroke-[2.2] text-[var(--gp-mint)]" />
          <span>En espera</span>
        </span>
      );
    case "CREATED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#112645]/12 bg-[#112645]/[0.05] px-2 py-0.5 text-[11px] font-semibold text-[var(--gp-navy)]">
          <Sparkles className="h-3 w-3 stroke-[2] text-[var(--gp-navy)]" />
          <span>Creado</span>
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#112645]/12 bg-[#112645]/[0.04] px-2 py-0.5 text-[11px] font-medium text-[var(--gp-slate)]">
          <Clock className="h-3 w-3 stroke-[1.8] text-[var(--gp-slate)]" />
          <span>Expirado</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#112645]/10 bg-[#112645]/[0.03] px-2 py-0.5 text-[11px] font-medium text-[var(--gp-slate)]">
          <XCircle className="h-3 w-3 stroke-[1.8] text-[var(--gp-slate)]" />
          <span>Cancelado</span>
        </span>
      );
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

export function ChannelChip({ channel }: { readonly channel: ChargeChannel }) {
  switch (channel) {
    case "CODI_QR":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#112645]/[0.05] px-2 py-0.5 text-[11px] font-medium text-[var(--gp-navy)]">
          <QrCode className="h-3 w-3 text-[var(--gp-blue)]" />
          <span>QR CoDi</span>
        </span>
      );
    case "CODI_PUSH":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#026EFB]/[0.08] px-2 py-0.5 text-[11px] font-medium text-[var(--gp-navy)]">
          <Smartphone className="h-3 w-3 text-[var(--gp-blue)]" />
          <span>Push CoDi</span>
        </span>
      );
    case "PAYMENT_LINK":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#112645]/[0.05] px-2 py-0.5 text-[11px] font-medium text-[var(--gp-navy)]">
          <Link2 className="h-3 w-3 text-[var(--gp-slate)]" />
          <span>Enlace</span>
        </span>
      );
    default: {
      const exhaustiveCheck: never = channel;
      return exhaustiveCheck;
    }
  }
}

export function Skeleton({ className = "" }: { readonly className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-[#112645]/[0.07] ${className}`}
    />
  );
}

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      data-testid="fintech-empty-state"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#112645]/15 bg-[#112645]/[0.015] px-6 py-10 text-center"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#112645]/[0.06] text-[var(--gp-navy)]">
        <Inbox className="h-5 w-5" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-[var(--gp-navy)]">
        {title}
      </h4>
      <p className="mt-1 max-w-sm text-xs text-[var(--gp-slate)]">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="gp-touch-btn mt-4 min-h-[40px] rounded-lg bg-[var(--gp-navy)] px-4 py-2 text-xs font-semibold text-[var(--gp-white)] transition hover:opacity-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
