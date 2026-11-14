"use client";

import {
  formatMxn,
  getBankShortName,
  sanitizeClabeLast4,
  sanitizeMaskedPhone,
  type ShiftSummary,
} from "@/components/mockEngine";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChannelChip,
  EmptyState,
  Skeleton,
  StatusChip,
} from "@/components/ui/fintech-primitives";
import {
  buildChargeAnnouncement,
  formatShortFolio,
} from "@/lib/audio/announcer";
import type { GotPayCharge } from "@/types/gotpay";
import {
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  Volume2,
} from "lucide-react";
import React, { useMemo, useState } from "react";

interface ShiftHistoryStripProps {
  readonly charges: ReadonlyArray<GotPayCharge>;
  readonly summary: ShiftSummary;
  readonly isLoading?: boolean;
  readonly onReplayVoice: (charge: GotPayCharge) => void;
  readonly onCreateDemoCharge?: () => void;
}

type FilterStatus = "ALL" | "CONFIRMED" | "PENDING" | "LATE";

function formatTimeMx(ts?: number): string {
  if (!ts) {
    return "--:--:--";
  }
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}

export function ShiftHistoryStrip({
  charges,
  summary,
  isLoading = false,
  onReplayVoice,
  onCreateDemoCharge,
}: ShiftHistoryStripProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredCharges = useMemo(() => {
    return charges.filter((item) => {
      if (statusFilter === "CONFIRMED" && item.status !== "PAID") {
        return false;
      }
      if (
        statusFilter === "PENDING" &&
        item.status !== "PENDING" &&
        item.status !== "CREATED"
      ) {
        return false;
      }
      if (statusFilter === "LATE" && item.status !== "PAID_LATE") {
        return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchFolio = item.numRef.toLowerCase().includes(q);
        const matchConcept = item.concept.toLowerCase().includes(q);
        const matchLast4 = (item.clabeLast4 ?? "").toLowerCase().includes(q);
        return matchFolio || matchConcept || matchLast4;
      }
      return true;
    });
  }, [charges, statusFilter, searchQuery]);

  const filterTabs: ReadonlyArray<{
    readonly id: FilterStatus;
    readonly label: string;
    readonly count: number;
  }> = [
    { id: "ALL", label: "Todos", count: charges.length },
    { id: "CONFIRMED", label: "Confirmados", count: summary.paidCount },
    { id: "PENDING", label: "En espera", count: summary.pendingCount },
    { id: "LATE", label: "Tardíos", count: summary.lateCount },
  ];

  return (
    <Card
      aria-label="Transacciones recientes del turno"
      data-testid="transactions-ledger-card"
    >
      <CardHeader className="flex flex-col justify-between gap-3 pb-3 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-[var(--gp-navy)]">
              Transacciones Recientes
            </CardTitle>
            <span className="rounded-md bg-[#112645]/[0.05] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[var(--gp-slate)]">
              {filteredCharges.length} registros
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--gp-slate)]">
            Conciliación SPEI en tiempo real · Privacidad activa (solo últimos 4
            dígitos CLABE)
          </p>
        </div>

        {/* Barra de filtros y búsqueda estilo transaction-table */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Filtrar transacciones por estado"
            className="inline-flex rounded-lg border border-[#112645]/10 bg-[#112645]/[0.03] p-0.5"
          >
            {filterTabs.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`ledger-filter-${tab.id.toLowerCase()}`}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`gp-touch-btn rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-[var(--gp-white)] text-[var(--gp-navy)] shadow-2xs"
                      : "text-[var(--gp-slate)] hover:text-[var(--gp-navy)]"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 text-[10px] tabular-nums opacity-70">
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--gp-slate)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar folio, concepto o CLABE…"
              data-testid="ledger-search-input"
              className="h-8 w-full rounded-lg border border-[#112645]/12 bg-[var(--gp-white)] pl-8 pr-3 text-xs text-[var(--gp-navy)] placeholder:text-[var(--gp-slate)]/60 focus:border-[var(--gp-blue)] focus:outline-none"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2.5" data-testid="ledger-skeleton">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : filteredCharges.length === 0 ? (
          <EmptyState
            title="No se encontraron transacciones"
            description="No hay cobros registrados para este filtro. Limpia los criterios o genera un cobro rápido de demostración."
            actionLabel={
              statusFilter !== "ALL" || searchQuery
                ? "Mostrar todos"
                : onCreateDemoCharge
                  ? "Generar cobro $0.01"
                  : undefined
            }
            onAction={() => {
              if (statusFilter !== "ALL" || searchQuery) {
                setStatusFilter("ALL");
                setSearchQuery("");
              } else {
                onCreateDemoCharge?.();
              }
            }}
          />
        ) : (
          <div
            data-testid="confirmed-payments-list"
            className="overflow-x-auto rounded-xl border border-[#112645]/[0.08] bg-[var(--gp-white)]"
          >
            <table
              data-testid="transactions-ledger-table"
              className="w-full border-collapse text-left text-xs"
            >
              <thead>
                <tr className="border-b border-[#112645]/[0.08] bg-[#112645]/[0.02] text-[11px] font-medium text-[var(--gp-slate)]">
                  <th className="py-2.5 pl-4 pr-3 font-medium">Transacción</th>
                  <th className="px-3 py-2.5 font-medium">Canal</th>
                  <th className="px-3 py-2.5 font-medium">Cuenta Origen</th>
                  <th className="hidden px-3 py-2.5 font-medium md:table-cell">
                    Hora
                  </th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium">Monto</th>
                  <th className="py-2.5 pl-3 pr-4 text-right font-medium">
                    Voz / Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#112645]/[0.06] text-xs">
                {filteredCharges.slice(0, 12).map((item) => {
                  const folio = formatShortFolio(item.numRef);
                  const maskedClabe = sanitizeClabeLast4(item.clabeLast4);
                  const maskedPhone = sanitizeMaskedPhone(
                    item.payerPhoneMasked,
                  );
                  const isExpanded = expandedId === item.id;
                  const canSpeak =
                    item.status === "PAID" || item.status === "PAID_LATE";

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        data-testid="confirmed-payment-card"
                        className="transition-colors hover:bg-[#112645]/[0.015]"
                      >
                        {/* Transacción con icono avatar estilo recent-transactions */}
                        <td className="py-3 pl-4 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#112645]/[0.05] text-[var(--gp-navy)]">
                              {canSpeak ? (
                                <ArrowDownLeft className="h-4 w-4 text-[var(--gp-blue)]" />
                              ) : (
                                <Clock className="h-4 w-4 text-[var(--gp-slate)]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[var(--gp-navy)]">
                                {item.concept}
                              </div>
                              <div className="font-mono text-[11px] text-[var(--gp-slate)]">
                                Folio #{folio} · Ref {item.numRef}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Canal */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <ChannelChip channel={item.channel} />
                        </td>

                        {/* Cuenta Pagadora Enmascarada */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            data-testid="history-clabe-last4"
                            className="font-mono text-xs text-[var(--gp-navy)]"
                          >
                            {maskedClabe
                              ? `•••• ${maskedClabe} · ${getBankShortName(item.bankCode)}`
                              : maskedPhone
                                ? `Tel ${maskedPhone}`
                                : "En espera"}
                          </span>
                        </td>

                        {/* Hora */}
                        <td className="hidden whitespace-nowrap px-3 py-3 font-mono text-xs text-[var(--gp-slate)] md:table-cell">
                          {formatTimeMx(item.paidAt ?? item.createdAt)}
                        </td>

                        {/* Estado */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <StatusChip status={item.status} />
                        </td>

                        {/* Monto */}
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span className="gp-amount-display text-sm font-semibold text-[var(--gp-navy)]">
                            {canSpeak ? "+" : ""}
                            {formatMxn(item.amount)}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            {canSpeak && (
                              <button
                                type="button"
                                onClick={() => onReplayVoice(item)}
                                className="gp-touch-btn inline-flex h-7 items-center gap-1 rounded-md border border-[#112645]/12 bg-[var(--gp-white)] px-2 text-[11px] font-medium text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.04]"
                              >
                                <Volume2 className="h-3 w-3 text-[var(--gp-blue)]" />
                                <span>Locución</span>
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label="Ver detalles de la transacción"
                              onClick={() =>
                                setExpandedId(isExpanded ? null : item.id)
                              }
                              className="gp-touch-btn inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--gp-slate)] hover:bg-[#112645]/[0.05] hover:text-[var(--gp-navy)]"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[#112645]/[0.015]">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                              <div>
                                <span className="text-[11px] text-[var(--gp-slate)]">
                                  ID de Orden
                                </span>
                                <div className="font-mono font-medium text-[var(--gp-navy)]">
                                  {item.id}
                                </div>
                              </div>
                              <div>
                                <span className="text-[11px] text-[var(--gp-slate)]">
                                  Clave de Rastreo SPEI
                                </span>
                                <div className="font-mono font-medium text-[var(--gp-navy)]">
                                  {item.trackingKey ??
                                    item.transactionId ??
                                    "Pendiente de liquidación"}
                                </div>
                              </div>
                              <div>
                                <span className="text-[11px] text-[var(--gp-slate)]">
                                  Frase de Voz (es-MX)
                                </span>
                                <div className="font-medium text-[var(--gp-navy)]">
                                  {buildChargeAnnouncement(item) ||
                                    "Se anuncia al confirmar el pago"}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
