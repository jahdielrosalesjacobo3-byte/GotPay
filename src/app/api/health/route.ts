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
  // Config de servidor NO sensible: solo los últimos 4 dígitos de la CLABE del comercio.
  const clabeLast4Raw = process.env.GOTPAY_MERCHANT_CLABE_LAST4?.trim() ?? "";
  const merchantClabeLast4 = /^\d{4}$/.test(clabeLast4Raw) ? clabeLast4Raw : null;

  return Response.json({
    ok: storeReachable,
    service: "gotpay",
    store,
    storeReachable,
    peyApiKeyConfigured,
    peyWebhookSecretConfigured,
    merchantClabeLast4,
    timestamp: new Date().toISOString(),
  });
}
