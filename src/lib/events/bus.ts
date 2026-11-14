import type { GotPayRealtimeEvent } from "@/types/gotpay";

export type SseSubscriber = (event: GotPayRealtimeEvent) => void;

const subscribers = new Set<SseSubscriber>();

export function subscribeRealtime(handler: SseSubscriber): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

export function publishRealtime(event: GotPayRealtimeEvent): void {
  const frozen = Object.freeze(
    structuredClone(event),
  ) as GotPayRealtimeEvent;
  for (const handler of subscribers) {
    handler(frozen);
  }
}

export function realtimeContainsFullClabe(event: GotPayRealtimeEvent): boolean {
  const json = JSON.stringify(event);
  return /\b\d{18}\b/.test(json);
}