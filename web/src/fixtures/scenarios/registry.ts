import type { ScenarioConfig } from "./types";
import { e2e01 } from "./e2e-01-filing";
import { e2e02 } from "./e2e-02-claim";
import { e2e03 } from "./e2e-03-finance";

export const SCENARIOS: ScenarioConfig[] = [e2e01, e2e02, e2e03];
export const DEFAULT_SCENARIO_ID = e2e01.id;

export function getScenario(id?: string | null): ScenarioConfig {
  return SCENARIOS.find(s => s.id === id) ?? e2e01;
}

export type { ScenarioConfig } from "./types";
