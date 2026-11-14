# AGENTS.md — Contrato del Enjambre GotPay

Proyecto: **GotPay** ("Ya me pagaron / Ya cayó")  
Evento: **Hackatón México 2026** (`pey` + `CoDi`, rumbo a las nuevas reglas de Banxico del 14 de diciembre de 2026)  
Modalidad: **100% individual y greenfield** (prohibido reutilizar código, marcas, clientes o infraestructura de empleadores).

---

## 1. Jerarquía y Agentes Autorizados

- **Orquestador Único:** **`GotPay Agent`** (ejecutándose en **Grok Bot.app**). Coordina olas de trabajo, prioridades, criterios de aceptación y handoffs leyendo y escribiendo `.swarm/SWARM_STATE.json`.
- **Agentes Ejecutores Conectados:**
  1. **Cursor AI:** dueño del núcleo técnico (`package.json`, `tsconfig.json`, `src/types/gotpay.ts`, `src/lib/pey/**`, `src/lib/db/**`, `src/lib/events/**`, `src/app/api/**`), seguridad (Semgrep/gitleaks) y despliegue (Vercel / túnel HTTPS).
  2. **Antigravity:** dueño de la experiencia de usuario y pruebas en navegador (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/jurado/**`, `src/components/**`, `src/lib/audio/**`).
  3. **Muse:** dueño de identidad visual, sonido de caja y narrativa audiovisual (`public/brand/**`, `public/sounds/**`, `.swarm/briefs/**`, `.swarm/pitch/**`).
- **Agentes Estrictamente Excluidos:** **NO** invocar ni usar **`Claude Code`** ni **`Gemini CLI`** en ningún flujo, terminal o subproceso de este proyecto.

---

## 2. Protocolo de Coordinación sin Colisiones

1. Antes de editar archivos, todo agente debe revisar `.swarm/SWARM_STATE.json`, `.swarm/MASTER_PLAN.md`, su workpack en `.swarm/workpacks/` y las órdenes activas de `GotPay Agent` en `.swarm/orders/`.
2. Respetar estrictamente las fronteras de carpetas de `ownership`. Si un agente necesita un cambio en `src/types/gotpay.ts`, lo solicita en `handoffLog` dentro de `.swarm/SWARM_STATE.json` para que `GotPay Agent` / `Cursor AI` actualicen el contrato.
3. En sentencias `switch` sobre uniones discriminadas (`ChargeStatus`, `GotPayRealtimeEvent`), mantener siempre verificación exhaustiva con `never`.
4. Mantener todos los `import` en la parte superior de cada módulo (sin inline imports).

---

## 3. Reglas Inquebrantables de Seguridad, Marca y API de pey

1. **Cero exposición de secretos:** `PEY_API_KEY` y `PEY_WEBHOOK_SECRET` viven exclusivamente en `.env.local` (`chmod 600`, ignorado por Git). Ningún agente puede imprimir su valor en consola, copiarlo en markdown, subirlo a prompts ni guardarlo en `.swarm/` o AgentStore. Nunca usar el prefijo `NEXT_PUBLIC_` para credenciales de `pey`.
2. **Validación de Webhooks e Idempotencia:** todo evento entrante en `/api/webhooks/pey` se verifica con `standardwebhooks` usando el cuerpo crudo (`await req.text()`) y se deduplica por header `webhook-id` y `transactionId` para no anunciar jamás dos veces el mismo cobro.
3. **Privacidad de Pagadores (Reglas Sec. 16.4):** el campo `metadata.clabe` (18 dígitos) del comprador nunca se almacena íntegro ni se envía al cliente web; conservar únicamente los últimos 4 dígitos (`clabeLast4`) y `bankCode`.
4. **Nombre y Marca (Reglas Sec. 6.8 y 7.6):** el producto se llama **GotPay**. Nunca llamarlo "pey ..." ni "CoDi ...", ni sugerir respaldo oficial de pey o Banco de México.
5. **Límites de API (Reglas Sec. 8.3 y 8.7):** prohibido ejecutar pruebas de estrés o escaneos de seguridad contra `api.pey.mx`. Las pruebas de carga se ejecutan solo contra mocks locales.
