import { getStoreMode } from "@/lib/db/store";
import { pgPing } from "@/lib/db/store-postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const peyApiKeyConfigured = Boolean(process.env.PEY_API_KEY?.trim());
  const peyWebhookSecretConfigured = Boolean(
    process.env.PEY_WEBHOOK_SECRET?.trim(),
  );
  const store = getStoreMode();
  const storeReachable = store === "supabase" ? await pgPing() : true;

  return Response.json({
    ok: storeReachable,
    service: "gotpay",
    store,
    storeReachable,
    peyApiKeyConfigured,
    peyWebhookSecretConfigured,
    timestamp: new Date().toISOString(),
  });
}
