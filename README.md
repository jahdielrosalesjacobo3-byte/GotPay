<p align="center">
  <img src="./public/brand/gotpay-lockup-horizontal.png" alt="GotPay" width="420" />
</p>

<h1 align="center">GotPay</h1>

<p align="center"><strong>Ya me pagaron / Ya cayó</strong></p>

<p align="center">
  Cobros CoDi en el mostrador con confirmación en vivo cuando el pago entra.
</p>

<p align="center">
  <a href="https://gotpay.vercel.app">Demo en producción</a>
  &nbsp;·&nbsp;
  <a href="./docs/ARCHITECTURE.md">Arquitectura</a>
  &nbsp;·&nbsp;
  <a href="./docs/SECURITY.md">Seguridad</a>
  &nbsp;·&nbsp;
  <a href="./docs/API.md">API</a>
</p>

---

## Qué es GotPay

**GotPay** es una caja ligera para comercios que generan cobros CoDi en mostrador (QR o envío al celular) y necesitan saber al instante cuándo el dinero cayó. Los cobros se crean mediante la API de [pey](https://pey.mx); CoDi es la red operada por el Banco de México — GotPay es un producto independiente, sin aval ni partnership de pey ni de Banxico.

## Características

| Área | Qué hace |
|------|----------|
| **QR en mostrador** | Crea cobros `CODI_QR` y muestra el QR para que el cliente pague desde su banco. |
| **Webhook firmado** | Recibe eventos de pago con verificación [Standard Webhooks](https://www.standardwebhooks.com/). |
| **Confirmación en vivo** | SSE (`/api/events`) más sondeo de respaldo en producción con store Supabase. |
| **Dashboard real** | Lista y resumen de cobros desde datos de producción (no simulados en el deploy público). |
| **WhatsApp + enlace** | El cajero captura 10 dígitos, se abre `wa.me` con el enlace a `/pay/[id]`; el cliente puede guardar el QR y pagar desde la galería. |
| **Modo Jurado** | Recorrido guiado en [`/jurado`](https://gotpay.vercel.app/jurado) para demo del hackatón. |

<p align="center">
  <img src="./public/brand/gotpay-icon.png" alt="Isotipo GotPay" width="72" />
</p>

## Stack

| Capa | Tecnología |
|------|------------|
| App | [Next.js 15](https://nextjs.org), React 19, TypeScript |
| Estilos | Tailwind CSS |
| Validación | Zod |
| IDs | ULID |
| QR | `qrcode` |
| Webhooks | `standardwebhooks` |
| Base de datos | `pg` → Postgres (schema `gotpay` en Supabase en producción) |
| Store conmutable | `GOTPAY_STORE=file` (local) o `supabase` (producción) |
| Pruebas | Vitest |
| Deploy | Vercel (región `iad1`) |

## Demo y rutas útiles

- **Producción:** https://gotpay.vercel.app  
- **Caja (dashboard):** `/`  
- **Página pública de cobro:** `/pay/[id]`  
- **Modo Jurado:** `/jurado`

## Desarrollo local

```bash
git clone https://github.com/jahdielrosalesjacobo3-byte/GotPay.git
cd GotPay
npm install
cp .env.example .env.local
# Edita .env.local con tus credenciales (nunca las subas a Git).
chmod 600 .env.local
npm run dev
```

La app queda en http://localhost:3000.

### Comandos

```bash
npm run dev        # servidor de desarrollo
npm test           # Vitest (suite unitaria)
npm run typecheck  # TypeScript sin emitir
npm run build      # build de producción
npm start          # servir build local
```

Para probar webhooks en local puedes usar `npm run tunnel` (túnel HTTPS hacia tu `next dev`); registra la URL pública del webhook en el panel de pey apuntando a `/api/webhooks/pey`.

## Variables de entorno

Solo nombres y placeholders. Los valores reales viven en `.env.local` (ignorado por Git).

| Variable | Descripción | Ejemplo (no real) |
|----------|-------------|-------------------|
| `PEY_API_BASE_URL` | Base de la API de pey | `https://api.pey.mx` |
| `PEY_API_KEY` | Clave de API de pey (servidor) | `` |
| `PEY_WEBHOOK_SECRET` | Secreto Standard Webhooks tras registrar el endpoint | `whsec_...` |
| `NEXT_PUBLIC_APP_NAME` | Nombre visible en UI | `GotPay` |
| `GOTPAY_STORE` | `file` (`.data/`) o `supabase` | `file` |
| `SUPABASE_DB_URL` | Connection string del rol `gotpay_server` (solo servidor) | `postgresql://...` |
| `GOTPAY_MERCHANT_CLABE_LAST4` | Opcional: últimos 4 dígitos de la CLABE del comercio para health | `1234` |

No uses prefijo `NEXT_PUBLIC_` para credenciales de pey ni de la base de datos.

## Deploy

- Repositorio enlazado a **Vercel**; despliegue automático desde la rama `main`.
- Store de producción: `GOTPAY_STORE=supabase` con Postgres (schema `gotpay`) en Supabase.
- Configura las mismas variables de entorno en el panel de Vercel (sin commitear secretos).

No ejecutes pruebas de estrés ni escaneos contra `api.pey.mx`; usa mocks y tu entorno local.

## Documentación

- [Arquitectura y flujos](./docs/ARCHITECTURE.md) — componentes, secuencias CoDi y modelo de datos.  
- [Seguridad](./docs/SECURITY.md) — prácticas implementadas.  
- [API HTTP](./docs/API.md) — rutas de caja, públicas y webhook.

## Identidad visual

Paleta de marca: navy `#112645`, slate `#27354B`, azul `#026EFB`, teal `#02BEC8`, menta `#0ADDA9`. La pantalla de éxito **«Ya cayó»** usa fondo menta con texto navy. Assets en `public/brand/` y tokens en `public/brand/tokens.json`.

## Licencia

Avisos de terceros con licencias MIT de referencia visual: [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).