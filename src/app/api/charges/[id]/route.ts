import { getChargeById } from "@/lib/db/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const charge = await getChargeById(id);
  if (!charge) {
    return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ charge }, { status: 200 });
}