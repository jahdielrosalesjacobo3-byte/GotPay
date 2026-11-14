import { PeyClientError } from "@/lib/pey/errors";
import { reconcileCharge } from "@/lib/db/lifecycle";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  try {
    const result = await reconcileCharge(id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof PeyClientError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 502 },
      );
    }
    if (error instanceof Error && error.message === "Cobro no encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 },
    );
  }
}