import { cancelCharge } from "@/lib/db/lifecycle";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  try {
    const charge = await cancelCharge(id);
    return NextResponse.json({ charge }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Cobro no encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 },
    );
  }
}