import { describe, expect, it } from "vitest";
import {
  amountToSpanishWords,
  buildChargeAnnouncement,
} from "@/lib/audio/announcer";

describe("announcer (es-MX)", () => {
  it("convierte montos clave a español natural", () => {
    expect(amountToSpanishWords(0.01)).toBe("un centavo");
    expect(amountToSpanishWords(0.5)).toBe("cincuenta centavos");
    expect(amountToSpanishWords(1)).toBe("un peso");
    expect(amountToSpanishWords(20)).toBe("veinte pesos");
    expect(amountToSpanishWords(21)).toBe("veintiún pesos");
    expect(amountToSpanishWords(50)).toBe("cincuenta pesos");
    expect(amountToSpanishWords(85.5)).toBe(
      "ochenta y cinco pesos con cincuenta centavos",
    );
    expect(amountToSpanishWords(100)).toBe("cien pesos");
    expect(amountToSpanishWords(101)).toBe("ciento un pesos");
    expect(amountToSpanishWords(1250.5)).toBe(
      "mil doscientos cincuenta pesos con cincuenta centavos",
    );
  });

  it("construye locuciones diferenciadas para PAID y PAID_LATE", () => {
    expect(
      buildChargeAnnouncement({
        amount: 0.01,
        status: "PAID",
        numRef: "1000004",
      }),
    ).toBe("GotPay: ya cayó, un centavo. Folio 004.");

    expect(
      buildChargeAnnouncement({
        amount: 85.5,
        status: "PAID",
        numRef: "2948012",
      }),
    ).toBe(
      "GotPay: ya cayó, ochenta y cinco pesos con cincuenta centavos. Folio 012.",
    );

    expect(
      buildChargeAnnouncement({
        amount: 50,
        status: "PAID_LATE",
        numRef: "5000009",
      }),
    ).toBe(
      "Atención en GotPay: pago tardío de cincuenta pesos, revisar orden. Folio 009.",
    );
  });
});
