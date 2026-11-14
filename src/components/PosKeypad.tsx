"use client";

import { formatMxn } from "@/components/mockEngine";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/fintech-primitives";
import { amountToSpanishWords } from "@/lib/audio/announcer";
import {
  Delete,
  QrCode,
  RotateCcw,
  Send,
  Smartphone,
  Volume2,
} from "lucide-react";
import React, { useState } from "react";

interface PosKeypadProps {
  readonly amountStr: string;
  readonly concept: string;
  readonly isSubmitting: boolean;
  readonly onAmountChange: (next: string) => void;
  readonly onQuickAmount: (amount: number, defaultConcept?: string) => void;
  readonly onConceptChange: (next: string) => void;
  readonly onCreateQrCharge: () => Promise<void>;
  readonly onCreatePushCharge: (phone: string) => Promise<void>;
}

const QUICK_PRESETS: ReadonlyArray<{
  readonly id: string;
  readonly short: string;
  readonly label: string;
  readonly value: number;
  readonly concept: string;
  readonly testId: string;
}> = [
  {
    id: "p-001",
    short: "$0.01",
    label: "Demo",
    value: 0.01,
    concept: "Demo GotPay $0.01",
    testId: "quick-amount-0.01",
  },
  {
    id: "p-20",
    short: "$20",
    label: "Bebida",
    value: 20,
    concept: "Agua / Bebida",
    testId: "quick-amount-20",
  },
  {
    id: "p-50",
    short: "$50",
    label: "Mostrador",
    value: 50,
    concept: "Cobro en mostrador",
    testId: "quick-amount-50",
  },
  {
    id: "p-855",
    short: "$85.50",
    label: "Comida",
    value: 85.5,
    concept: "Orden de comida",
    testId: "quick-amount-85.5",
  },
  {
    id: "p-100",
    short: "$100",
    label: "Completa",
    value: 100,
    concept: "Orden completa",
    testId: "quick-amount-100",
  },
];

const CONCEPT_CHIPS: ReadonlyArray<string> = [
  "Cobro en mostrador",
  "Orden de comida",
  "Agua / Bebida",
  "Servicio rápido",
];

const KEYPAD_KEYS: ReadonlyArray<string> = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  "0",
  "⌫",
];

export function PosKeypad({
  amountStr,
  concept,
  isSubmitting,
  onAmountChange,
  onQuickAmount,
  onConceptChange,
  onCreateQrCharge,
  onCreatePushCharge,
}: PosKeypadProps) {
  const [channelMode, setChannelMode] = useState<"CODI_QR" | "CODI_PUSH">(
    "CODI_QR",
  );
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  const numericAmount = Number.parseFloat(amountStr || "0");
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0;

  const handleKeyPress = (key: string) => {
    setLocalError(null);
    if (key === "⌫") {
      if (amountStr.length <= 1) {
        onAmountChange("0");
      } else {
        onAmountChange(amountStr.slice(0, -1));
      }
      return;
    }

    if (key === ".") {
      if (amountStr.includes(".")) {
        return;
      }
      onAmountChange(amountStr === "" ? "0." : `${amountStr}.`);
      return;
    }

    if (amountStr.includes(".")) {
      const decimals = amountStr.split(".")[1] ?? "";
      if (decimals.length >= 2) {
        return;
      }
    }

    const next = amountStr === "0" ? key : `${amountStr}${key}`;
    const parsed = Number.parseFloat(next);
    if (parsed > 50000) {
      return;
    }
    onAmountChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validAmount) {
      setLocalError("Ingresa un importe mayor a $0.00 MXN.");
      return;
    }

    if (channelMode === "CODI_PUSH") {
      const digits = phoneInput.replace(/\D/g, "");
      if (digits.length !== 10) {
        setLocalError(
          "Ingresa los 10 dígitos del celular para enviar la solicitud CoDi.",
        );
        return;
      }
      setLocalError(null);
      await onCreatePushCharge(digits);
      return;
    }

    setLocalError(null);
    await onCreateQrCharge();
  };

  return (
    <Card className="flex h-full flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-[var(--gp-navy)]">
            Cobro Rápido CoDi
          </CardTitle>
          <p className="mt-0.5 text-xs text-[var(--gp-slate)]">
            Liquidación SPEI inmediata · 0% comisión
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#112645]/[0.05]">
          <Send className="h-4 w-4 text-[var(--gp-slate)]" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between space-y-3.5">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between space-y-3.5">
          {/* Importes frecuentes estilo avatares de QuickTransfer */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--gp-slate)]">
                Importes frecuentes
              </span>
              <button
                type="button"
                data-testid="clear-amount-btn"
                onClick={() => onAmountChange("0")}
                className="gp-touch-btn inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-[var(--gp-slate)] transition hover:bg-[#112645]/[0.05] hover:text-[var(--gp-navy)]"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reiniciar</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              {QUICK_PRESETS.map((item) => {
                const isSelected =
                  Math.abs(numericAmount - item.value) < 0.001;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={item.testId}
                    onClick={() => onQuickAmount(item.value, item.concept)}
                    className="gp-touch-btn group flex flex-1 flex-col items-center gap-1 rounded-lg py-1 transition"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-all ${
                        isSelected
                          ? "bg-[#026EFB]/12 text-[var(--gp-blue)] ring-2 ring-[var(--gp-blue)] ring-offset-2 ring-offset-white"
                          : "bg-[#112645]/[0.05] text-[var(--gp-navy)] group-hover:bg-[#112645]/[0.09]"
                      }`}
                    >
                      {item.short}
                    </div>
                    <span
                      className={`text-[11px] leading-tight transition-colors ${
                        isSelected
                          ? "font-semibold text-[var(--gp-navy)]"
                          : "text-[var(--gp-slate)]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo de monto limpio estilo QuickTransfer */}
          <div className="rounded-lg border border-[#112645]/12 bg-[#112645]/[0.015] px-3.5 py-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-[var(--gp-slate)]">
                Importe (MXN)
              </span>
              <span
                data-testid="pos-amount-words"
                className="inline-flex items-center gap-1 text-[11px] font-medium capitalize text-[var(--gp-slate)]"
              >
                <Volume2 className="h-3 w-3 text-[var(--gp-blue)]" />
                <span>
                  {amountToSpanishWords(validAmount ? numericAmount : 0)}
                </span>
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div
                data-testid="pos-amount-display"
                className="gp-amount-display text-2xl font-bold tracking-tight text-[var(--gp-navy)] sm:text-3xl"
              >
                {validAmount ? formatMxn(numericAmount) : "$0.00"}
              </div>
              <span className="text-xs font-medium text-[var(--gp-slate)]">
                SPEI / CoDi
              </span>
            </div>
          </div>

          {/* Teclado táctil monocromático limpio (sin recuadros multicolores) */}
          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-[#112645]/[0.08] bg-[#112645]/[0.02] p-1.5">
            {KEYPAD_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                data-testid={`keypad-key-${key}`}
                onClick={() => handleKeyPress(key)}
                aria-label={key === "⌫" ? "Borrar dígito" : `Dígito ${key}`}
                className="gp-touch-btn flex min-h-[44px] items-center justify-center rounded-md border border-[#112645]/[0.08] bg-[var(--gp-white)] text-base font-semibold tabular-nums text-[var(--gp-navy)] shadow-[0_1px_1px_rgba(17,38,69,0.03)] transition hover:bg-[#112645]/[0.03] active:scale-[0.98]"
              >
                {key === "⌫" ? (
                  <span className="inline-flex items-center">
                    <Delete className="h-4 w-4 text-[var(--gp-slate)]" />
                    <span className="sr-only">⌫</span>
                  </span>
                ) : (
                  key
                )}
              </button>
            ))}
          </div>

          {/* Concepto y selector de canal compacto */}
          <div className="space-y-2.5">
            <div>
              <input
                id="gotpay-concept-input"
                type="text"
                maxLength={40}
                value={concept}
                onChange={(e) => onConceptChange(e.target.value)}
                placeholder="Concepto (ej. Cobro en mostrador)"
                data-testid="concept-input"
                className="h-9 w-full rounded-lg border border-[#112645]/12 bg-[var(--gp-white)] px-3 text-xs font-medium text-[var(--gp-navy)] placeholder:text-[var(--gp-slate)]/60 focus:border-[var(--gp-blue)] focus:outline-none"
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {CONCEPT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => onConceptChange(chip)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                      concept === chip
                        ? "bg-[var(--gp-navy)] text-[var(--gp-white)]"
                        : "bg-[#112645]/[0.04] text-[var(--gp-slate)] hover:bg-[#112645]/[0.08] hover:text-[var(--gp-navy)]"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#112645]/[0.05] p-1">
              <button
                type="button"
                data-testid="mode-qr-btn"
                onClick={() => setChannelMode("CODI_QR")}
                className={`gp-touch-btn inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-md text-xs font-medium transition ${
                  channelMode === "CODI_QR"
                    ? "bg-[var(--gp-white)] text-[var(--gp-navy)] shadow-xs"
                    : "text-[var(--gp-slate)] hover:text-[var(--gp-navy)]"
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>QR Mostrador</span>
              </button>
              <button
                type="button"
                data-testid="mode-push-btn"
                onClick={() => setChannelMode("CODI_PUSH")}
                className={`gp-touch-btn inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-md text-xs font-medium transition ${
                  channelMode === "CODI_PUSH"
                    ? "bg-[var(--gp-white)] text-[var(--gp-navy)] shadow-xs"
                    : "text-[var(--gp-slate)] hover:text-[var(--gp-navy)]"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Push Celular</span>
              </button>
            </div>

            {channelMode === "CODI_PUSH" && (
              <div>
                <input
                  id="pos-push-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) =>
                    setPhoneInput(
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="Celular a 10 dígitos (ej. 5512345678)"
                  data-testid="pos-push-phone-input"
                  className="h-9 w-full rounded-lg border border-[#112645]/15 bg-[var(--gp-white)] px-3 font-mono text-xs font-semibold text-[var(--gp-navy)] focus:border-[var(--gp-blue)] focus:outline-none"
                />
              </div>
            )}

            {localError && (
              <p className="text-xs font-medium text-[var(--gp-navy)] underline decoration-[var(--gp-amber)]">
                {localError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !validAmount}
              data-testid="submit-charge-btn"
              className="gp-touch-btn flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--gp-navy)] px-4 py-2.5 text-xs font-semibold text-[var(--gp-white)] shadow-xs transition hover:opacity-95 disabled:opacity-45"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {isSubmitting
                  ? "Generando solicitud CoDi…"
                  : channelMode === "CODI_QR"
                    ? `Generar QR CoDi · ${validAmount ? formatMxn(numericAmount) : "$0.00"}`
                    : `Enviar Push CoDi · ${validAmount ? formatMxn(numericAmount) : "$0.00"}`}
              </span>
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
