# ORDEN 02 — Antigravity · MVP-W2 (caja PWA)

**Workpack:** `.swarm/workpacks/antigravity.md` · **Contrato:** `src/types/gotpay.ts` · **Rutas:** `MASTER_PLAN.md` §2.2

## Fase A — ejecutar ya (sin esperar backend)
1. Marca `MVP-W2` como `in_progress`.
2. `src/lib/audio/announcer.ts`: `unlockAudioAndWakeLock()` (AudioContext.resume, chime WebAudio 400 ms, frase es-MX, `wakeLock`), conversor de montos a texto ("$0.01" -> "un centavo", "$85.50" -> "ochenta y cinco pesos con cincuenta centavos"), locuciones PAID ("GotPay: ya cayó, ...") y PAID_LATE ("Atención en GotPay: pago tardío de ... revisar orden").
3. `src/app/page.tsx` + `src/components/**`: apertura de turno, teclado grande, botones `$0.01 Demo`/`$20`/`$50`/`$100`, concepto corto, QR gigante con cuenta regresiva, pestaña push (`CODI_PUSH`), botón "Verificar pago ahora", overlay 4 s, tira con últimos 5 pagos (solo `clabeLast4`).
4. Trabaja contra un mock local que respete exactamente los tipos del contrato. No edites `src/app/api/**` ni `src/types/**`.

## Fase B — cuando Cursor AI marque G1
Conecta a `/api/*` reales y `/api/events` (SSE) con fallback de polling cada 2 s mientras haya cobro `PENDING`.

## Colores oficiales (de `orders/brand-tokens.json`, tomados de los logos)
| Token | Hex | Uso en la caja |
|---|---|---|
| navy | `#112645` | Montos, folios, texto principal, fondo de cobro pendiente (texto blanco, 15.1:1) |
| slate | `#27354B` | Texto secundario |
| blue | `#026EFB` | Botón primario y acentos (texto >= 18px, 4.5:1 con blanco) |
| teal | `#02BEC8` | Punto medio del degradado |
| mint | `#0ADDA9` | **Fondo del overlay PAID** con texto navy (8.6:1) |
| payGreen | `#0CD6A7` | Acento de marca; nunca como texto sobre blanco (1.9:1) |
| amber (propuesta) | `#F5A524` | Fondo del overlay PAID_LATE con texto navy (7.4:1) |
| Degradado | `linear-gradient(135deg, #026EFB, #02BEC8, #0ADDA9)` | Encabezado / pantalla de apertura |

Expón los tokens como variables CSS en `src/app/globals.css` (`--gp-navy`, `--gp-blue`, etc.). Logo: usa los SVG/PNG de Muse en `public/brand/` en cuanto existan; mientras tanto `public/brand/source/gotpay-lockup-horizontal.jpg` sobre fondo blanco.

### Compuerta G2
- [ ] Flujo completo en Chrome móvil y laptop, 0 errores de consola.
- [ ] Reconexión SSE automática + polling 2 s verificado cortando la red.
- [ ] Voz es-MX correcta para $0.01, $20, $85.50 y PAID_LATE.
- [ ] Monto y estado legibles a 2 m (navy sobre mint/blanco).
- [ ] Nunca se muestra CLABE completa ni teléfono sin enmascarar.
- [ ] Marca `gate_passed` con capturas/evidencia en `handoffLog`.
