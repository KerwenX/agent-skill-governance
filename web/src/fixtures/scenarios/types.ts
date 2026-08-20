// ============================================================
// Scenario configuration — data-driven end-to-end examples
// Each scenario is a complete seed: skills, users, contracts,
// tasks and a deterministic simulation of runtime + governance.
// ============================================================
import type {
  Agent, GovernanceContract, GovernancePredicate, Skill, User,
} from "../../domain/types";

export interface ScenarioSnippet {
  title: string;
  source: string;
  official: boolean;
}

export interface ScenarioTask {
  id: string;
  label: string;
  prompt: string;
  taskType: string;
  sourceRequirement?: string;
  /** Extra context attributes merged into RuntimeContext.attributes */
  attributes?: Record<string, string | number | boolean>;
  permissions?: string[];
  /** Planner candidates before governance. */
  candidates: { skillId: string; plannerScore: number; reason: string[] }[];
  /** What the governance resolver / runtime should show. */
  expect: {
    selectedSkillId: string;
    anomaly?: boolean;
    anomalyReason?: string;
    blockPermission?: string;
    /** Once globalVersion reaches this, the anomaly is considered resolved (closure run succeeds). */
    closureVersion?: string;
    snippets: ScenarioSnippet[];
    correctionSkillId?: string;
    correctionSnippets?: ScenarioSnippet[];
  };
}

export interface ScenarioEvidenceProfile {
  violationType: string;
  relation: import("../../domain/types").SkillRelation;
  resolution: import("../../domain/types").GovernanceResolution;
  /** Predicates beyond taskType/sourceRequirement carried into the local contract (local-specific). */
  localPredicates?: GovernancePredicate[];
  items: import("../../domain/types").RuntimeEvidenceItem[];
}

export interface ScenarioPublishProfile {
  /** Contract id published in this change (e.g. "GC-1100"). */
  contractId: string;
  toVersion: string;
  contractType: "DEFAULT" | "INVARIANT";
  title: string;
  summary: string;
  predicate: GovernancePredicate[];
  relations: import("../../domain/types").SkillRelation[];
  /** Skill versions changed in this release, "skill-id@x.y". */
  changedSkills?: string[];
  /** Deterministic per-contract outcomes after revalidation. */
  outcomes: Record<string, "RETIRED" | "ACTIVE_REFINEMENT" | "CONFLICT">;
}

/**
 * Historical seed data so both surfaces look like a live system when opened
 * directly (without the demo console). Must NOT share cluster keys with the
 * scenario's runtime tasks, otherwise the guided demo's aggregation numbers shift.
 */
export interface ScenarioSeed {
  evidence: import("../../domain/types").LocalEvidence[];
  clusters: import("../../domain/types").EvidenceCluster[];
  candidates: import("../../domain/types").GlobalGovernanceCandidate[];
  changeSets: import("../../domain/types").GlobalChangeSet[];
  notifications?: {
    kind: "info" | "success" | "warn" | "danger";
    title: string;
    body?: string;
    read?: boolean;
    ageDays?: number;
  }[];
}

export interface ScenarioConfig {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  industry: string;
  summary: string;
  initialVersion: string;
  skills: Skill[];
  users: User[];
  agents: Agent[];
  globalContracts: GovernanceContract[];
  localContracts: GovernanceContract[];
  platformStats: {
    skills: number; globalContracts: number; localContractsObserved: number;
    users: number; agents: number; evidenceTotal: number;
  };
  tasks: ScenarioTask[];
  /** Map taskId -> evidence profile (same task per user, profiles differ by user via key). */
  evidence(task: ScenarioTask, userId: string): ScenarioEvidenceProfile;
  publishes: ScenarioPublishProfile[];
  /** Historical evidence/clusters/changes so direct entry shows a live system. */
  seed?: ScenarioSeed;
}
