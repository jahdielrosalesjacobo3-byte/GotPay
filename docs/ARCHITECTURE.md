# Arquitectura — GotPay

Documentación técnica de alto nivel para el repositorio [GotPay](https://github.com/jahdielrosalesjacobo3-byte/GotPay). Describe lo que está implementado hoy: Next.js en Vercel, store `file` o Supabase, integración con la API de pey y confirmación en vivo en la caja.

## Vista de componentes

```mermaid
flowchart TB
  subgraph Cliente["Cliente / navegador"]
    UI_Caja["UI Caja /"]
    UI_Pay["Página pública /pay/id"]
    UI_Jurado["Modo Jurado /jurado"]
    WA["Enlace wa.me"]
  end

  subgraph Vercel["Next.js 15 en Vercel iad1"]
    API_Charges["API /api/charges"]
    API_Events["SSE /api/events"]
    API_Webhook["POST /api/webhooks/pey"]
    API_Health["GET /api/health"]
    Lib_Pey["lib/pey"]
    Lib_DB["lib/db store"]
    Lib_Events["lib/events bus"]
  end

  subgraph Store["Persistencia GOTPAY_STORE"]
    FileStore["file .data/gotpay.json"]
    PG["Postgres schema gotpay"]
  end

  subgraph Externo["Servicios externos"]
    PeyAPI["API pey POST /codi/qr etc"]
    PeyWH["Webhooks pey"]
    Banco["App bancaria CoDi"]
  end

  UI_Caja --> API_Charges
  UI_Caja --> API_Events
  UI_Pay --> API_Charges
  UI_Caja --> WA
  WA --> UI_Pay
  UI_Pay --> Banco

  API_Charges --> Lib_Pey
  Lib_Pey --> PeyAPI
  API_Charges --> Lib_DB
  API_Webhook --> Lib_DB
  API_Events --> Lib_Events
  Lib_Events --> Lib_DB
  Lib_DB --> FileStore
  Lib_DB --> PG

  PeyWH --> API_Webhook
  Banco -. pago .-> PeyWH

  classDef navy fill:#112645,color:#ffffff,stroke:#27354B
  classDef slate fill:#27354B,color:#ffffff,stroke:#112645
  classDef blue fill:#026EFB,color:#ffffff,stroke:#112645
  classDef teal fill:#02BEC8,color:#112645,stroke:#27354B

  class Vercel navy
  class Store slate
  class PeyAPI,PeyWH blue
  class Banco teal
```

## Secuencia: cobro QR en mostrador

```mermaid
sequenceDiagram
  autonumber
  participant Cajero as Cajero UI
  participant API as Next.js API
  participant Pey as API pey
  participant DB as Store gotpay
  participant SSE as /api/events
  participant PeyWH as Webhook pey

  Cajero->>API: POST /api/charges channel CODI_QR
  API->>Pey: POST /codi/qr
  Pey-->>API: codiQrId qrData
  API->>DB: guardar cobro PENDING + qrData
  API-->>Cajero: 201 charge + QR
  Cajero->>SSE: EventSource GET /api/events

  Note over Cajero: Cliente escanea QR en app bancaria

  PeyWH->>API: POST /api/webhooks/pey codi.qr.payment_received
  API->>API: verificar Standard Webhooks
  API->>DB: idempotencia + actualizar PAID clabeLast4 bankCode
  API->>SSE: evento charge.paid bus o poll Supabase
  SSE-->>Cajero: SSE charge.paid
  Cajero->>Cajero: pantalla Ya cayó fondo menta texto navy
```

## Secuencia: WhatsApp y página pública

```mermaid
sequenceDiagram
  autonumber
  participant Cajero as Cajero UI
  participant WA as wa.me
  participant Cliente as Cliente móvil
  participant Pay as /pay/id
  participant API as Next.js API
  participant Banco as App bancaria
  participant WH as Webhook pey

  Cajero->>API: POST /api/charges CODI_QR o push según flujo
  API-->>Cajero: charge id
  Cajero->>WA: abrir chat con texto + URL /pay/id
  WA->>Cliente: mensaje con enlace
  Cliente->>Pay: GET página pública
  Pay->>API: GET /api/charges/id
  API-->>Pay: qrData estado
  Cliente->>Cliente: guardar imagen QR en galería
  Cliente->>Banco: pagar desde galería CoDi
  Banco-->>WH: liquidación vía red CoDi
  WH->>API: payment_received firmado
  API->>API: mismo pipeline webhook + store
  Cajero->>API: SSE o poll GET /api/charges/id
  API-->>Cajero: status PAID
```

## Tiempo real: SSE y respaldo

| Modo store | Comportamiento |
|------------|----------------|
| `file` | Bus en memoria del mismo proceso; suscriptores a `/api/events` reciben `charge.*` y `heartbeat`. |
| `supabase` | Sin bus compartido entre instancias serverless: el stream hace **poll** periódico a Postgres por `updated_at` y emite eventos; el cliente también puede consultar `GET /api/charges/[id]`. |

Eventos tipados (`GotPayRealtimeEvent`): `charge.created`, `charge.paid`, `charge.paid_late`, `charge.expired`, `heartbeat`.

## Modelo de datos (`gotpay`)

Migración de referencia: `supabase/migrations/20261114154000_gotpay_store_init.sql`. El contrato TypeScript es `GotPayCharge` en `src/types/gotpay.ts`.

### Entidad `gotpay.charges`

```mermaid
erDiagram
  gotpay_charges {
    text id PK
    text num_ref UK
    text codi_qr_id UK
    numeric amount
    text concept
    text channel
    text status
    text qr_data
    text payer_phone_masked
    text transaction_id
    int bank_code
    text clabe_last4
    text tracking_key
    bigint expires_at
    bigint created_at
    bigint paid_at
    timestamptz updated_at
  }

  gotpay_processed_webhooks {
    text webhook_id PK
    text transaction_id
    timestamptz processed_at
  }

  gotpay_charges ||--o{ gotpay_processed_webhooks : "transaction_id lógico"
```

| Campo (SQL) | Campo (TS) | Notas |
|-------------|------------|--------|
| `id` | `id` | ULID del cobro en GotPay |
| `num_ref` | `numRef` | Referencia numérica para pey |
| `codi_qr_id` | `codiQrId` | ID del QR en pey |
| `amount` | `amount` | MXN, positivo |
| `concept` | `concept` | Concepto de cobro |
| `channel` | `channel` | `CODI_QR`, `CODI_PUSH`, `PAYMENT_LINK` |
| `status` | `status` | `CREATED`, `PENDING`, `PAID`, `EXPIRED`, `PAID_LATE`, `CANCELLED` |
| `qr_data` | `qrData` | Payload para renderizar QR |
| `payer_phone_masked` | `payerPhoneMasked` | Solo máscara, nunca 10 dígitos en claro en respuestas API |
| `transaction_id` | `transactionId` | Id de transacción CoDi cuando aplica |
| `bank_code` | `bankCode` | Código de banco del pagador |
| `clabe_last4` | `clabeLast4` | **Solo últimos 4 dígitos** de CLABE |
| `tracking_key` | `trackingKey` | Clave de rastreo cuando existe |
| `expires_at` | `expiresAt` | Unix ms |
| `created_at` | `createdAt` | Unix ms |
| `paid_at` | `paidAt` | Unix ms opcional |

### Entidad `gotpay.processed_webhooks`

Registra `webhook_id` (cabecera Standard Webhooks) y `transaction_id` para **idempotencia**: un mismo pago no debe procesarse dos veces aunque pey reintente el webhook.

### Rol `gotpay_server`

Rol Postgres de mínimo privilegio: `SELECT/INSERT/UPDATE` en `charges`, `SELECT/INSERT` en `processed_webhooks`, `search_path` fijado a `gotpay`. La aplicación en Vercel se conecta con `SUPABASE_DB_URL` (solo servidor, nunca expuesto al cliente).

## Capas en el repositorio

| Ruta | Responsabilidad |
|------|-------------------|
| `src/app/api/**` | Rutas HTTP y webhook |
| `src/app/page.tsx`, `src/app/pay/**`, `src/app/jurado/**` | UI de caja, página pública y Modo Jurado |
| `src/lib/pey/**` | Cliente HTTP pey y verificación de webhooks |
| `src/lib/db/**` | Store file/Postgres, lifecycle de cobros |
| `src/lib/events/**` | Bus SSE local |
| `src/types/gotpay.ts` | Contratos compartidos |

## Referencias cruzadas

- [Seguridad](./SECURITY.md)  
- [API HTTP](./API.md)