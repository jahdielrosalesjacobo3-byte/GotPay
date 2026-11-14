# DESPACHO-001 — Orden General de Mando (MVP 24 h)

**Emite:** GotPay Agent (Orquestador Único, Grok Bot.app) · **Fecha:** 2026-11-14 · **Base:** `MASTER_PLAN.md` + `workpacks/*` + `SWARM_STATE.json` v2
**Ejecutores autorizados:** Cursor AI · Antigravity · Muse. **Excluidos:** Claude Code y Gemini CLI (ningún flujo, terminal ni subproceso).

## Reglas que aplican a todas las órdenes
1. Nadie lee, imprime, copia ni hace `cat`/`grep` de `.env.local`. El código solo usa `process.env.*` en servidor. Nunca `NEXT_PUBLIC_` para credenciales de pey.
2. Cada agente edita solo su `ownership`. Cambios al contrato `src/types/gotpay.ts` se piden en `handoffLog` y los aplica Cursor AI.
3. Cero pruebas de carga o escaneos contra `api.pey.mx`; solo contra mocks locales.
4. La marca es **GotPay**. Nunca "pey ..." ni "CoDi ..." como nombre, ni respaldo oficial de pey o Banxico.
5. Colores: usar exclusivamente `orders/brand-tokens.json`.
6. Al abrir una ola el dueño la marca `in_progress`; al pasar su compuerta la marca `gate_passed` y deja evidencia en `handoffLog`. Solo GotPay Agent la marca `completed`.

## Orden de ejecución
| Paso | Ola | Dueño | Arranca | Depende de |
|---|---|---|---|---|
| 1 | MVP-W1 Núcleo backend pey | Cursor AI | YA | — |
| 1 | MVP-W3 Marca, sonidos, pitch | Muse | YA | — |
| 1 | MVP-W2 Caja PWA (fase A, contra mocks del contrato) | Antigravity | YA | `src/types/gotpay.ts` (ya existe) |
| 2 | MVP-W2 fase B (integración real a `/api/*` y SSE) | Antigravity | Al pasar compuerta W1 | W1 |
| 2 | Integración de marca en UI | Antigravity | Al entregar Muse G3.1 | W3 (activos de marca) |
| 3 | MVP-W4 Deploy + webhook + 3 cobros reales | Cursor AI + GotPay Agent | Al pasar compuertas W1 y W2 | W1, W2 |

Ruta crítica: **W1 -> W2B -> W4**. Muse no bloquea la demo: si sus activos no llegan, Antigravity usa los JPG de `public/brand/source/` y los tokens.

## Compuertas de salida (resumen)
- **G1 (W1):** `tsc --noEmit` 0 errores · QR real $0.01 MXN -> HTTP 201 · test de webhook duplicado (mismo `webhook-id` x2 => 1 transición y 1 evento) · semgrep sin hallazgos altos · `clabeLast4` verificado.
- **G2 (W2):** flujo completo en móvil y laptop sin errores de consola · reconexión SSE + polling 2 s · overlay PAID/PAID_LATE con voz es-MX · montos leídos correctamente ($0.01 = "un centavo").
- **G3 (W3):** SVG + PNG transparentes + favicon + íconos PWA 192/512/maskable · `paid-chime.wav` y `late-alert.wav` · guion 90 s probado en voz alta.
- **G4 (W4):** webhook registrado y firmado · 3 cobros reales $0.01 con latencia escaneo->voz < 3 s · push a `GotPay.git` sin secretos (gitleaks/semgrep) · video respaldo 45 s.

Órdenes individuales: `01-cursor-ai.md`, `02-antigravity.md`, `03-muse.md`.
