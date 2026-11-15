# ORDEN — Cursor AI · Documentar el repo GotPay de forma profesional (pitch 15 nov)

Usa tus **skills de documentación** para actualizar el repositorio con un README profesional, ilustrado, y una carpeta `docs/` clara. El detalle de estructura, tono y diagramas lo decides tú, dentro de este alcance.

**Prioridad:** lucir profesional en GitHub para el pitch de mañana, sin tocar el código de la app que ya funciona con pagos reales.

## Reglas duras (incumplirlas invalida la orden)

- NUNCA abras, leas, imprimas ni hagas cat/grep de `.env.local`, `.env.vercel.local` ni ningún secreto. No expongas `PEY_API_KEY`, `PEY_WEBHOOK_SECRET`, URLs de Supabase con credenciales, project refs sensibles, ni el secreto del webhook.
- Variables de entorno: documenta **solo nombres**, con valores de ejemplo vacíos o placeholders no reales (puedes basarte en `.env.example`, que es una plantilla). Nunca copies valores reales.
- La marca es **GotPay**. No sugieras respaldo, aval ni partnership de pey ni de Banxico. Puedes describir de forma factual que los cobros CoDi se crean vía la API de pey y que CoDi es la red de Banxico, sin implicar que ellos respaldan el producto.
- Desarrollo 100% individual y greenfield: nada de recursos, repos, clientes ni marcas de SecureCorp.
- No menciones Claude Code ni Gemini CLI (ni en docs, README, comentarios o créditos).
- Avisos MIT de repos reutilizados como referencia visual: **solo** en un archivo del repo, p. ej. `THIRD_PARTY_NOTICES.md` (puedes consolidar o apuntar lo que ya está en `LICENSES/`). **Sin crédito visible en el README ni en material de pitch.**
- **No toques código de la app**, dependencias, SSL ni el tema de vulnerabilidades. No listes `npm audit` ni `rejectUnauthorized` como pendientes visibles. No ejecutes `npm install` ni `npm audit fix`. No cambies `package.json` / lockfile, ni `src/**` salvo que sea estrictamente un asset de documentación fuera de la app.
- Alcance permitido: `README.md`, `docs/**`, `THIRD_PARTY_NOTICES.md` si lo creas, y assets de documentación (p. ej. `docs/assets/` o uso de logos ya existentes en `public/brand/`).
- No hagas commit, push ni deploy. Deja el working tree listo para revisión.

## Logos e identidad

Logos listos (usa **PNG**, no los SVG enormes, para que GitHub los renderice bien):

- `public/brand/gotpay-lockup-horizontal.png` — lockup principal (hero del README).
- `public/brand/gotpay-lockup-horizontal-dark.png` — variante oscura, si hace falta sobre fondo navy.
- `public/brand/gotpay-icon.png` — isotipo.
- `public/brand/gotpay-wordmark.png` — wordmark.
- Fuentes originales también en `public/brand/source/` (jpg).
- Tokens en `public/brand/tokens.json`.

Rutas de imagen en Markdown: relativas al root del repo, p. ej. `./public/brand/gotpay-lockup-horizontal.png`, y verifica que existan.

**Paleta:** navy `#112645`, slate `#27354B`, azul `#026EFB`, teal `#02BEC8`, menta `#0ADDA9`. En diagramas y docs, montos y estados en navy; **prohibido verde/menta como texto sobre blanco**. La pantalla de éxito «Ya cayó» se describe como fondo menta + texto navy.

## Contenido esperado

### 1. `README.md` profesional, en español

Debe verse bien en https://github.com/jahdielrosalesjacobo3-byte/GotPay. Incluye, como mínimo:

- Hero con logo GotPay (lockup) y tagline **«Ya me pagaron / Ya cayó»**.
- Qué es GotPay (en una o dos frases): cobros CoDi en el mostrador, confirmación en vivo cuando cae el pago.
- Demo en producción: https://gotpay.vercel.app
- Features:
  - Cobro QR CoDi en mostrador
  - Webhook con Standard Webhooks
  - Confirmación «ya cayó» en vivo (SSE + poll de respaldo)
  - Dashboard con datos reales de producción (no simulados)
  - Envío del enlace por WhatsApp (`wa.me`) + página pública `/pay/[id]` (QR guardable para abrirlo desde la galería del banco)
  - Modo Jurado (`/jurado`)
- Stack real del repo: Next.js 15, TypeScript, Tailwind, `qrcode`, `standardwebhooks`, `zod`, `ulid`, `pg`; store conmutable `GOTPAY_STORE=supabase|file`; Vitest; deploy en Vercel (región iad1) + Postgres en Supabase (schema `gotpay`). No inventes librerías que no estén en `package.json`.
- Cómo correr en local (`npm install`, `.env.example`, `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`).
- Variables de entorno: solo nombres + descripción breve + valores vacíos/placeholder. Nada real.
- Deploy: Vercel enlazado al repo, autodeploy en `main`; store de producción en Supabase. Sin IDs de proyecto, sin connection strings, sin secretos.
- Tests: cómo correrlos.
- Enlaces a `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/API.md`.

No pongas un roadmap de vulnerabilidades. No des instrucciones de estrés contra `api.pey.mx`.

### 2. `docs/ARCHITECTURE.md`

Diagramas **Mermaid** sintácticamente válidos (GitHub los renderiza). Al menos:

- Diagrama de componentes (caja Next.js, API routes, store file/Supabase, pey, WhatsApp `wa.me` como enlace, página `/pay/[id]`, webhook).
- Secuencia del cobro QR: cajero crea cobro → pey `POST /codi/qr` → se guarda `qrData` → el cliente paga → webhook `codi.qr.payment_received` (firma Standard Webhooks) → se actualiza el cobro en Supabase → la UI se entera por SSE/poll y muestra «Ya cayó».
- Secuencia WhatsApp / página pública: cajero escribe 10 dígitos → se abre `wa.me` con el enlace `/pay/{id}` → el cliente abre la página, guarda el QR y lo carga desde la galería en su app bancaria → el mismo webhook/poll confirma el pago.
- Modelo de datos de `gotpay.charges` y `gotpay.processed_webhooks` (campos de `GotPayCharge` / migraciones en `supabase/migrations/`, sin datos reales de cobros). Recuerda: CLABE solo como `clabeLast4` + `bankCode`; teléfono solo enmascarado.

Usa colores de la paleta en Mermaid cuando aporte claridad, sin texto menta/verde sobre fondo blanco.

### 3. `docs/SECURITY.md` (breve)

Solo prácticas ya implementadas, en positivo, sin lista de vulnerabilidades pendientes:

- Verificación de firma del webhook (Standard Webhooks).
- Idempotencia de webhooks/transacciones.
- Rol de mínimo privilegio en la base (`gotpay_server`).
- Secretos solo en variables de entorno del servidor (nunca `NEXT_PUBLIC_` para credenciales; `.env.local` no se commitea).
- No almacenar CLABE completa ni teléfono en claro.

### 4. `docs/API.md`

Endpoints existentes, método, propósito y si son de caja, públicos o webhook:

- `GET /api/health`
- `GET`/`POST /api/charges`
- `GET /api/charges/[id]`
- `POST /api/charges/[id]/cancel`
- `POST /api/charges/[id]/reconcile`
- `GET /api/events` (SSE)
- `POST /api/webhooks/pey`
- Página `GET /pay/[id]` (UI, no API)

No documentes payloads con CLABE completa ni ejemplos de secretos o firmas reales.

## Verificación que debes correr tú

- Confirma que las rutas de imagen del README existen.
- Revisa que los bloques Mermaid cierren bien (`graph`/`sequenceDiagram`/`erDiagram`).
- No hace falta `next build` (el revisor lo correrá). No commitees.
