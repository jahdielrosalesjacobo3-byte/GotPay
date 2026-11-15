"use client";

import QRCode from "qrcode";
import React, { useEffect, useState } from "react";

interface QrCodeCanvasProps {
  readonly qrData: string;
  readonly size?: number;
  /** Permite guardar el QR (página pública); el modal del cajero mantiene select-none. */
  readonly allowSave?: boolean;
}

export function QrCodeCanvas({
  qrData,
  size = 300,
  allowSave = false,
}: QrCodeCanvasProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      if (!qrData) {
        setDataUrl("");
        return;
      }
      if (qrData.startsWith("data:image/")) {
        setDataUrl(qrData);
        setRenderError(null);
        return;
      }
      try {
        const url = await QRCode.toDataURL(qrData, {
          width: size,
          margin: 2,
          errorCorrectionLevel: "M",
          color: {
            dark: "#112645",
            light: "#FFFFFF",
          },
        });
        if (!cancelled) {
          setDataUrl(url);
          setRenderError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setRenderError(
            err instanceof Error ? err.message : "Error generando QR",
          );
        }
      }
    }

    void generate();
    return () => {
      cancelled = true;
    };
  }, [qrData, size]);

  if (renderError) {
    return (
      <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-[var(--gp-white)] p-4 text-center text-sm font-bold text-[var(--gp-navy)]">
        Payload QR listo ({qrData.slice(0, 32)}…)
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="flex h-64 w-64 animate-pulse items-center justify-center rounded-2xl bg-[var(--gp-white)] text-base font-bold text-[var(--gp-navy)]">
        Generando QR de alto contraste…
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center justify-center rounded-3xl bg-[var(--gp-white)] p-4 shadow-xl ring-4 ring-[var(--gp-mint)]">
      <img
        src={dataUrl}
        alt="Código QR CoDi para pago en GotPay"
        width={size}
        height={size}
        className={`h-auto w-full max-w-[290px] sm:max-w-[320px]${allowSave ? "" : " select-none"}`}
      />
      {allowSave ? (
        <a
          href={dataUrl}
          download="gotpay-qr.png"
          className="gp-touch-btn mt-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#112645]/15 bg-[var(--gp-white)] px-4 text-sm font-semibold text-[var(--gp-navy)] transition hover:bg-[#112645]/[0.04]"
        >
          Guardar QR
        </a>
      ) : null}
    </div>
  );
}
