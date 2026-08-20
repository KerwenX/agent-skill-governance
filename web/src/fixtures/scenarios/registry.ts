// ============================================================
// Scenario registry — data lives in the local JSON database
// (web/data/db.json, loaded via src/data/db.ts); only the
// evidence-generation logic stays in TypeScript per scenario.
// ============================================================
import { getScenarioData } from "../../data/db";
import type { ScenarioConfig, ScenarioEvidenceProfile, ScenarioPublishProfile, ScenarioSeed, ScenarioTask } from "./types";
import { e2e01Evidence } from "./e2e-01-filing";
import { e2e02Evidence } from "./e2e-02-claim";
import { e2e03Evidence } from "./e2e-03-finance";

export const SCENARIO_IDS = ["e2e-01", "e2e-02", "e2e-03"] as const;
export const DEFAULT_SCENARIO_ID: string = "e2e-01";

type EvidenceFn = (task: ScenarioTask, userId: string) => ScenarioEvidenceProfile;
const EVIDENCE: Record<string, EvidenceFn> = {
  "e2e-01": e2e01Evidence,
  "e2e-02": e2e02Evidence,
  "e2e-03": e2e03Evidence,
};

function buildScenario(id: string): ScenarioConfig {
  const d = getScenarioData(id);
  return {
    id: d.id,
    index: d.index,
    title: d.title,
    shortTitle: d.shortTitle,
    industry: d.industry,
    summary: d.summary,
    initialVersion: d.initialVersion,
    skills: d.skills,
    users: d.users,
    agents: d.agents,
    globalContracts: d.globalContracts,
    localContracts: d.localContracts,
    platformStats: d.platformStats,
    tasks: d.tasks as ScenarioTask[],
    publishes: d.publishes as ScenarioPublishProfile[],
    seed: d.seed as ScenarioSeed | undefined,
    evidence: EVIDENCE[id] ?? ((_t, _u) => { throw new Error(`evidence fn missing for ${id}`); }),
  };
}

export const SCENARIOS: ScenarioConfig[] = SCENARIO_IDS.map(buildScenario);

export function getScenario(id?: string | null): ScenarioConfig {
  return SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0];
}

export type { ScenarioConfig } from "./types";
