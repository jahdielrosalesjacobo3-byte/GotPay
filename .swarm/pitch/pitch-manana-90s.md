# Guion de 90 segundos — demo en vivo de GotPay

**Cuándo:** domingo 15 de noviembre de 2026, mañana (hora de Ciudad de México, UTC-6).
**Qué se cobra:** un pago real de $0.01 MXN, no una simulación.
**Ritmo objetivo:** unas 140 palabras por minuto, con una pausa de tres segundos en el cobro.
**Qué no se dice:** no nombrar el producto como «pey …» ni como «CoDi …». No sugerir respaldo oficial de pey ni de Banxico. Banxico y CoDi solo aparecen como hecho regulatorio del mercado, no como aval.

---

## Bloques cronometrados (90 s)

### 0:00 – 0:20 · El problema

Un comerciante con las manos ocupadas. El cliente dice «ya pagué» y enseña una captura. ¿Ya cayó el dinero? No hay forma de saberlo. Hoy muchos comercios siguen cobrando a ciegas. Y desde el 14 de diciembre de 2026, Banxico exige que el cobro con CoDi aparezca en la portada del ticket.

### 0:20 – 0:58 · La demo en vivo

Por eso hice GotPay: ya me pagaron, ya cayó. Voy a cobrar un centavo, de verdad, en vivo. Esto no es una simulación. Tecleo 0.01 pesos, aparece el código QR. El cliente escanea y paga con su banca. En menos de tres segundos, la pantalla se pone verde y se oye la voz: «GotPay: ya cayó un centavo». El comerciante no soltó lo que tenía en las manos. No adivinó. Escuchó que el pago ya estaba en su cuenta.

*(En este bloque: teclear el monto, mostrar el QR, esperar el pago real y dejar que se oiga la voz. Si el cobro tarda, no improvises: espera en silencio a la pantalla verde.)*

### 0:58 – 1:22 · Por qué gana

¿Por qué gana? Cero comisión. Cero aparato extra: corre en el celular que el comercio ya tiene. Los avisos llegan con webhooks firmados, y la idempotencia evita que un mismo pago suene dos veces. Es una caja que le habla al comerciante, no una app más para el cliente.

### 1:22 – 1:30 · Cierre

GotPay. Para que la pregunta «¿ya me pagaron?» ya no se responda con una captura, sino con una voz: ya cayó.

---

## Checklist escénica (antes de salir a escena)

- [ ] **Volumen de la caja y de la voz** ensayado a distancia de stand; que «ya cayó un centavo» se oiga con el ruido de la sala.
- [ ] **Brillo de las pantallas** al máximo (laptop de la caja y celular del pago). El QR y la pantalla verde tienen que leerse de frente y de lado.
- [ ] **Red de respaldo** lista: hotspot del celular como plan B, probado el mismo día, no solo el día anterior.
- [ ] **Video de respaldo de 45 s** en el escritorio, ya descargado (no depende de YouTube ni de la red): monto, QR, pago, pantalla verde y voz. Se proyecta solo si el cobro en vivo falla.
- [ ] **Bocina desbloqueada** y no silenciada: no modo no molestar, no mute, no Volume Limit; un clip de prueba de `paid-chime.wav` 10 minutos antes.
- [ ] Banca móvil abierta, sesión viva, saldo para tres cobros de $0.01 MXN, y un segundo dispositivo por si el primero se queda sin batería.
- [ ] La PWA de la caja ya abierta en pantalla completa, con el monto en cero, lista para teclear 0.01. Sin notificaciones tapando el QR.

---

## Escaleta base · entrega del 12 de diciembre (≤ 3 minutos)

Esta escaleta es la base para la entrega de diciembre. No sustituye al guion de 90 s de mañana: lo extiende cuando haya más tiempo.

| Tiempo | Bloque | Qué ocurre |
| --- | --- | --- |
| 0:00 – 0:25 | Apertura y problema | El comerciante con las manos ocupadas, las capturas falsas, y el requisito de llevar el cobro con CoDi en la portada del ticket a partir del 14 de diciembre de 2026. |
| 0:25 – 1:25 | Demo en vivo (o video de 45 s) | Cobro real de $0.01 MXN: monto, QR, pago, pantalla verde y voz «GotPay: ya cayó un centavo». Si la red falla, se proyecta el video de respaldo y se explica que es la misma secuencia. |
| 1:25 – 2:00 | Por qué gana | 0 % de comisión, sin hardware, webhooks firmados, idempotencia. Una caja que le habla al comerciante. |
| 2:00 – 2:30 | Qué sigue | La ruta del mes: más de un cobro en el día a día, la caja lista para el piso de venta, y la meta de una demo nacional limpia, sin reclamar aval de nadie. |
| 2:30 – 3:00 | Cierre e invitación | Cerrar con «ya cayó» y abrir el stand a una prueba de un centavo o a preguntas. No comerse este margen. |

---

## Texto corrido (solo lo hablado en los 90 s)

Un comerciante con las manos ocupadas. El cliente dice «ya pagué» y enseña una captura. ¿Ya cayó el dinero? No hay forma de saberlo. Hoy muchos comercios siguen cobrando a ciegas. Y desde el 14 de diciembre de 2026, Banxico exige que el cobro con CoDi aparezca en la portada del ticket.

Por eso hice GotPay: ya me pagaron, ya cayó. Voy a cobrar un centavo, de verdad, en vivo. Esto no es una simulación. Tecleo 0.01 pesos, aparece el código QR. El cliente escanea y paga con su banca. En menos de tres segundos, la pantalla se pone verde y se oye la voz: «GotPay: ya cayó un centavo». El comerciante no soltó lo que tenía en las manos. No adivinó. Escuchó que el pago ya estaba en su cuenta.

¿Por qué gana? Cero comisión. Cero aparato extra: corre en el celular que el comercio ya tiene. Los avisos llegan con webhooks firmados, y la idempotencia evita que un mismo pago suene dos veces. Es una caja que le habla al comerciante, no una app más para el cliente.

GotPay. Para que la pregunta «¿ya me pagaron?» ya no se responda con una captura, sino con una voz: ya cayó.
---

## Conteo verificado

El texto hablado de los 90 s tiene **201 palabras** («0.01» cuenta como una sola palabra). A unas 140 palabras por minuto, con una pausa de 3 segundos en el cobro en vivo, el guion cabe en ~90 segundos.
