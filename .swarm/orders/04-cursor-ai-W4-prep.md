# ORDEN 04 — Cursor AI · Preparación de MVP-W4 (sin deploy ni alta de webhook todavía)

**Motivo:** el store actual es en memoria. En Vercel serverless el webhook y el SSE pueden caer en instancias distintas y la caja nunca vería el pago.
**Decisión de GotPay Agent para la demo del 15 nov:** servir GotPay desde un proceso único (`next start` en la Mac) expuesto por túnel HTTPS. Vercel + almacenamiento compartido queda para MES-S1.

## Tareas (solo en tu ownership; no toques src/app/page.tsx, layout.tsx, globals.css, src/components/**, src/lib/audio/**, public/**)
1. Persistencia ligera en archivo para el store (p. ej. `.data/gotpay.json` escrito de forma atómica, ignorado por git) para que un reinicio no pierda cobros ni `processed_webhooks`.
2. Script `npm run demo` = build + `next start` en el puerto 3000, y script `npm run tunnel` que levante un túnel HTTPS (cloudflared quick tunnel si está instalado; si no, documenta cómo instalarlo con brew sin ejecutarlo) e imprima la URL pública + la ruta `/api/webhooks/pey`.
3. Agrega `.swarm/logs/` y `.data/` a `.gitignore`.
4. Endpoint `GET /api/health` que diga si `PEY_API_KEY` y `PEY_WEBHOOK_SECRET` están configurados (true/false, NUNCA el valor).
5. No registres el webhook en pey, no hagas deploy a Vercel, no hagas push y no hagas llamadas reales a pey en esta orden. No leas .env.local.
6. `tsc --noEmit` y `npm test` en verde. Registra en `handoffLog` lo hecho y deja W4 en `blocked` (sigue esperando G2).
