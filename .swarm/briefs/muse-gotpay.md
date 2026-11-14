# Brief Maestro para Muse — Proyecto GotPay

**Nombre del producto:** **GotPay** ("Ya me pagaron / Ya cayó")  
**Orquestador del enjambre:** **GotPay Agent** (en Grok Bot)  
**Repositorio:** `https://github.com/jahdielrosalesjacobo3-byte/GotPay.git`  
**Workspace local:** `/Users/jahdielrosales/Documents/CURSOR-HACKATON`

---

## 1. Concepto y Posicionamiento

El 14 de diciembre de 2026 entran en vigor las nuevas reglas de Banxico que ponen CoDi en la pantalla inicial de los bancos a 3 pasos y con 0% comisión. **GotPay** resuelve el lado del comerciante: convierte cualquier celular, tableta o laptop en una **caja-bocina instantánea** que genera el QR exacto y anuncia en voz alta cada pago confirmado por webhook oficial de `pey`, eliminando estafas con capturas falsas y sin cobrar comisiones ni vender hardware propietario.

---

## 2. Entregables Asignados a Muse (`wave-3-brand`)

Guarda tus activos únicamente en `public/brand/`, `public/sounds/` y `.swarm/pitch/`:

1. **Identidad visual GotPay (`public/brand/`):**
   - Logotipo e isotipo limpio (onda sonora + check de pago instantáneo) en SVG.
   - Paleta de alto contraste pensada para lectura bajo luz de calle/mostrador:
     - Estado espera (`PENDING`): superficie oscura limpia con QR negro sobre blanco puro.
     - Estado confirmado (`PAID`): verde esmeralda de confirmación total.
     - Estado pago tardío (`PAID_LATE`): ámbar de advertencia clara.
2. **Identidad sonora (`public/sounds/`):**
   - Chime corto de confirmación (`gotpay-paid.wav` / WebAudio spec, 350–500 ms, alegre e inconfundible en ambiente ruidoso, 100% original/libre de derechos) que precede a la voz: *"GotPay: ya cayeron ochenta y cinco pesos"*.
   - Tono distinto de doble pulso para `PAID_LATE`.
3. **Narrativa de Pitch Presencial (mañana, 90 s) y Video Final (12 dic, <= 3 min) (`.swarm/pitch/`):**
   - Guion cronometrado de 90 segundos centrado en la demo real de `$0.01 MXN`.
   - Storyboard del video de 3 minutos para el jurado nacional en `pey.build`.

---

## 3. Reglas de Marca y Seguridad

- Prohibido incluir "pey" o "CoDi" dentro del logotipo o nombre propio de **GotPay**, ni aparentar ser producto oficial de pey o Banxico.
- No usar activos, logotipos ni referencias de empleadores.
- No leer `.env.local` ni incluir CLABEs reales o datos personales de terceros en mockups o capturas.
