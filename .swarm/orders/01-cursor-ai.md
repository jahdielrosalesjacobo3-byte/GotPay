# ORDEN 01 — Cursor AI · MVP-W1 (ahora) y MVP-W4 (después)

**Prioridad:** RUTA CRÍTICA. Tu compuerta G1 desbloquea a Antigravity (fase B) y a W4.
**Workpack:** `.swarm/workpacks/cursor-ai.md` · **Contrato:** `src/types/gotpay.ts` · **Rutas:** `MASTER_PLAN.md` §2.2

## MVP-W1 — ejecutar ya
1. Marca `MVP-W1` como `in_progress` en `SWARM_STATE.json`.
2. Bootstrap Next.js 15 + TS estricto + Tailwind en la raíz sin tocar `.env.local`, `.swarm/`, `AGENTS.md`, `.cursor/`, `public/brand/`. Instala `standardwebhooks`, `qrcode`, `ulid`, `zod`.
3. `src/lib/pey/client.ts`: `POST /codi/qr`, `POST /codi/pn`, `GET /transaction/codi/qr/:id`, `GET /transaction/:id`; timeout 10 s; errores tipados; Bearer solo en servidor.
4. `src/lib/pey/webhooks.ts`: firma Standard Webhooks sobre `await req.text()`; dedupe por `webhook-id` y por `transactionId`; `clabeLast4` + `bankCode` únicamente.
5. `src/lib/db/store.ts` (charges + processed_webhooks) y `src/lib/events/bus.ts`.
6. Rutas: `/api/charges` (POST, GET), `/api/charges/[id]`, `/reconcile`, `/cancel`, `/api/webhooks/pey`, `/api/events` (SSE, heartbeat 15 s).
7. Publica primero (antes de terminar todo) un **mock de las rutas** o confirma en `handoffLog` que las firmas de §2.2 no cambian, para que Antigravity no se bloquee.

### Compuerta G1 (todas obligatorias)
- [ ] `tsc --noEmit` 0 errores; `switch` exhaustivos con `never`.
- [ ] 1 QR real de $0.01 MXN contra `api.pey.mx` -> 201 (una sola llamada, sin bucles).
- [ ] Test automatizado: webhook duplicado => 1 transición, 1 evento SSE.
- [ ] Test: payload con `metadata.clabe` de 18 dígitos nunca aparece en store ni en SSE.
- [ ] `semgrep` sobre `src/` sin hallazgos altos.
- [ ] Marca `gate_passed` y registra evidencia en `handoffLog`.

## MVP-W4 — solo cuando G1 y G2 estén en `gate_passed`
1. Deploy en Vercel (o túnel HTTPS temporal). Variables cifradas en Vercel; el secreto del webhook solo en `.env.local` y Vercel.
2. Registrar `https://<host>/api/webhooks/pey` en el portal de pey. **El alta en el portal la confirma Jahdiel**; tú dejas la URL lista y avisas en `handoffLog`.
3. Medición de 3 cobros reales de $0.01 (los hace Jahdiel desde su banca móvil).
4. gitleaks + semgrep, luego push de `main` a `https://github.com/jahdielrosalesjacobo3-byte/GotPay.git`.

### Compuerta G4
- [ ] `peyStatus.webhookSecretConfigured = true` sin exponer el valor.
- [ ] 3/3 cobros con latencia escaneo->voz < 3 s.
- [ ] Repo remoto sin secretos.
