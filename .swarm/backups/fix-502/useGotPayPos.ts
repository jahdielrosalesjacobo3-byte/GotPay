"use client";

import {
  announceCharge,
  getHardwareState,
  subscribeHardwareState,
  unlockAudioAndWakeLock,
  type TurnHardwareState,
} from "@/lib/audio/announcer";
import {
  buildMockCharge,
  computeSummaryFromCharges,
  createInitialMockCharges,
  sanitizeClabeLast4,
  type ShiftSummary,
} from "@/components/mockEngine";
import type {
  CreateChargeRequest,
  GotPayCharge,
  GotPayRealtimeEvent,
} from "@/types/gotpay";
import { useCallback, useEffect, useRef, useState } from "react";

export type EngineMode = "api" | "mock";
export type SseConnectionState = "connected" | "reconnecting" | "mock";

function sanitizeChargeForUi(charge: GotPayCharge): GotPayCharge {
  return {
    ...charge,
    clabeLast4: sanitizeClabeLast4(charge.clabeLast4),
  };
}

function upsertChargeList(
  prev: ReadonlyArray<GotPayCharge>,
  incoming: GotPayCharge,
): GotPayCharge[] {
  const clean = sanitizeChargeForUi(incoming);
  const filtered = prev.filter((item) => item.id !== clean.id);
  return [clean, ...filtered].sort((a, b) => b.createdAt - a.createdAt);
}

export function useGotPayPos(initialMode: EngineMode = "api") {
  const [engineMode, setEngineMode] = useState<EngineMode>(initialMode);
  const [turnOpen, setTurnOpen] = useState<boolean>(false);
  const [hardware, setHardware] = useState<TurnHardwareState>(() =>
    getHardwareState(),
  );

  const [charges, setCharges] = useState<GotPayCharge[]>(() =>
    createInitialMockCharges(),
  );
  const [activeCharge, setActiveCharge] = useState<GotPayCharge | null>(null);
  const [overlayCharge, setOverlayCharge] = useState<GotPayCharge | null>(null);

  const [sseState, setSseState] = useState<SseConnectionState>("reconnecting");
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | null>(null);
  const [pollTickCount, setPollTickCount] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeHardwareState((state) => {
      setHardware(state);
    });
  }, []);

  const handleConfirmedTransition = useCallback((charge: GotPayCharge) => {
    const clean = sanitizeChargeForUi(charge);
    setCharges((prev) => upsertChargeList(prev, clean));
    setActiveCharge((prev) => (prev && prev.id === clean.id ? null : prev));
    setOverlayCharge(clean);
    void announceCharge(clean);
  }, []);

  const handleRealtimeEvent = useCallback(
    (event: GotPayRealtimeEvent) => {
      switch (event.type) {
        case "charge.created": {
          const clean = sanitizeChargeForUi(event.charge);
          setCharges((prev) => upsertChargeList(prev, clean));
          break;
        }
        case "charge.paid": {
          handleConfirmedTransition(event.charge);
          break;
        }
        case "charge.paid_late": {
          handleConfirmedTransition(event.charge);
          break;
        }
        case "charge.expired": {
          setCharges((prev) =>
            prev.map((c) =>
              c.id === event.chargeId ? { ...c, status: "EXPIRED" } : c,
            ),
          );
          setActiveCharge((prev) =>
            prev && prev.id === event.chargeId
              ? { ...prev, status: "EXPIRED" }
              : prev,
          );
          break;
        }
        case "heartbeat": {
          setLastHeartbeatAt(event.ts);
          setSseState("connected");
          break;
        }
        default: {
          const exhaustiveCheck: never = event;
          void exhaustiveCheck;
        }
      }
    },
    [handleConfirmedTransition],
  );

  // Carga inicial desde GET /api/charges
  const fetchChargesList = useCallback(async () => {
    try {
      const res = await fetch("/api/charges", { cache: "no-store" });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as {
        charges?: GotPayCharge[];
      };
      if (Array.isArray(data.charges) && data.charges.length > 0) {
        setCharges((prev) => {
          let next = [...prev];
          for (const item of data.charges ?? []) {
            next = upsertChargeList(next, item);
          }
          return next;
        });
      }
    } catch {
      // Mantiene bitácora local si no hay red momentánea
    }
  }, []);

  useEffect(() => {
    void fetchChargesList();
  }, [fetchChargesList]);

  // Conexión SSE a GET /api/events con reconexión automática
  const connectSse = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setSseState("reconnecting");
    const es = new EventSource("/api/events");
    eventSourceRef.current = es;

    es.onopen = () => {
      setSseState("connected");
    };

    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as GotPayRealtimeEvent;
        handleRealtimeEvent(parsed);
      } catch {
        // Ignorar tramas malformadas
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setSseState("reconnecting");
      reconnectTimerRef.current = setTimeout(() => {
        connectSse();
      }, 2000);
    };
  }, [handleRealtimeEvent]);

  useEffect(() => {
    connectSse();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connectSse]);

  // Polling de respaldo cada 2 segundos mientras exista un cobro activo PENDING o CREATED
  useEffect(() => {
    if (!activeCharge) {
      return;
    }
    if (
      activeCharge.status !== "PENDING" &&
      activeCharge.status !== "CREATED"
    ) {
      return;
    }

    const activeId = activeCharge.id;
    const pollInterval = setInterval(async () => {
      setPollTickCount((n) => n + 1);

      try {
        const res = await fetch(
          `/api/charges/${encodeURIComponent(activeId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          return;
        }
        const payload = (await res.json()) as { charge?: GotPayCharge };
        const remote = payload.charge;
        if (!remote) {
          return;
        }
        if (remote.status === "PAID" || remote.status === "PAID_LATE") {
          handleConfirmedTransition(remote);
        } else if (remote.status !== activeCharge.status) {
          const clean = sanitizeChargeForUi(remote);
          setActiveCharge(clean);
          setCharges((prev) => upsertChargeList(prev, clean));
        }
      } catch {
        // Resiliente ante desconexión temporal
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [activeCharge, handleConfirmedTransition]);

  const openTurn = useCallback(async () => {
    const state = await unlockAudioAndWakeLock();
    setHardware(state);
    setTurnOpen(true);
    setStatusBanner("Turno abierto: bocina es-MX desbloqueada y pantalla activa.");
  }, []);

  const createCharge = useCallback(
    async (req: CreateChargeRequest): Promise<GotPayCharge | null> => {
      setIsSubmitting(true);
      setStatusBanner(null);

      try {
        if (engineMode === "mock") {
          const mockCharge = buildMockCharge(req);
          setCharges((prev) => upsertChargeList(prev, mockCharge));
          setActiveCharge(mockCharge);
          setPollTickCount(0);
          return mockCharge;
        }

        const res = await fetch("/api/charges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });

        if (res.ok) {
          const data = (await res.json()) as { charge: GotPayCharge };
          const clean = sanitizeChargeForUi(data.charge);
          setCharges((prev) => upsertChargeList(prev, clean));
          setActiveCharge(clean);
          setPollTickCount(0);
          return clean;
        }

        const errData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const fallback = buildMockCharge(req);
        setCharges((prev) => upsertChargeList(prev, fallback));
        setActiveCharge(fallback);
        setPollTickCount(0);
        setStatusBanner(
          `Modo respaldo local activado (${errData.error ?? `HTTP ${res.status}`}). QR listo para demostración.`,
        );
        return fallback;
      } catch {
        const fallback = buildMockCharge(req);
        setCharges((prev) => upsertChargeList(prev, fallback));
        setActiveCharge(fallback);
        setPollTickCount(0);
        setStatusBanner("Sin red: cobro generado en simulador local.");
        return fallback;
      } finally {
        setIsSubmitting(false);
      }
    },
    [engineMode],
  );

  const reconcileActiveCharge = useCallback(
    async (chargeId: string) => {
      setIsReconciling(true);
      try {
        if (engineMode === "api" && !chargeId.startsWith("01M7MOCK")) {
          const res = await fetch(
            `/api/charges/${encodeURIComponent(chargeId)}/reconcile`,
            { method: "POST" },
          );
          if (res.ok) {
            const data = (await res.json()) as {
              charge: GotPayCharge;
              reconciled: boolean;
            };
            if (
              data.charge.status === "PAID" ||
              data.charge.status === "PAID_LATE"
            ) {
              handleConfirmedTransition(data.charge);
              return;
            }
            setStatusBanner(
              "Verificado contra pey: el cobro sigue esperando autorización del cliente.",
            );
            return;
          }
        }
        setStatusBanner(
          "Cobro en espera de autorización CoDi. Puedes usar el simulador inferior para probar la voz.",
        );
      } finally {
        setIsReconciling(false);
      }
    },
    [engineMode, handleConfirmedTransition],
  );

  const cancelActiveCharge = useCallback(
    async (chargeId: string) => {
      try {
        if (engineMode === "api" && !chargeId.startsWith("01M7MOCK")) {
          const res = await fetch(
            `/api/charges/${encodeURIComponent(chargeId)}/cancel`,
            { method: "POST" },
          );
          if (res.ok) {
            const data = (await res.json()) as { charge: GotPayCharge };
            setCharges((prev) => upsertChargeList(prev, data.charge));
            setActiveCharge(null);
            return;
          }
        }
      } catch {
        // Continúa con cancelación local
      }

      setCharges((prev) =>
        prev.map((c) =>
          c.id === chargeId ? { ...c, status: "CANCELLED" } : c,
        ),
      );
      setActiveCharge(null);
    },
    [engineMode],
  );

  const simulateChargeOutcome = useCallback(
    (charge: GotPayCharge, outcome: "PAID" | "PAID_LATE") => {
      const updated: GotPayCharge = {
        ...charge,
        status: outcome,
        paidAt: Date.now(),
        bankCode: charge.bankCode ?? 40012,
        clabeLast4: sanitizeClabeLast4(charge.clabeLast4) ?? "5713",
        transactionId: charge.transactionId ?? `sim-tx-${Date.now()}`,
        trackingKey: charge.trackingKey ?? `GOTPAYSIM${charge.numRef}`,
      };
      handleConfirmedTransition(updated);
    },
    [handleConfirmedTransition],
  );

  const triggerSseReconnectTest = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setSseState("reconnecting");
    setStatusBanner(
      "Reconexión SSE iniciada + Polling de respaldo de 2s activo.",
    );
    setTimeout(() => {
      connectSse();
    }, 800);
  }, [connectSse]);

  const replayChargeVoice = useCallback((charge: GotPayCharge) => {
    void announceCharge(charge, { forceReplay: true });
  }, []);

  const summary: ShiftSummary = computeSummaryFromCharges(charges);

  return {
    engineMode,
    setEngineMode,
    turnOpen,
    openTurn,
    hardware,
    charges,
    summary,
    activeCharge,
    overlayCharge,
    dismissOverlay: () => setOverlayCharge(null),
    sseState: engineMode === "mock" ? ("mock" as const) : sseState,
    lastHeartbeatAt,
    pollTickCount,
    isSubmitting,
    isReconciling,
    statusBanner,
    setStatusBanner,
    createCharge,
    reconcileActiveCharge,
    cancelActiveCharge,
    simulateChargeOutcome,
    triggerSseReconnectTest,
    replayChargeVoice,
  };
}
