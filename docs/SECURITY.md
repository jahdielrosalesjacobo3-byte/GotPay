# Seguridad — GotPay

Resumen **positivo** de controles ya implementados en el código. No sustituye una auditoría formal.

## Webhooks de pey

- Cada `POST /api/webhooks/pey` lee el **cuerpo crudo** (`text`) y valida la firma con la librería **Standard Webhooks** y `PEY_WEBHOOK_SECRET` (solo variables de entorno del servidor).
- Cabeceras requeridas: `webhook-id`, `webhook-timestamp`, `webhook-signature`. Respuesta `401` si la firma no es válida.

## Idempotencia

- Se registra cada `webhook-id` en `gotpay.processed_webhooks` (o equivalente en store `file`).
- También se evita procesar dos veces el mismo `transactionId` de pago antes de publicar el evento «ya cayó».

## Base de datos (Supabase / Postgres)

- Schema dedicado `gotpay` sin permisos para roles `anon` / `authenticated` del proyecto.
- Rol de aplicación **`gotpay_server`**: privilegios mínimos (`SELECT`, `INSERT`, `UPDATE` acotados; sin `DELETE` en webhooks procesados).
- Row Level Security habilitada; políticas limitadas al rol de servidor.
- La cadena de conexión vive en `SUPABASE_DB_URL` (servidor). No se documenta ni se expone en el cliente.

## Secretos y configuración

- `PEY_API_KEY`, `PEY_WEBHOOK_SECRET` y `SUPABASE_DB_URL` **nunca** usan prefijo `NEXT_PUBLIC_`.
- `.env.local` y `.env.vercel.local` están fuera de Git; la plantilla pública es `.env.example` sin valores reales.
- `GET /api/health` solo indica si las claves están configuradas (`true`/`false`), no imprime secretos.

## Privacidad del pagador

- La CLABE completa del comprador **no** se persiste ni se devuelve en JSON de API; como mucho `clabeLast4` y `bankCode` tras un pago confirmado.
- El teléfono del pagador se guarda y expone solo en forma **enmascarada** (`payerPhoneMasked`).
- Las respuestas de `GET /api/charges` y `GET /api/charges/[id]` pasan por una vista pública que refuerza esas reglas.

## Operación segura recomendada

- Rotar credenciales de pey y del webhook si hubo exposición accidental.
- Registrar en pey únicamente URLs HTTPS de producción para el webhook.
- No commitear ni pegar en issues los valores de `PEY_*` o `SUPABASE_DB_URL`.

Más detalle de endpoints: [API.md](./API.md). Flujos: [ARCHITECTURE.md](./ARCHITECTURE.md).