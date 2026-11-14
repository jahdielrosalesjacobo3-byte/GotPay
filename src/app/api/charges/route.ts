import { PeyClientError } from "@/lib/pey/errors";
import { createChargeSchema } from "@/lib/db/validation";
import {
  computeChargesSummary,
  listRecentCharges,
} from "@/lib/db/store";
import { createChargeFromRequest } from "@/lib/db/lifecycle";
import type { GotPayCharge } from "@/types/gotpay";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

function parseLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIST_LIMIT;
  return Math.min(n, MAX_LIST_LIMIT);
}

/** Vista pública de un cobro: sin CLABE completa (solo last4 + bankCode) ni teléfono sin máscara. */
function toPublicCharge(charge: GotPayCharge): GotPayCharge {
  const last4 = charge.clabeLast4?.replace(/\D/g, "").slice(-4);
  return {
    ...charge,
    clabeLast4: last4 && last4.length === 4 ? last4 : undefined,
  };
}

export async function GET(req: Request): Promise<Response> {
  const limit = parseLimit(new URL(req.url).searchParams.get("limit"));
  const [charges, summary] = await Promise.all([
    listRecentCharges(limit),
    computeChargesSummary(),
  ]);
  return NextResponse.json(
    { charges: charges.map(toPublicCharge), summary },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 },
    );
  }

  const parsed = createChargeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Solicitud inválida", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.channel === "CODI_PUSH" && !parsed.data.phone) {
    return NextResponse.json(
      { error: "phone requerido para CODI_PUSH" },
      { status: 400 },
    );
  }

  try {
    const charge = await createChargeFromRequest(parsed.data);
    return NextResponse.json({ charge }, { status: 201 });
  } catch (error) {
    if (error instanceof PeyClientError) {
      console.error(
        `[api/charges] pey error code=${error.code} status=${error.status ?? "-"} msg=${error.message}`,
      );
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 },
    );
  }
}