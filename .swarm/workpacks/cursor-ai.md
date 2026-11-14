# Workpack Oficial — Cursor AI (`MVP-W1` + `MVP-W4` + Backend Mes)

**Orquestador:** `GotPay Agent` (Grok Bot)  
**Plan Maestro:** `/Users/jahdielrosales/Documents/CURSOR-HACKATON/.swarm/MASTER_PLAN.md`

## Alcance Exclusivo de Archivos
- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- `src/types/gotpay.ts`
- `src/lib/pey/**` (`client.ts`, `webhooks.ts`)
- `src/lib/db/**` (`store.ts`)
- `src/lib/events/**` (`bus.ts`)
- `src/app/api/**` (`charges`, `charges/[id]`, `charges/[id]/reconcile`, `charges/[id]/cancel`, `webhooks/pey`, `events`)

## Checklist de Ejecución Inmediata (`MVP-W1`)
1. Inicializar Next.js + TypeScript en la raíz conservando `.env.local`, `.swarm/`, `AGENTS.md`, `GEMINI.md` y `.cursor/`.
2. Implementar `src/lib/pey/client.ts` apuntando a `process.env.PEY_API_BASE_URL` con `Bearer ${process.env.PEY_API_KEY}` solo en servidor.
3. Implementar `src/lib/pey/webhooks.ts` verificando firma `standardwebhooks` sobre `await req.text()`, deduplicando `webhook-id` + `transactionId` y recortando `metadata.clabe` a `clabeLast4`.
4. Implementar `src/lib/db/store.ts` y `src/lib/events/bus.ts` para servir `POST/GET /api/charges`, `GET /api/charges/[id]`, `POST /api/charges/[id]/reconcile`, `POST /api/charges/[id]/cancel`, `POST /api/webhooks/pey` y `GET /api/events` (SSE).
5. Correr `semgrep` sobre `src/`, verificar `tsc --noEmit` sin errores y reportar cierre en `.swarm/SWARM_STATE.json`.
