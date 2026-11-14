# MASTER PLAN — GotPay ("Ya me pagaron / Ya cayó")

**Proyecto:** `GotPay`  
**Repositorio:** `https://github.com/jahdielrosalesjacobo3-byte/GotPay.git`  
**Workspace local:** `/Users/jahdielrosales/Documents/CURSOR-HACKATON`  
**Orquestador Único:** `GotPay Agent` (en `Grok Bot.app`)  
**Ejecutores Conectados:** `Cursor AI` · `Antigravity` · `Muse`  
**Excluidos Estrictamente:** `Claude Code` · `Gemini CLI`  
**Modalidad:** 100% individual y greenfield (cero recursos, código, clientes o marcas de empleador).

---

## 1. Tesis Ganadora y Alineación con la Rúbrica Oficial

El **14 de diciembre de 2026** (mismo día en que se anuncian los ganadores) entra en vigor la disposición de Banco de México que obliga a los bancos participantes de SPEI a mostrar **CoDi en portada y completar el pago en 3 pasos con 0% de comisión**. Millones de compradores tendrán el botón listo, pero en puestos de comida, tianguis, fondas, barberías y mostradores persiste el cuello de botella: el comerciante tiene las manos ocupadas, pierde tiempo revisando el celular o sufre fraudes con capturas falsas.

**GotPay** convierte cualquier teléfono, tableta o laptop en una **caja-bocina instantánea para CoDi**:
1. El comerciante marca el monto (o toca un botón rápido).
2. `GotPay` genera al instante un QR CoDi real mediante la API productiva de `pey` (o envía notificación push al celular del cliente si está a distancia).
3. En cuanto `pey` entrega el webhook firmado (`Standard Webhooks`), la pantalla cambia a verde de alto contraste y el altavoz anuncia con claridad en español: **«GotPay: ya cayeron ochenta y cinco pesos. Folio 004»**.

| Criterio Oficial (Sec. 11.2) | Peso | Cómo maximiza puntaje GotPay |
|---|---:|---|
| **Uso de CoDi y API de pey** *(1er desempate)* | **30%** | Integración productiva real (`POST /codi/qr`, `POST /codi/pn`, `GET /transaction/codi/qr/:id`, `GET /transaction/:id` y webhooks firmados), aprovechando 0% comisión, liquidación inmediata y cero contracargos. |
| **Impacto y relevancia** *(2do desempate)* | **25%** | Resuelve un dolor diario y masivo del comercio mexicano sin exigir comprar terminales ni pagar porcentajes por venta. |
| **Ejecución técnica** | **15%** | Verificación criptográfica sobre raw body, doble idempotencia (`webhook-id` + `transactionId`), máquina de 6 estados exhaustiva, SSE + polling + reconciliación activa, enmascarado de datos bancarios (`clabeLast4`) y escaneo Semgrep limpio. |
| **Experiencia y diseño** | **15%** | Operación manos libres pensada para luz de calle, desbloqueo guiado de audio + `wakeLock`, y Modo Jurado (`/jurado`) de 1 clic con `$0.01 MXN`. |
| **Originalidad** | **15%** | Lleva el paradigma de *soundbox* de pagos instantáneos a CoDi en México como PWA universal sin hardware propietario. |

---

## 2. Arquitectura Técnica y Contratos entre Agentes

### 2.1 Fronteras de Propiedad (Cero Colisiones)

| Agente | Rol | Rutas bajo su propiedad exclusiva |
|---|---|---|
| **GotPay Agent** *(Grok Bot)* | Orquestador General | `.swarm/SWARM_STATE.json`, `.swarm/orders/**`, `.swarm/decisions/**` |
| **Cursor AI** | Backend `pey`, Persistencia, Tiempo Real, Seguridad y Deploy | `package.json`, `tsconfig.json`, `next.config.ts`, `src/types/gotpay.ts`, `src/lib/pey/**`, `src/lib/db/**`, `src/lib/events/**`, `src/app/api/**`, scripts y configuración Vercel |
| **Antigravity** | Interfaz PWA de Caja, Locución Web, Modo Jurado y QA Browser | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/jurado/**`, `src/components/**`, `src/lib/audio/**` |
| **Muse** | Identidad Visual, Audio UX y Narrativa de Pitch / Video | `public/brand/**`, `public/sounds/**`, `.swarm/briefs/**`, `.swarm/pitch/**` |

### 2.2 Contratos HTTP y Tiempo Real (`Cursor AI` <-> `Antigravity`)

Todos los payloads consumen las interfaces de `/Users/jahdielrosales/Documents/CURSOR-HACKATON/src/types/gotpay.ts`:

1. **`POST /api/charges`** — Crea un cobro en `pey` y lo persiste como `PENDING`.
   - Request JSON: `CreateChargeRequest` (`{ amount, concept, channel: "CODI_QR" | "CODI_PUSH", phone?, expirationSeconds? }`).
   - Acción servidor: genera `id` (ULID) y `numRef` numérico (7 dígitos), invoca `POST https://api.pey.mx/codi/qr` o `POST https://api.pey.mx/codi/pn` con Bearer `PEY_API_KEY` (solo servidor) y `externalMetadata: { orderId: id }`.
   - Response `201`: `{ charge: GotPayCharge }`.
2. **`GET /api/charges`** — Lista los cobros recientes del turno y totales del día.
   - Response `200`: `{ charges: GotPayCharge[], summary: { paidCount: number, paidTotalMxn: number, pendingCount: number, lateCount: number } }`.
3. **`GET /api/charges/[id]`** — Consulta puntual (usada por el fallback de polling cada 2 s cuando un cobro está `PENDING`).
   - Response `200`: `{ charge: GotPayCharge }`.
4. **`POST /api/charges/[id]/reconcile`** — Reconciliación activa contra `GET /transaction/codi/qr/:codiQrId` en `pey` si el webhook tarda más de 10 s.
   - Response `200`: `{ charge: GotPayCharge, reconciled: boolean }`.
5. **`POST /api/charges/[id]/cancel`** — Cancela localmente un cobro `PENDING` (si luego cae pago en `pey`, transiciona a `PAID_LATE`).
6. **`POST /api/webhooks/pey`** — Receptor oficial de `pey`.
   - Lee `rawBody = await req.text()` y valida firma con `standardwebhooks` + `PEY_WEBHOOK_SECRET`.
   - Deduplica por header `webhook-id` y por `transactionId`.
   - Extrae únicamente `clabeLast4 = metadata?.clabe?.slice(-4)` y `bankCode` (jamás persiste ni emite la CLABE completa de 18 dígitos).
   - Si el cobro estaba `PENDING` y dentro de vigencia -> `PAID` -> emite `charge.paid`.
   - Si el cobro estaba `EXPIRED` o `CANCELLED` -> `PAID_LATE` -> emite `charge.paid_late`.
7. **`GET /api/events`** — Stream `text/event-stream` (SSE) que envía eventos `GotPayRealtimeEvent` (`charge.created`, `charge.paid`, `charge.paid_late`, `charge.expired`, `heartbeat` cada 15 s).

---

## 3. FASE 1 — Plan Detallado del MVP para Mañana (24 Horas · 14–15 Nov)

**Meta innegociable de Fase 1:** tener hoy mismo corriendo en URL HTTPS pública (Vercel + túnel de desarrollo para pruebas locales) el flujo completo donde un pago real de **`$0.01 MXN`** dispara en menos de 3 segundos la pantalla esmeralda y la voz en español de **GotPay**.

### Ola `MVP-W1` · Núcleo Backend, Persistencia e Integración `pey` (`Cursor AI`)
- **Tareas:**
  1. Inicializar proyecto Next.js 15 (App Router, TypeScript estricto, Tailwind CSS) e instalar `standardwebhooks`, `qrcode`, `ulid`, `zod`.
  2. Construir `src/lib/pey/client.ts` con manejo de errores tipado, timeouts de 10 s y soporte para `POST /codi/qr`, `POST /codi/pn`, `GET /transaction/codi/qr/:id` y `GET /transaction/:id`.
  3. Construir `src/lib/pey/webhooks.ts` con validación `Standard Webhooks` sobre raw body y sanitización de `metadata.clabe` -> `clabeLast4`.
  4. Construir `src/lib/db/store.ts` con persistencia atómica JSON/SQLite en desarrollo + memoria compartida para el runtime, garantizando tablas/índices de `charges` y `processed_webhooks`.
  5. Construir `src/lib/events/bus.ts` y exponer las rutas `src/app/api/charges/route.ts`, `src/app/api/charges/[id]/route.ts`, `src/app/api/charges/[id]/reconcile/route.ts`, `src/app/api/charges/[id]/cancel/route.ts`, `src/app/api/webhooks/pey/route.ts` y `src/app/api/events/route.ts`.
- **Criterio de aceptación:** `npm run typecheck` en cero errores; creación real de un QR de `$0.01 MXN` contra `api.pey.mx` devolviendo `201`; prueba automatizada de idempotencia del webhook (mismo `webhook-id` enviado 2 veces solo actualiza y emite evento 1 vez).

### Ola `MVP-W2` · Caja Táctil PWA y Motor de Voz en Español (`Antigravity`)
- **Tareas:**
  1. Construir `src/lib/audio/announcer.ts`:
     - Función ` unlockAudioAndWakeLock()` invocada en el botón de apertura de caja (`AudioContext.resume()`, chime sintético WebAudio de 400 ms, frase corta en `speechSynthesis` `es-MX` y `navigator.wakeLock.request("screen")`).
     - Conversor exacto de montos MXN a texto hablado natural (*`$0.01` -> «un centavo»*, *`$85.50` -> «ochenta y cinco pesos con cincuenta centavos»*).
     - Locuciones diferenciadas para `PAID` (*«GotPay: ya cayó, ...»*) y `PAID_LATE` (*«Atención en GotPay: pago tardío de ... revisar orden»*).
  2. Construir la vista principal `src/app/page.tsx` y componentes en `src/components/`:
     - Pantalla de desbloqueo de turno («Abrir caja GotPay y probar bocina»).
     - Teclado numérico grande + botones de 1 toque (`$0.01 Demo`, `$20`, `$50`, `$100`) + campo corto de concepto.
     - Modal/vista de cobro activo con QR renderizado en máximo contraste, cuenta regresiva de expiración, pestaña alterna para enviar cobro push al celular (`CODI_PUSH`) y botón «Verificar pago ahora» (`reconcile`).
     - Overlay de confirmación a pantalla completa (verde esmeralda para `PAID`, ámbar para `PAID_LATE`) que se auto-descarta tras 4 s dejando lista la caja para el siguiente cliente.
     - Tira inferior con resumen del turno y últimos 5 pagos confirmados (`folio`, `monto`, `hora`, `clabeLast4`).
- **Criterio de aceptación:** flujo fluido en móvil y laptop, sin errores de consola, con reconexión automática SSE + polling cada 2 s mientras exista un cobro `PENDING`.

### Ola `MVP-W3` · Identidad Visual Oficial, Sonido y Pitch de 90 Segundos (`Muse`)
- **Tareas:**
  1. Tomar los 3 logos oficiales ya depositados en `public/brand/source/` (`gotpay-icon.jpg`, `gotpay-lockup-horizontal.jpg`, `gotpay-wordmark.jpg`) sin modificar su diseño: convertirlos a SVG + PNG con fondo transparente en `public/brand/`, generar íconos PWA / `favicon` y publicar la paleta oficial de marca para `Antigravity`.
  2. Entregar en `public/sounds/` los parámetros acústicos / clips WAV ligeros libres de derechos (`paid-chime.wav` y `late-alert.wav`).
  3. Entregar en `.swarm/pitch/pitch-manana-90s.md` el guion cronometrado de 90 segundos + checklist escénica para la demostración presencial de mañana.
- **Criterio de aceptación:** cero menciones a `pey` o `CoDi` dentro del nombre de marca, contraste legible a 2 metros de distancia y guion probado en voz alta en <= 90 s.

### Ola `MVP-W4` · Enlace de Webhook Público, Prueba Real `$0.01 MXN` y Seguro de Escenario (`Cursor AI` + `GotPay Agent`)
- **Tareas:**
  1. Desplegar el MVP en Vercel (o túnel HTTPS temporal mientras queda fijo el dominio de Vercel) y registrar `https://<host>/api/webhooks/pey` en `portal.mipey.mx`, guardando `PEY_WEBHOOK_SECRET` únicamente en `.env.local` y en las variables cifradas de Vercel.
  2. Ejecutar 3 pagos reales de `$0.01 MXN` desde banca móvil midiendo tiempo extremo a extremo (`creación -> escaneo -> webhook -> voz`).
  3. Correr `semgrep` sobre `src/`, verificar cero fugas antes de `git commit` y empujar `main` a `https://github.com/jahdielrosalesjacobo3-byte/GotPay.git`.
  4. Grabar video crudo de respaldo de 45 s mostrando el pago real funcionando de principio a fin.

---

## 4. FASE 2 — Plan Completo de Pulido a 4 Semanas (16 Nov – 12 Dic)

### Ola `MES-S1` · Semana 1 (16 – 22 de noviembre): Persistencia Cloud, Cuenta Propia y Reconciliación Robusta
- **Cursor AI:**
  - Migrar `src/lib/db/store.ts` a PostgreSQL en Supabase personal con migraciones SQL limpias (`charges`, `webhook_events`, `daily_closures`, `quick_items`) manteniendo compatibilidad exacta con `src/types/gotpay.ts`.
  - Monitorear el cambio de estado de tu CLABE personal a `ACTIVE` (`GET /bank-account/:id` y webhook `bank_account.updated`) para pasar de la CLABE de pruebas de `pey` a tu propia cuenta receptora, conservando un toggle aislado para demos de `$0.01 MXN`.
  - Añadir job/reconciliador automático para cobros huérfanos contra `GET /transaction/codi/qr/:id` y `GET /transaction/:id`.
- **GotPay Agent:** auditar latencias reales por banco emisor y documentar matriz de compatibilidad bancaria en `.swarm/decisions/bank-matrix.md`.

### Ola `MES-S2` · Semana 2 (23 – 29 de noviembre): Modo Mostrador Emparejado, Catálogo de 1 Toque y Voz Natural
- **Antigravity + Cursor AI:**
  - **Modo Mostrador Emparejado:** vincular mediante código corto/QR una pantalla-bocina fija en el mostrador con el teléfono del cajero en tiempo real, de modo que el dueño cobre desde su bolsillo y la tableta/celular viejo en la barra muestre el QR y cante el pago.
  - **Catálogo rápido editable:** botonera de artículos frecuentes («Orden de 3», «Agua fresca», «Corte clásico») que arman el monto en 1 toque.
  - **Entrada rápida por voz:** dictado opcional del monto y concepto en el navegador para manos ocupadas.
  - **Corte de caja diario:** cierre de turno con totales conciliados contra transacciones de `pey` y descarga directa en CSV/PDF.
  - **Locución mejorada:** pre-síntesis/caché de frases frecuentes para que suene nítida incluso en navegadores con voces nativas limitadas, manteniendo `speechSynthesis` como respaldo offline/instantáneo.

### Ola `MES-S3` · Semana 3 (30 de noviembre – 6 de diciembre): Casos Borde, Bounties, Seguridad y Piloto en Calle
- **GotPay Agent:**
  - El **30 de noviembre** revisar el Documento de Premios y los **Bounties** oficiales en `hackatonmexico.com` / `pey.build`. Si algún bounty encaja sin comprometer la propiedad intelectual de `GotPay`, aislar el entregable en paquete separado conforme a la Sección 15 de las Reglas.
- **Cursor AI + Antigravity:**
  - Blindar todos los escenarios exigidos por `pey`: pagos tardíos (`PAID_LATE`), QRs expirados, intentos de doble cobro sobre la misma orden, desconexión momentánea de red y guía clara de devolución manual desde el historial.
  - Rate limiting por IP en endpoints públicos, cabeceras CSP estrictas, auditoría completa con Semgrep y verificación de privacidad (cero exposición de CLABEs completas o teléfonos sin enmascarar).
- **Validación de campo (Impacto 25%):**
  - Operar `GotPay` en 1–2 comercios/puestos reales amigos durante al menos una jornada, midiendo tiempos de cobro y recopilando evidencia real para la entrega.

### Ola `MES-S4` · Semana 4 (7 – 12 de diciembre): Modo Jurado, Video Oficial y Congelamiento
- **7 de diciembre (Feature Freeze):** congelar nuevas funcionalidades; solo corrección de bugs y pulido visual.
- **Antigravity (`src/app/jurado/page.tsx`):**
  - Publicar `/jurado` accesible **sin login ni invitación** (Reglas Sec. 10.1.2): botón directo *«Probar GotPay con $0.01 MXN reales»*, QR CoDi inmediato, indicador en vivo de los 4 pasos (`1. Cobro creado en pey` -> `2. Esperando autorización CoDi` -> `3. Webhook Standard Webhooks verificado` -> `4. Confirmación sonora GotPay`) y registro anonimizado de la transacción.
- **Muse + GotPay Agent (`.swarm/pitch/`):**
  - Producir el video demostrativo oficial de **máximo 3 minutos** mostrando el problema real, un cobro CoDi completo de principio a fin y la reacción sonora/visual de `GotPay`.
  - Redactar los textos finales obligatorios: descripción del proyecto (`<= 500 palabras`), instrucciones de prueba para el jurado (`<= 1000 palabras`) y declaración transparente de proyecto 100% greenfield + librerías open-source utilizadas.
- **Hitos de cierre inamovibles:**
  - **Antes del 10 de diciembre 23:59 CDMX:** completar **Postulación** formal en `pey.build`.
  - **11 de diciembre (24 h antes del límite):** subir **Entrega completa** en `pey.build` y verificar enlaces desde ventana incógnita.
  - **12 de diciembre 23:59 CDMX – 14 de diciembre (y hasta 31 ene 2027):** congelamiento total de producción para revisión del jurado.

---

## 5. Protocolo de Mando para `GotPay Agent`

1. **Lectura de estado:** `GotPay Agent` inspecciona `.swarm/SWARM_STATE.json` y este `MASTER_PLAN.md` antes de abrir o cerrar cualquier ola.
2. **Despacho de órdenes:** para activar trabajo en `Cursor AI`, `Antigravity` o `Muse`, `GotPay Agent` actualiza el estado de la ola correspondiente en `.swarm/SWARM_STATE.json` (`ready` -> `in_progress` -> `completed`), escribe órdenes puntuales en `.swarm/orders/` si requiere ajustes finos y deja rastro en `handoffLog`.
3. **Compuertas de calidad antes de cerrar cada ola:**
   - Compilación TypeScript limpia (`tsc --noEmit`).
   - Respeto estricto a fronteras de archivos (`ownership`).
   - Cero lectura o volcado de `.env.local` y cero uso de `Claude Code` o `Gemini CLI`.
   - Verificación funcional del cobro en `pey`.
