# API HTTP — GotPay

Rutas implementadas en `src/app/api/**` y página pública relacionada. Todas las respuestas de cobro omiten CLABE completa y teléfono en claro.

**Leyenda de audiencia**

| Etiqueta | Significado |
|----------|-------------|
| **Caja** | Usada por el dashboard del comercio (`/`) |
| **Pública** | Accesible sin autenticación de comercio (solo datos ya públicos del cobro) |
| **Webhook** | Llamada servidor-a-servidor desde pey |
| **UI** | Página Next.js, no JSON |

Base URL local: `http://localhost:3000`. Producción: `https://gotpay.vercel.app`.

---

## `GET /api/health`

| | |
|---|---|
| **Audiencia** | Operaciones / monitoreo |
| **Propósito** | Comprobar servicio, modo de store y configuración no sensible |

**Respuesta 200** (ejemplo):

```json
{
  "ok": true,
  "service": "gotpay",
  "store": "supabase",
  "storeReachable": true,
  "peyApiKeyConfigured": true,
  "peyWebhookSecretConfigured": true,
  "merchantClabeLast4": "1234",
  "timestamp": "2026-11-15T00:00:00.000Z"
}
```

---

## `GET /api/charges`

| | |
|---|---|
| **Audiencia** | Caja |
| **Propósito** | Listar cobros recientes y resumen del día |

**Query**

| Parámetro | Tipo | Default | Máximo |
|-----------|------|---------|--------|
| `limit` | entero | 50 | 200 |

**Respuesta 200**

```json
{
  "charges": [ { "...": "GotPayCharge sin datos sensibles" } ],
  "summary": {
    "paidCount": 0,
    "paidTotalMxn": 0,
    "pendingCount": 0,
    "lateCount": 0
  }
}
```

`Cache-Control: no-store`.

---

## `POST /api/charges`

| | |
|---|---|
| **Audiencia** | Caja |
| **Propósito** | Crear cobro CoDi (`CODI_QR` o `CODI_PUSH`) |

**Cuerpo JSON**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `amount` | number | sí | MXN, &gt; 0, máx. 1_000_000 |
| `concept` | string | sí | 1–140 caracteres |
| `channel` | `"CODI_QR"` \| `"CODI_PUSH"` | sí | Canal CoDi |
| `phone` | string | si `CODI_PUSH` | 10–15 dígitos |
| `expirationSeconds` | integer | no | 60–3600, default interno 600 |

**Respuestas**

| Código | Caso |
|--------|------|
| `201` | `{ "charge": GotPayCharge }` |
| `400` | JSON inválido, validación Zod o falta `phone` en push |
| `502` | Error comunicación con pey (`code`, `error`) |
| `500` | Error interno |

---

## `GET /api/charges/[id]`

| | |
|---|---|
| **Audiencia** | Caja y **pública** (`/pay/[id]`) |
| **Propósito** | Detalle de un cobro por ULID |

| Código | Cuerpo |
|--------|--------|
| `200` | `{ "charge": GotPayCharge }` |
| `404` | `{ "error": "Cobro no encontrado" }` |

`Cache-Control: no-store`.

---

## `POST /api/charges/[id]/cancel`

| | |
|---|---|
| **Audiencia** | Caja |
| **Propósito** | Cancelar un cobro pendiente |

| Código | Cuerpo |
|--------|--------|
| `200` | `{ "charge": GotPayCharge }` |
| `404` | Cobro no encontrado |
| `500` | Error interno |

---

## `POST /api/charges/[id]/reconcile`

| | |
|---|---|
| **Audiencia** | Caja |
| **Propósito** | Consultar en pey el estado del QR y alinear el cobro si ya fue pagado y el webhook se retrasó |

| Código | Cuerpo |
|--------|--------|
| `200` | `{ "charge": GotPayCharge, "reconciled": true \| false }` |
| `404` | Cobro no encontrado |
| `502` | Error pey |
| `500` | Error interno |

Solo aplica de forma útil a cobros `CODI_QR` con `codiQrId`.

---

## `GET /api/events`

| | |
|---|---|
| **Audiencia** | Caja |
| **Propósito** | **Server-Sent Events** para actualizaciones en vivo |

**Cabeceras de respuesta:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`.

**Eventos** (líneas `data: {json}`):

| `type` | Descripción |
|--------|-------------|
| `charge.created` | Cobro nuevo o pendiente |
| `charge.paid` | Pago confirmado |
| `charge.paid_late` | Pago después de expiración |
| `charge.expired` | Cobro expirado |
| `heartbeat` | `{ "ts": number }` cada ~15 s |

Incluye `retry: 1000`. El stream se cierra antes del límite de la función; el cliente debe reconectar (comportamiento estándar de `EventSource`).

---

## `POST /api/webhooks/pey`

| | |
|---|---|
| **Audiencia** | **Webhook** (pey) |
| **Propósito** | Recibir notificaciones de pago (p. ej. `codi.qr.payment_received`) |

**Cabeceras:** `webhook-id`, `webhook-timestamp`, `webhook-signature`.

**Cuerpo:** JSON crudo según contrato pey (no documentar aquí CLABE completa del pagador).

| Código | Caso |
|--------|------|
| `200` | `{ "ok": true }` procesado o deduplicado |
| `401` | Firma inválida |
| `400` | Falta `webhook-id` o error al procesar |

---

## `GET /pay/[id]` (UI)

| | |
|---|---|
| **Audiencia** | **Pública** — cliente final |
| **Propósito** | Mostrar monto, concepto y QR para pagar o guardar imagen |

No es endpoint JSON; consume `GET /api/charges/[id]` desde el cliente.

---

## Tipo `GotPayCharge` (respuesta pública)

Campos habituales: `id`, `numRef`, `amount`, `concept`, `channel`, `status`, `qrData`, `expiresAt`, `createdAt`, `paidAt`, `codiQrId`, `transactionId`, `bankCode`, `clabeLast4`, `payerPhoneMasked`, `trackingKey`.

Estados: ver `describeChargeStatus` en `src/types/gotpay.ts`.

---

Ver también: [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md).