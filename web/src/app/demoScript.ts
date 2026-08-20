// ============================================================
// Demo Scripts — one guided script per scenario.
// Launcher opens the scenario's windows and walks its steps.
// ============================================================
import type { GovernanceEvent } from "../domain/types";
import { eventBus, nextId } from "./eventBus";

export type Target = "launcher" | "developer" | "all" | string; // string = user window key e.g. "user-a"

export interface DemoStep {
  id: string;
  narration: string;
  focus: Target;
  wait?: number;
  command?: { action: string; userId?: string; prompt?: string; to?: string; task?: string; skillId?: string; version?: string; permissions?: string[] };
  target?: Target;
}

export interface DemoWindow {
  key: string;            // "developer" or "user-<id>"
  kind: "developer" | "user";
  userId?: string;
  label: string;
  sub: string;
  color: string;
  initials?: string;
  w: number;
  h: number;
}

export interface DemoScript {
  scenarioId: string;
  windows: DemoWindow[];
  steps: DemoStep[];
}

// 剧本数据存储在 web/data/db.json（本地简易数据库），运行时经 src/data/db.ts 加载
import { getScenarioData } from "../data/db";

function loadDemoScript(scenarioId: string): DemoScript {
  const script = getScenarioData(scenarioId).script;
  if (!script) throw new Error(`demo script missing for ${scenarioId}`);
  return script as unknown as DemoScript;
}

export const DEMO_SCRIPTS: Record<string, DemoScript> = Object.fromEntries(
  ["e2e-01", "e2e-02", "e2e-03"].map(id => [id, loadDemoScript(id)])
);

export function sendCommand(target: Target, command: DemoStep["command"]) {
  if (!command) return;
  // Carry the full window id ("user-a", …) — handlers compare against route userId.
  const userId = target.startsWith("user-") ? target : undefined;
  const event: GovernanceEvent = {
    eventId: nextId("evt"),
    eventType: "DEMO_COMMAND",
    timestamp: Date.now(),
    sourceDomain: target === "developer" ? "DEVELOPER" : "USER",
    sourceId: eventBus.id,
    targetDomain: target === "developer" ? "DEVELOPER" : target === "all" || target === "launcher" ? "ALL" : "USER",
    targetIds: target === "all" || target === "launcher" ? undefined : [target],
    correlationId: nextId("corr"),
    globalVersion: "v0",
    payload: userId ? { ...command, userId } : command,
  };
  eventBus.publish(event);
}

export function broadcastScenario(scenarioId: string) {
  const event: GovernanceEvent = {
    eventId: nextId("evt"), eventType: "SCENARIO_CHANGED",
    timestamp: Date.now(), sourceDomain: "SYSTEM", sourceId: eventBus.id,
    targetDomain: "ALL", correlationId: nextId("corr"),
    globalVersion: "v0", payload: { scenarioId },
  };
  eventBus.publish(event);
}

export function broadcastReset() {
  const event: GovernanceEvent = {
    eventId: nextId("evt"), eventType: "DEMO_RESET",
    timestamp: Date.now(), sourceDomain: "SYSTEM", sourceId: eventBus.id,
    targetDomain: "ALL", correlationId: nextId("corr"),
    globalVersion: "v0", payload: { reason: "demo-start" },
  };
  eventBus.publish(event);
}
