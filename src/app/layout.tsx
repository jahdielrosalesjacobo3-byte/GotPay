import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GotPay — Ya me pagaron / Ya cayó",
  description:
    "Caja-bocina instantánea de alto contraste para cobros digitales en mostrador y calle. Ya me pagaron / Ya cayó.",
  applicationName: "GotPay",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GotPay",
  },
  icons: {
    icon: [
      { url: "/brand/icons/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/brand/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/brand/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#112645",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-screen bg-[var(--gp-white)] text-[var(--gp-navy)] antialiased selection:bg-[var(--gp-blue)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
