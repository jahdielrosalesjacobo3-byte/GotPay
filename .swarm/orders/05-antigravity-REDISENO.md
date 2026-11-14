# ORDEN 05 — Antigravity · MVP-W2R (rediseño profesional de UI)

**Workpack:** `.swarm/workpacks/antigravity.md` · **Contrato:** `src/types/gotpay.ts` · **Tokens:** `.swarm/orders/brand-tokens.json`  
**Prompt pegable:** `.swarm/orders/05-antigravity-REDISENO-PROMPT.txt`  
**Plazo:** antes del pitch del MVP del 2026-11-15.

## Objetivo
Rediseñar la UI de GotPay (caja táctil + historial del turno + panel/dashboard del comercio y Modo Jurado) con calidad profesional de fintech, reemplazando el look genérico generado por IA. La lógica permanece intacta: máquina de 6 estados de `src/types/gotpay.ts`, SSE `/api/events` + polling 2 s, `useGotPayPos`, announcer de audio y contratos de las rutas `/api/**`.

## Alcance y límites
- Edita solo lo de Antigravity: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/jurado/**`, `src/components/**`, `src/lib/audio/**`. Puedes instalar `shadcn/ui` (por su CLI oficial), `lucide-react` y `recharts` (este último solo si lo usas) actualizando `package.json` con el mínimo necesario.
- **No toques** `src/lib/pey`, `src/lib/db`, `src/app/api` (son de Cursor AI). No edites `src/types/gotpay.ts`.
- **No leas ni abras** `.env.local`. Nunca expongas `PEY_API_KEY` ni secretos. No uses Claude Code ni Gemini CLI.
- Marca siempre **GotPay**. Nunca uses "pey…" ni "CoDi…" como marca, ni insinúes respaldo de pey o Banxico. Textos en español de México.

## Referencias (solo visual y de patrones; sin copiar código)
Clona estos repos **únicamente como referencia visual y de patrones**, y **solo fuera del repo**, en `~/Documents/gotpay-refs/` (nunca dentro de CURSOR-HACKATON, ni en `.refs/` ni en ninguna otra carpeta del workspace):
- https://github.com/adrianhajdin/banking (Horizon, Next.js + shadcn)
- https://github.com/abderrahimghazali/shadcn-fintech (dashboard fintech Next.js + shadcn/ui + Tailwind)

Observa e imita patrones: layout con sidebar/topbar, tarjetas de KPI (cobrado hoy, # cobros, ticket promedio, pendientes), tabla de transacciones con estados en chips, gráfica de ingresos del turno, estados vacíos y skeletons, uso de componentes shadcn/ui.

**PROHIBIDO** copiar código, archivos, componentes o assets de esos repos de forma literal. Todo se reescribe desde cero en nuestro repo. Instalar `shadcn/ui` con su CLI oficial sí está permitido (es una dependencia propia, no código de esos repos). **NO** traigas Plaid, Appwrite, Dwolla, Sentry, auth, datos de ejemplo de bancos ni ningún `.env` de esas referencias.

**No des crédito por ahora:** no crees `THIRD_PARTY_NOTICES.md` y no menciones esos repos en README, UI, commits ni código.

## Marca (de `orders/brand-tokens.json`)
| Token | Hex | Uso |
|---|---|---|
| navy | `#112645` | Montos, folios, texto principal, estados |
| slate | `#27354B` | Texto secundario |
| blue | `#026EFB` | Primarios / acentos (texto >= 18 px) |
| teal | `#02BEC8` | Punto medio del degradado |
| mint | `#0ADDA9` | **Fondo** del overlay PAID, texto navy |
| payGreen | `#0CD6A7` | Acento de marca; nunca como texto sobre blanco |
| ámbar | `#F5A524` | **Fondo** del overlay PAID_LATE, texto navy |
| Degradado | `linear-gradient(135deg,#026EFB 0%,#02BEC8 50%,#0ADDA9 100%)` | Encabezado / apertura |

**PROHIBIDO** menta / Pay / verde sobre blanco para texto, montos o estados (contraste 1.88). Montos y estados en navy. Overlay PAID = fondo menta + texto navy. PAID_LATE = ámbar + texto navy. Logos ya en `public/brand/`. Accesible (contraste AA, objetivos táctiles ≥44 px), responsive móvil / tablet / desktop.

## Arranque
1. Marca `MVP-W2R` como `in_progress` en `.swarm/SWARM_STATE.json` y anota el arranque en `handoffLog`.
2. Clona las referencias solo en `~/Documents/gotpay-refs/` y rediseña caja, historial, dashboard y Modo Jurado reescribiendo todo desde cero.

## Compuerta G2R
- [ ] `npx tsc --noEmit` limpio, `npm test` verde, `npm run build` ok.
- [ ] Capturas en móvil y desktop de caja, dashboard y overlays PAID / PAID_LATE.
- [ ] Flujo con mocks completo (apertura de turno, cobro, voz, historial, jurado).
- [ ] Sin CLABE completa ni secretos; marca GotPay correcta.
- [ ] Sin código copiado de los repos de referencia; sin menciones a esos repos en README, UI, commits ni código; sin `THIRD_PARTY_NOTICES.md`.
- [ ] Marca `MVP-W2R` como `gate_passed` y escribe el resumen en `handoffLog`. **Solo GotPay Agent marca `completed`.**
