# ORDEN — Cursor AI · Página pública de cobro + botón WhatsApp (pitch 15 nov)

**Prioridad absoluta:** no romper el flujo QR de mostrador ya probado con pagos reales CoDi. Cambio aditivo y de bajo riesgo. No toques pey, webhooks, store, SSL ni dependencias.

## Reglas duras (incumplirlas invalida la orden)

- NUNCA abras, leas, imprimas ni hagas cat/grep de `.env.local`, `.env.vercel.local` ni ningún secreto. No expongas `PEY_API_KEY` ni `PEY_WEBHOOK_SECRET`.
- No llames a la API de pey. No crees cobros reales nuevos.
- No toques `src/lib/pey/**`, `src/app/api/webhooks/**`, `src/lib/db/store*.ts`, `src/lib/db/lifecycle.ts`, ni configuraciones SSL. No ejecutes `npm install` ni `npm audit fix`. No cambies `package.json` / lockfile.
- Nunca uses `NEXT_PUBLIC_` para credenciales.
- La marca es GotPay. No sugieras respaldo de pey ni de Banxico en la UI ni en el mensaje de WhatsApp.
- Colores: montos y estados en navy `#112645` (PROHIBIDO verde/menta como texto sobre blanco). Pantalla de cobro pagado («Ya cayó») = fondo menta `#0ADDA9` + texto navy.
- Desarrollo 100% individual/greenfield: nada de recursos, repos, clientes ni marcas de SecureCorp.
- No hagas commit, push ni deploy. Solo implementa. Deja el working tree listo para revisión.

## Contexto técnico ya verificado

- pey `POST /codi/qr` devuelve `id` + `qrString`. GotPay lo guarda en `GotPayCharge.codiQrId` y `GotPayCharge.qrData`. `QrCodeCanvas` ya renderiza `qrData` como `<img>` data URL. No hay URL de checkout de pey; la página pública es nuestra.
- No existe `/pay/[id]`. Únicas páginas: `/` y `/jurado`.
- `GET /api/charges/[id]` (`src/app/api/charges/[id]/route.ts`) ya es público, sin auth, y devuelve `{ charge }`. El POS (`useGotPayPos.ts`) lo consulta cada 2 s para el cobro activo. El webhook ya marca `PAID` / `PAID_LATE`.
- `GET /api/charges` (lista) y `GET /api/events` (SSE de todos los cobros) también son públicos: la página del cliente NO debe usarlos.
- La pestaña «Cobro al Celular (Push)» de `ActiveChargeModal` llama a pey `/codi/pn`. NO la reutilices para WhatsApp. El botón va en la pestaña QR, como control aparte.

## Tareas (las 4, todas)

### 1. Página pública `src/app/pay/[id]/page.tsx`

- Página cliente que carga `GET /api/charges/[id]` (cache: no-store).
- Muestra: monto, concepto, folio (`numRef`), countdown si está pendiente, QR con `QrCodeCanvas`, estado.
- Poll cada 2 s al mismo GET mientras el status sea `CREATED` o `PENDING`. No uses `/api/events` ni `GET /api/charges` (lista).
- Si `PAID` o `PAID_LATE`: pantalla «Ya cayó» (fondo menta, texto navy) y oculta el QR. No muestres cancelar, reconciliar, simulador, SSE badges ni controles de cajero.
- 404 si el cobro no existe. Si expiró / cancelado, indícalo en navy, sin invitar a pagar.
- Texto de ayuda visible junto al QR (pendiente): «Mantén presionado el QR, guárdalo y ábrelo desde la galería en tu app del banco».
- Mobile-first, objetivos táctiles ≥44 px, contraste AA.

### 2. QR guardable en `src/components/QrCodeCanvas.tsx`

- Extiende el componente sin romper el modal del cajero (defaults iguales al comportamiento actual).
- En la página pública: quitar `select-none` (prop, p. ej. `allowSave`) y un control «Guardar QR» (`<a download="gotpay-qr.png" href={dataUrl}>` o equivalente). En iPhone `download` suele fallar: el texto de «mantén presionado…» es obligatorio.
- No agregues dependencias nuevas; `qrcode` ya está.

### 3. `GET /api/charges/[id]` — no-store + DTO, sin romper el POS

- Agrega `Cache-Control: no-store`.
- Devuelve un DTO sanitizado (como `toPublicCharge` de `src/app/api/charges/route.ts`: solo `clabeLast4` de 4 dígitos, nunca CLABE completa ni teléfono sin máscara).
- **No recortes campos que el POS ya consume de este endpoint.** Debe seguir incluyendo al menos: `id`, `status`, `amount`, `concept`, `qrData`, `expiresAt`, `numRef`, `paidAt`, `createdAt`, `channel`, `codiQrId`, `payerPhoneMasked`, `clabeLast4`, `bankCode`, `transactionId`, `trackingKey`. Si omites alguno, se rompe el poll / overlay del cajero.
- No agregues auth (rompería la página pública y el POS). No cambies POST create/cancel/reconcile ni el GET de lista.

### 4. Botón WhatsApp en la pestaña QR de `ActiveChargeModal`

- Solo en la pestaña «QR en Mostrador», debajo del QR, control aparte (no toques la pestaña Push ni `onSendPushAlternative`).
- Campo de 10 dígitos + botón que abre (no hace fetch) `https://wa.me/52{10digitos}?text=...` con mensaje prellenado, p. ej. `Tu cobro GotPay de $120.00, paga aquí: {origin}/pay/{id}`. Usa `window.location.origin` (en prod será `https://gotpay.vercel.app/pay/{id}`). Formatea el monto en MXN.
- Valida 10 dígitos antes de abrir. El cajero pulsa enviar en su WhatsApp. Sin API de Meta, sin llamada a pey, sin guardar el número del cliente.
- No deshabilites ni muevas el QR de mostrador, ni «Verificar pago ahora», ni cancelar.

## Verificación local (tú)

- `npx tsc --noEmit`
- `npx vitest run`
- Si agregas pruebas, que sean unitarias y no llamen a pey.

No hagas `next build` si te falta tiempo; el revisor lo correrá. No commitees.
