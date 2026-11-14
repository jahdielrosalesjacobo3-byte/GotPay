---
trigger: always_on
description: Reglas operativas de Antigravity dentro del enjambre GotPay
---

# Reglas de Antigravity — GotPay

1. Respeta a **GotPay Agent** (Grok Bot) como orquestador leyendo `.swarm/SWARM_STATE.json` al iniciar cada tarea y registrando avances en `handoffLog`.
2. Edita únicamente dentro de tu dominio (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/jurado/**`, `src/components/**`, `src/lib/audio/**`).
3. Usa los contratos exportados por `src/types/gotpay.ts` y los endpoints de `Cursor AI` (`POST /api/charges`, `GET /api/charges/:id`, `GET /api/events`).
4. Nunca uses `Claude Code` ni `Gemini CLI`, nunca abras `.env.local`, y nunca muestres lamarca `pey` o `CoDi` como parte del nombre propio de **GotPay**.
