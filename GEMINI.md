# GEMINI.md — Conector Antigravity para GotPay

Bienvenido al workspace de **GotPay** ("Ya me pagaron / Ya cayó") para **Hackatón México 2026** (`https://github.com/jahdielrosalesjacobo3-byte/GotPay.git`).

## Mando y Coordinación

- **Orquestador del Enjambre:** **`GotPay Agent`** (corriendo en **Grok Bot.app**).
- **Fuente única de verdad:** lee siempre [`.swarm/SWARM_STATE.json`](./.swarm/SWARM_STATE.json), [`.swarm/MASTER_PLAN.md`](./.swarm/MASTER_PLAN.md), tu workpack [`.swarm/workpacks/antigravity.md`](./.swarm/workpacks/antigravity.md), las órdenes de `GotPay Agent` en `.swarm/orders/` y [`AGENTS.md`](./AGENTS.md) antes de editar.
- **Agentes hermanos:** `Cursor AI` (backend `pey`, webhooks, SSE y tipos) y `Muse` (marca, audio UX y narrativa de pitch/video).
- **Exclusión estricta:** no ejecutar ni delegar nada en `Claude Code` ni en `Gemini CLI`.

## Tu Alcance como Antigravity

Eres responsable directo de la interfaz web/PWA y verificación en navegador:

1. `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` — Caja táctil de alto contraste pensada para uso real en mostrador/calle bajo luz solar:
   - Botón inicial de apertura de turno para desbloquear `AudioContext` + `speechSynthesis` (`es-MX`) + `navigator.wakeLock`.
   - Teclado numérico rápido + montos frecuentes (`$0.01 Demo`, `$20`, `$50`, `$100`).
   - QR CoDi a pantalla completa con temporizador y opción alternativa de cobro al celular (`CODI_PUSH`).
   - Confirmación verde inmediata al recibir `charge.paid` por SSE (`/api/events`) o polling de respaldo, cantando el monto en español.
2. `src/app/jurado/**` — Vista de Modo Jurado sin login para probar `$0.01 MXN` reales e inspeccionar la confirmación en tiempo real.
3. `src/components/**` y `src/lib/audio/**` — Componentes reutilizables y locutor de pesos en letra.

## Restricciones Críticas

- Consume los tipos de [`src/types/gotpay.ts`](./src/types/gotpay.ts) sin modificar `src/lib/pey/**` ni `src/app/api/**` (propiedad de `Cursor AI`).
- Jamás leas `.env.local` ni expongas credenciales o CLABEs completas de pagadores en la UI (solo `clabeLast4`).
- En todo `switch` sobre `ChargeStatus` o `GotPayRealtimeEvent`, incluye rama `default` exhaustiva con `never` e `import` siempre arriba del archivo.
