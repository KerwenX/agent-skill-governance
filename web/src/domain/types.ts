// ============================================================
// Domain types — V4.0 spec sections 15–26
// ============================================================

export type SkillStatus = "ACTIVE" | "DEPRECATED" | "DISABLED";

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  capabilities: string[];
  status: SkillStatus;
  provider: string;
  /** Permissions a session must hold (any-of) for this skill to be callable. */
  requiredPermissions?: string[];
}

export type GovernancePredicateOperator =
  | "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN"
  | "EXISTS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN";

export interface GovernancePredicate {
  field: string;
  operator: GovernancePredicateOperator;
  value: string | number | boolean | string[];
}

export type SkillRelationType =
  | "PRIORITY" | "ORDER" | "EXCLUSION"
  | "FALLBACK" | "ISOLATION" | "PERMISSION";

export interface SkillRelation {
  type: SkillRelationType;
  sourceSkillId: string;
  targetSkillId?: string;
  predicate?: GovernancePredicate;
  /** Priority direction when type=PRIORITY: source > target(s) */
  direction?: "BEFORE" | "AFTER" | "OVER";
}

export interface RuntimeContext {
  taskType?: string;
  sourceRequirement?: string;
  entityType?: string;
  permission?: string[];
  resources?: string[];
  environment?: string[];
  sessionId?: string;
  agentId?: string;
  attributes: Record<string, string | number | boolean>;
}

export interface SkillCandidate {
  skillId: string;
  plannerScore: number;
  governanceBonus: number;
  finalScore: number;
  reason: string[];
}

export type RuntimeStatus =
  | "PENDING" | "RUNNING" | "SUCCEEDED" | "ANOMALY_DETECTED"
  | "CORRECTED" | "FAILED";

export type RuntimeStepType =
  | "TASK_RECEIVED"
  | "CONTEXT_EXTRACTED"
  | "SKILL_MATCHED"
  | "GOVERNANCE_RESOLVED"
  | "SKILL_SELECTED"
  | "SKILL_EXECUTED"
  | "RESULT_EVALUATED"
  | "USER_CORRECTION";

export interface RuntimeStep {
  id: string;
  type: RuntimeStepType;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface RuntimeEvidenceItem {
  kind: "RESULT" | "TRACE" | "METRIC" | "FEEDBACK" | "CORRECTION";
  label: string;
  value: string | number | boolean;
  expected?: string | number | boolean;
  match?: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

export interface RuntimeExecution {
  id: string;
  scenarioId: string;
  userId: string;
  agentId: string;
  input: string;
  context: RuntimeContext;
  candidateSkills: SkillCandidate[];
  selectedSkillId?: string;
  correctionSkillId?: string;
  steps: RuntimeStep[];
  status: RuntimeStatus;
  startedAt: number;
  completedAt?: number;
  anomalyReason?: string;
  resultSnippets?: { title: string; source: string; official: boolean }[];
  /** Carries the scenario evidence profile from runtime to evidence builder. */
  evidenceProfile?: import("../engines/evidence").EvidenceProfile;
}

export type LocalEvidenceState =
  | "DETECTED" | "STRUCTURED" | "LOCAL"
  | "CLUSTERED" | "PROMOTION_READY" | "LOCAL_ONLY";

export type GovernanceResolutionType =
  | "SKILL_PRIORITY"
  | "SKILL_EXCLUSION"
  | "SKILL_FALLBACK"
  | "PERMISSION_BLOCK"
  | "REORDER";

export interface GovernanceResolution {
  type: GovernanceResolutionType;
  description: string;
  alternateSkillId?: string;
  rationale: string[];
}

export interface LocalEvidence {
  id: string;
  userId: string;
  agentId: string;
  skillRelation: SkillRelation;
  violationType: string;
  context: RuntimeContext;
  runtimeExecutionId: string;
  runtimeEvidence: RuntimeEvidenceItem[];
  localResolution?: GovernanceResolution;
  localContractId?: string;
  parentGlobalVersion: string;
  skillVersions: Record<string, string>;
  state: LocalEvidenceState;
  qualityScore: number;
  /** User-specific predicates that should carry into the Local Contract (scenario-driven). */
  localPredicates?: GovernancePredicate[];
  createdAt: number;
}

export interface GovernanceDependency {
  parentContractId: string;
  skillVersions: Record<string, string>;
  relationships: SkillRelation[];
  contextSchemas: string[];
}

export type ContractDomain = "GLOBAL" | "LOCAL";
export type ContractType = "INVARIANT" | "DEFAULT" | "REFINEMENT";
export type ContractState =
  | "ACTIVE" | "STALE" | "REVALIDATING"
  | "RETIRED" | "ACTIVE_REFINEMENT" | "CONFLICT";

export interface GovernanceScope {
  userIds?: string[];
  agentIds?: string[];
  taskTypes?: string[];
  contextTags?: string[];
}

export interface GovernanceContract {
  id: string;
  domain: ContractDomain;
  ownerId?: string;
  contractType: ContractType;
  state: ContractState;
  predicate: GovernancePredicate[];
  relations: SkillRelation[];
  scope: GovernanceScope;
  overridePermission: boolean;
  dependencies?: GovernanceDependency;
  originEvidenceIds: string[];
  parentVersion?: string;
  title: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
  revalidation?: RevalidationResult;
}

export type ClusterState =
  | "CLUSTERED" | "EVALUATING" | "PROMOTION_READY"
  | "LOCAL_ONLY" | "CANDIDATE_CREATED";

export interface EvidenceCluster {
  id: string;
  evidenceIds: string[];
  skillRelation: SkillRelation;
  contextSignature: string;
  independentUserCount: number;
  totalEvidenceCount: number;
  frequencyScore: number;
  coverageScore: number;
  resolutionAgreement: number;
  evidenceQuality: number;
  promotionScore: number;
  state: ClusterState;
  createdAt: number;
  candidateId?: string;
  versionCompatibility?: number;
}

export type CandidateState =
  | "GENERATED" | "UNDER_REVIEW"
  | "APPROVED" | "REJECTED" | "KEPT_LOCAL"
  | "NEEDS_MORE_EVIDENCE" | "PUBLISHED";

export interface GlobalGovernanceCandidate {
  id: string;
  clusterId: string;
  proposedPredicate: GovernancePredicate[];
  proposedRelation: SkillRelation;
  proposedType: "DEFAULT" | "INVARIANT";
  state: CandidateState;
  rationale: string[];
  keepLocalReason?: string;
  createdAt: number;
  publishedContractId?: string;
}

export interface GlobalChangeSet {
  id: string;
  fromVersion: string;
  toVersion: string;
  changedContracts: string[];
  changedSkills: string[];
  changedRelationships: SkillRelation[];
  changedContextSchemas: string[];
  affectedContractIds: string[];
  revalidation?: {
    retired: string[];
    refined: string[];
    conflicted: string[];
  };
  /** Scenario-preset per-contract outcome, used as deterministic override. */
  outcomeOverrides?: Record<string, RevalidationOutcome>;
  createdAt: number;
}

export type RevalidationCoverage = "FULL" | "PARTIAL" | "NONE";
export type RevalidationOutcome =
  | "RETIRED" | "ACTIVE_REFINEMENT" | "CONFLICT";

export interface RevalidationResult {
  localContractId: string;
  globalVersion: string;
  coverage: RevalidationCoverage;
  compatible: boolean;
  localSpecificConditions: GovernancePredicate[];
  result: RevalidationOutcome;
  explanation: string[];
  completedAt: number;
}

// ============================================================
// Event protocol — sections 27–31
// ============================================================

export type GovernanceEventType =
  | "WINDOW_JOINED"
  | "STATE_SNAPSHOT_REQUESTED"
  | "STATE_SNAPSHOT_RECEIVED"
  | "USER_TASK_STARTED"
  | "SKILL_ROUTING_STARTED"
  | "SKILL_EXECUTED"
  | "RUNTIME_ANOMALY_DETECTED"
  | "USER_CORRECTION_SUBMITTED"
  | "LOCAL_EVIDENCE_CREATED"
  | "LOCAL_CONTRACT_CREATED"
  | "EVIDENCE_CLUSTER_CREATED"
  | "EVIDENCE_CLUSTER_UPDATED"
  | "PROMOTION_THRESHOLD_REACHED"
  | "GLOBAL_CANDIDATE_CREATED"
  | "GLOBAL_CANDIDATE_APPROVED"
  | "GLOBAL_CANDIDATE_REJECTED"
  | "GLOBAL_CONTRACT_PUBLISHED"
  | "GLOBAL_CHANGESET_CREATED"
  | "DEPENDENCY_SCAN_STARTED"
  | "LOCAL_CONTRACT_AFFECTED"
  | "LOCAL_CONTRACT_MARKED_STALE"
  | "REVALIDATION_STARTED"
  | "LOCAL_CONTRACT_RETIRED"
  | "LOCAL_CONTRACT_REFINED"
  | "LOCAL_CONTRACT_CONFLICTED"
  | "SCENARIO_CHANGED"
  | "SKILL_UPGRADED"
  | "PERMISSIONS_CHANGED"
  | "DEMO_RESET"
  | "DEMO_COMMAND";

export interface GovernanceEvent<T = unknown> {
  eventId: string;
  eventType: GovernanceEventType;
  timestamp: number;
  sourceDomain: "USER" | "DEVELOPER" | "SYSTEM";
  sourceId: string;
  targetDomain: "USER" | "DEVELOPER" | "ALL";
  targetIds?: string[];
  correlationId: string;
  globalVersion: string;
  payload: T;
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  role: string;
  organization: string;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  model: string;
  skillIds: string[];
}

export interface NotificationItem {
  id: string;
  kind: "info" | "success" | "warn" | "danger";
  title: string;
  body?: string;
  createdAt: number;
  read?: boolean;
  cta?: { label: string; to: string };
}

export type AnimationTaskId = string;
