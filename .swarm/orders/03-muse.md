# ORDEN 03 — Muse · MVP-W3 (marca, sonido, pitch)

**Workpack:** `.swarm/workpacks/muse.md` · **Fuente:** `public/brand/source/` (3 logos oficiales de Jahdiel; no alterar el diseño)

## Ejecutar ya, en este orden (G3.1 primero porque Antigravity lo consume)
**G3.1 Activos de marca**
1. Marca `MVP-W3` como `in_progress`.
2. Vectoriza a `public/brand/gotpay-icon.svg`, `gotpay-lockup-horizontal.svg`, `gotpay-wordmark.svg` respetando forma y degradado.
3. PNG con fondo transparente (1x/2x) de los tres.
4. `public/brand/icons/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (zona segura 80%), `favicon.ico`, `apple-touch-icon.png` (180), a partir del ícono.
5. Versión del lockup para fondo oscuro: "Got" y tagline en blanco, "Pay" en `#0ADDA9`.
6. Publica `public/brand/tokens.json` copiando exactamente los valores de `orders/brand-tokens.json`.

**Colores exactos medidos de los logos**
- Navy "Got": `#112645` · Tagline "YA CAYÓ": `#27354B`
- Degradado del ícono: azul `#026EFB` -> teal `#02BEC8` -> menta `#0ADDA9`
- "Pay": `#0CD6A7` (en el wordmark arranca en azul y termina en menta; respeta ese degradado en el SVG)

**G3.2 Sonidos** — `public/sounds/paid-chime.wav` (<= 600 ms, brillante, audible en calle) y `late-alert.wav` (doble tono distinto). Originales, sin muestras de terceros, < 100 KB cada uno.

**G3.3 Pitch** — `.swarm/pitch/pitch-manana-90s.md`: guion cronometrado de 90 s centrado en el cobro en vivo de $0.01 MXN + checklist escénica (bocina, brillo, red de respaldo, video de 45 s) + escaleta base de <= 3 min para el 12 de diciembre.

### Compuerta G3
- [ ] SVG fieles al original (comparación visual lado a lado).
- [ ] Íconos PWA y favicon generados.
- [ ] Sonidos entregados y probados en bocina de celular.
- [ ] Guion leído en voz alta en <= 90 s.
- [ ] Cero "pey"/"CoDi" en el nombre o la marca.
- [ ] Marca `gate_passed` en `handoffLog`.
