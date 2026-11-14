"use client";

import React from "react";

interface GotPayLogoProps {
  readonly variant?: "horizontal" | "icon" | "dark";
  readonly className?: string;
}

export function GotPayLogo({
  variant = "horizontal",
  className = "h-11 w-auto",
}: GotPayLogoProps) {
  const src =
    variant === "icon"
      ? "/brand/gotpay-icon.png"
      : variant === "dark"
        ? "/brand/gotpay-lockup-horizontal-dark.png"
        : "/brand/gotpay-lockup-horizontal.png";

  const srcSet =
    variant === "icon"
      ? "/brand/gotpay-icon.png 1x, /brand/gotpay-icon@2x.png 2x"
      : variant === "dark"
        ? "/brand/gotpay-lockup-horizontal-dark.png 1x, /brand/gotpay-lockup-horizontal-dark@2x.png 2x"
        : "/brand/gotpay-lockup-horizontal.png 1x, /brand/gotpay-lockup-horizontal@2x.png 2x";

  return (
    <div
      className={`inline-flex items-center rounded-xl px-2.5 py-1 shadow-sm ring-1 ${
        variant === "dark"
          ? "bg-[var(--gp-navy)] ring-white/15"
          : "bg-[var(--gp-white)] ring-[#112645]/10"
      }`}
    >
      <img
        src={src}
        srcSet={srcSet}
        alt="GotPay — Ya me pagaron / Ya cayó"
        className={`object-contain ${className}`}
      />
    </div>
  );
}
