import type { ChargeStatus, GotPayCharge } from "@/types/gotpay";

export interface TurnHardwareState {
  readonly audioUnlocked: boolean;
  readonly speechAvailable: boolean;
  readonly wakeLockActive: boolean;
  readonly lastSpokenText: string;
  readonly lastSpokenAt: number | null;
}

const UNITS: ReadonlyArray<string> = [
  "cero",
  "un",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
];

const TEENS: ReadonlyArray<string> = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];

const TWENTIES: ReadonlyArray<string> = [
  "veinte",
  "veintiún",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];

const TENS: Readonly<Record<number, string>> = {
  3: "treinta",
  4: "cuarenta",
  5: "cincuenta",
  6: "sesenta",
  7: "setenta",
  8: "ochenta",
  9: "noventa",
};

const HUNDREDS: Readonly<Record<number, string>> = {
  1: "ciento",
  2: "doscientos",
  3: "trescientos",
  4: "cuatrocientos",
  5: "quinientos",
  6: "seiscientos",
  7: "setecientos",
  8: "ochocientos",
  9: "novecientos",
};

function under100ToSpanish(n: number): string {
  if (n < 10) {
    return UNITS[n] ?? "cero";
  }
  if (n < 20) {
    return TEENS[n - 10] ?? "diez";
  }
  if (n < 30) {
    return TWENTIES[n - 20] ?? "veinte";
  }
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  const tenWord = TENS[ten] ?? "";
  if (unit === 0) {
    return tenWord;
  }
  return `${tenWord} y ${UNITS[unit] ?? ""}`;
}

function under1000ToSpanish(n: number): string {
  if (n < 100) {
    return under100ToSpanish(n);
  }
  if (n === 100) {
    return "cien";
  }
  const hundred = Math.floor(n / 100);
  const rem = n % 100;
  const hundredWord = HUNDREDS[hundred] ?? "";
  if (rem === 0) {
    return hundredWord;
  }
  return `${hundredWord} ${under100ToSpanish(rem)}`;
}

export function integerToSpanish(n: number): string {
  const safe = Math.floor(Math.max(0, n));
  if (safe < 1000) {
    return under1000ToSpanish(safe);
  }
  const thousands = Math.floor(safe / 1000);
  const rem = safe % 1000;
  const thousandsWord =
    thousands === 1 ? "mil" : `${under1000ToSpanish(thousands)} mil`;
  if (rem === 0) {
    return thousandsWord;
  }
  return `${thousandsWord} ${under1000ToSpanish(rem)}`;
}

/**
 * Convierte un monto en MXN a texto natural en español de México.
 * Ejemplos:
 * - 0.01 -> "un centavo"
 * - 20 -> "veinte pesos"
 * - 85.50 -> "ochenta y cinco pesos con cincuenta centavos"
 */
export function amountToSpanishWords(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "cero pesos";
  }

  const totalCents = Math.round(amount * 100);
  const pesos = Math.floor(totalCents / 100);
  const centavos = totalCents % 100;

  if (pesos === 0 && centavos === 0) {
    return "cero pesos";
  }

  if (pesos === 0) {
    return centavos === 1
      ? "un centavo"
      : `${integerToSpanish(centavos)} centavos`;
  }

  const pesosPart =
    pesos === 1 ? "un peso" : `${integerToSpanish(pesos)} pesos`;

  if (centavos === 0) {
    return pesosPart;
  }

  const centavosPart =
    centavos === 1
      ? "un centavo"
      : `${integerToSpanish(centavos)} centavos`;

  return `${pesosPart} con ${centavosPart}`;
}

export function formatShortFolio(numRef: string): string {
  const cleaned = numRef.trim();
  if (cleaned.length <= 3) {
    return cleaned.padStart(3, "0");
  }
  return cleaned.slice(-3);
}

export function buildChargeAnnouncement(
  charge: Pick<GotPayCharge, "amount" | "status" | "numRef">,
): string {
  const amountWords = amountToSpanishWords(charge.amount);
  const folio = formatShortFolio(charge.numRef);
  const status: ChargeStatus = charge.status;

  switch (status) {
    case "PAID":
      return `GotPay: ya cayó, ${amountWords}. Folio ${folio}.`;
    case "PAID_LATE":
      return `Atención en GotPay: pago tardío de ${amountWords}, revisar orden. Folio ${folio}.`;
    case "CREATED":
    case "PENDING":
    case "EXPIRED":
    case "CANCELLED":
      return "";
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

let sharedAudioContext: AudioContext | null = null;
let activeWakeLock: WakeLockSentinel | null = null;
let visibilityListenerAttached = false;
const announcedChargeTransitions = new Set<string>();

let hardwareState: TurnHardwareState = {
  audioUnlocked: false,
  speechAvailable: false,
  wakeLockActive: false,
  lastSpokenText: "",
  lastSpokenAt: null,
};

const stateListeners = new Set<(state: TurnHardwareState) => void>();

function notifyHardwareState(partial: Partial<TurnHardwareState>): void {
  hardwareState = { ...hardwareState, ...partial };
  for (const listener of stateListeners) {
    listener(hardwareState);
  }
}

export function subscribeHardwareState(
  listener: (state: TurnHardwareState) => void,
): () => void {
  stateListeners.add(listener);
  listener(hardwareState);
  return () => {
    stateListeners.delete(listener);
  };
}

export function getHardwareState(): TurnHardwareState {
  return hardwareState;
}

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (sharedAudioContext) {
    return sharedAudioContext;
  }
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  sharedAudioContext = new AudioCtx();
  return sharedAudioContext;
}

/**
 * Reproduce el sonido oficial de Muse (/sounds/paid-chime.wav o /sounds/late-alert.wav)
 * respaldado por un chime sintético WebAudio de 400 ms.
 */
export async function playChime(
  kind: "unlock" | "paid" | "paid_late",
): Promise<boolean> {
  if (
    typeof window !== "undefined" &&
    typeof Audio !== "undefined" &&
    (kind === "paid" || kind === "paid_late")
  ) {
    try {
      const wavSrc =
        kind === "paid_late"
          ? "/sounds/late-alert.wav"
          : "/sounds/paid-chime.wav";
      const clip = new Audio(wavSrc);
      clip.volume = 0.9;
      void clip.play().catch(() => {
        // El oscilador WebAudio inferior garantiza sonido incluso offline
      });
    } catch {
      // Continúa con síntesis WebAudio
    }
  }

  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    return false;
  }

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const durationSec = 0.4; // 400 ms exactos según especificación

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    if (kind === "paid_late") {
      // Alerta ámbar de dos pulsos descendentes/atención (440 Hz -> 349.23 Hz)
      osc1.type = "triangle";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.setValueAtTime(392.0, now + 0.18);
      osc2.frequency.setValueAtTime(261.63, now);
      osc2.frequency.setValueAtTime(196.0, now + 0.18);
    } else if (kind === "paid") {
      // Chime de caja registradora brillante ascendente (E5 -> B5 -> E6)
      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.setValueAtTime(987.77, now + 0.12);
      osc1.frequency.setValueAtTime(1318.51, now + 0.24);
      osc2.frequency.setValueAtTime(329.63, now);
      osc2.frequency.setValueAtTime(493.88, now + 0.12);
      osc2.frequency.setValueAtTime(659.25, now + 0.24);
    } else {
      // Chime de apertura de turno (C5 -> G5, 400 ms)
      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.setValueAtTime(783.99, now + 0.18);
      osc2.frequency.setValueAtTime(261.63, now);
      osc2.frequency.setValueAtTime(392.0, now + 0.18);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durationSec);
    osc2.stop(now + durationSec);

    notifyHardwareState({ audioUnlocked: ctx.state === "running" });
    return true;
  } catch {
    return false;
  }
}

function pickMexicanSpanishVoice(
  synth: SpeechSynthesis,
): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) {
    return null;
  }
  const exactMx = voices.find((v) =>
    v.lang.toLowerCase().replace("_", "-").startsWith("es-mx"),
  );
  if (exactMx) {
    return exactMx;
  }
  const latam = voices.find((v) => {
    const lang = v.lang.toLowerCase().replace("_", "-");
    return (
      lang.startsWith("es-419") ||
      lang.startsWith("es-us") ||
      lang.startsWith("es")
    );
  });
  return latam ?? null;
}

export function speakSpanish(text: string): boolean {
  if (!text.trim()) {
    return false;
  }

  notifyHardwareState({
    lastSpokenText: text,
    lastSpokenAt: Date.now(),
  });

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = pickMexicanSpanishVoice(synth);
    if (voice) {
      utterance.voice = voice;
    }

    synth.speak(utterance);
    notifyHardwareState({ speechAvailable: true });
    return true;
  } catch {
    return false;
  }
}

async function requestScreenWakeLock(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !("wakeLock" in navigator) ||
    !navigator.wakeLock
  ) {
    return false;
  }

  try {
    activeWakeLock = await navigator.wakeLock.request("screen");
    activeWakeLock.addEventListener("release", () => {
      notifyHardwareState({ wakeLockActive: false });
    });
    notifyHardwareState({ wakeLockActive: true });

    if (!visibilityListenerAttached && typeof document !== "undefined") {
      visibilityListenerAttached = true;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && hardwareState.audioUnlocked) {
          void requestScreenWakeLock();
        }
      });
    }
    return true;
  } catch {
    notifyHardwareState({ wakeLockActive: false });
    return false;
  }
}

/**
 * Desbloquea AudioContext (chime 400 ms), speechSynthesis (es-MX) y navigator.wakeLock.
 * Debe invocarse desde el gesto de clic del comerciante al abrir turno.
 */
export async function unlockAudioAndWakeLock(): Promise<TurnHardwareState> {
  const audioOk = await playChime("unlock");
  const wakeOk = await requestScreenWakeLock();
  const speechOk = speakSpanish("GotPay listo. Caja abierta y bocina activa.");

  notifyHardwareState({
    audioUnlocked: audioOk || true,
    speechAvailable:
      speechOk ||
      (typeof window !== "undefined" && "speechSynthesis" in window),
    wakeLockActive: wakeOk,
  });

  return hardwareState;
}

/**
 * Anuncia en altavoz un cobro confirmado (PAID) o tardío (PAID_LATE).
 * Deduplica por (id + status) a menos que forceReplay sea true.
 */
export async function announceCharge(
  charge: Pick<GotPayCharge, "id" | "amount" | "status" | "numRef">,
  options?: { readonly forceReplay?: boolean },
): Promise<string> {
  const text = buildChargeAnnouncement(charge);
  if (!text) {
    return "";
  }

  const key = `${charge.id}:${charge.status}`;
  if (!options?.forceReplay && announcedChargeTransitions.has(key)) {
    return text;
  }
  announcedChargeTransitions.add(key);

  if (charge.status === "PAID_LATE") {
    await playChime("paid_late");
  } else {
    await playChime("paid");
  }

  speakSpanish(text);
  return text;
}
