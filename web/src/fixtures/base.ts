// Backwards-compatible re-export of the default scenario (E2E-01).
// New code should import from fixtures/scenarios/registry directly.
import { e2e01 } from "./scenarios/e2e-01-filing";

export {
  S01_SKILLS as SKILLS,
  S01_USERS as USERS,
  S01_AGENTS as AGENTS,
  S01_GLOBAL as INITIAL_GLOBAL_CONTRACTS,
  S01_LOCAL as INITIAL_LOCAL_CONTRACTS,
  e2e01,
} from "./scenarios/e2e-01-filing";
export { DEFAULT_SCENARIO_ID, SCENARIOS, getScenario } from "./scenarios/registry";
export const INITIAL_GLOBAL_VERSION = "v18";
export const NEXT_GLOBAL_VERSION = "v19";
export const PDF_GLOBAL_VERSION = "v20";
export const PLATFORM_STATS = e2e01.platformStats;
export const DEMO_PROMPTS = e2e01.tasks.map(t => ({
  id: t.id, label: t.label, taskType: t.taskType, sourceRequirement: t.sourceRequirement ?? "any",
}));
