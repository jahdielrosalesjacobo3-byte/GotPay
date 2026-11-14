import { verifyPeyWebhook } from "@/lib/pey/webhooks";
import { parseAndProcessPeyWebhook } from "@/lib/db/lifecycle";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id"),
    "webhook-timestamp": req.headers.get("webhook-timestamp"),
    "webhook-signature": req.headers.get("webhook-signature"),
  };

  try {
    verifyPeyWebhook(rawBody, headers);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const webhookId = headers["webhook-id"];
  if (!webhookId) {
    return NextResponse.json({ error: "webhook-id requerido" }, { status: 400 });
  }

  try {
    await parseAndProcessPeyWebhook(rawBody, webhookId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al procesar" },
      { status: 400 },
    );
  }
}