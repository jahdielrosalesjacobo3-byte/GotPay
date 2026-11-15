import { getChargeById } from "@/lib/db/store";
import type { GotPayCharge } from "@/types/gotpay";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

/** Vista pública de un cobro: sin CLABE completa (solo last4 + bankCode) ni teléfono sin máscara. */
function toPublicCharge(charge: GotPayCharge): GotPayCharge {
  const last4 = charge.clabeLast4?.replace(/\D/g, "").slice(-4);
  return {
    ...charge,
    clabeLast4: last4 && last4.length === 4 ? last4 : undefined,
  };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const charge = await getChargeById(id);
  if (!charge) {
    return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
  }
  return NextResponse.json(
    { charge: toPublicCharge(charge) },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
