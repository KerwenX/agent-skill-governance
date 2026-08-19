// ============================================================
// Cross-window Governance Event Bus — BroadcastChannel
// Falls back to in-memory dispatch when unavailable (tests).
// ============================================================
import type { GovernanceEvent } from "../domain/types";

const CHANNEL_NAME = "skill-governance-demo-v4";

type Handler = (event: GovernanceEvent) => void;

class EventBus {
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<Handler>();
  private windowId: string;

  constructor() {
    this.windowId = `win-${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (e: MessageEvent<GovernanceEvent>) => {
        this.handlers.forEach(h => h(e.data));
      };
    }
  }

  get id() { return this.windowId; }

  publish(event: GovernanceEvent) {
    // Local dispatch (same window)
    this.handlers.forEach(h => h(event));
    // Cross-window
    this.channel?.postMessage(event);
  }

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  close() {
    this.channel?.close();
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();

let counter = 0;
export function nextId(prefix = "id"): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}
