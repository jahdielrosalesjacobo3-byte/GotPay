# Workpack Oficial — Antigravity (`MVP-W2` + UI Mes + Modo Jurado)

**Orquestador:** `GotPay Agent` (Grok Bot)  
**Plan Maestro:** `/Users/jahdielrosales/Documents/CURSOR-HACKATON/.swarm/MASTER_PLAN.md`

## Alcance Exclusivo de Archivos
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/app/jurado/**`
- `src/components/**`
- `src/lib/audio/**`

## Checklist de Ejecución Inmediata (`MVP-W2`)
1. Consumir exclusivamente los contratos de `src/types/gotpay.ts` y las rutas `/api/charges`, `/api/charges/[id]`, `/api/charges/[id]/reconcile`, `/api/charges/[id]/cancel` y `/api/events`.
2. Crear `src/lib/audio/announcer.ts` con desbloqueo explícito de `AudioContext` + `speechSynthesis` (`es-MX`) + `navigator.wakeLock`, conversor de números a pesos/centavos en español y alertas diferenciadas para `PAID` y `PAID_LATE`.
3. Construir en `src/app/page.tsx` la caja táctil de alto contraste de **GotPay**: apertura de turno, teclado grande, botones rápidos (`$0.01 Demo`, `$20`, `$50`, `$100`), QR CoDi gigante con cuenta regresiva, opción de envío por notificación push (`CODI_PUSH`), pantalla completa de confirmación verde/ámbar y bitácora de los últimos cobros mostrando solo `clabeLast4`.
4. Verificar en navegador real y registrar cierre en `.swarm/SWARM_STATE.json`.
