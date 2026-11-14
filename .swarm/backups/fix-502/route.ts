import { PeyClientError } from "@/lib/pey/errors";
import { createChargeSchema } from "@/lib/db/validation";
import {
  computeChargesSummary,
  listRecentCharges,
} from "@/lib/db/store";
import { createChargeFromRequest } from "@/lib/db/lifecycle";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const charges = listRecentCharges();
  const summary = computeChargesSummary();
  return NextResponse.json({ charges, summary }, { status: 200 });
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