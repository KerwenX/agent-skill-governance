// ============================================================
// Scenario seed helpers — build historical evidence / clusters /
// candidates / change-sets so both surfaces look live on entry.
// ============================================================
import type {
  EvidenceCluster, GlobalChangeSet, GlobalGovernanceCandidate,
  GovernanceResolution, LocalEvidence, SkillRelation,
} from "../../domain/types";

const DAY = 86_400_000;
const ago = (days: number, hours = 0) => Date.now() - days * DAY - hours * 3600_000;

export interface SeedEvidenceInput {
  id: string;
  userId: string;
  agentId: string;
  violationType: string;
  relation: SkillRelation;
  resolution?: GovernanceResolution;
  taskType: string;
  sourceRequirement?: string;
  parentVersion: string;
  skillVersions?: Record<string, string>;
  quality?: number;
  ageDays?: number;
  state?: LocalEvidence["state"];
}

export function seedEvidence(i: SeedEvidenceInput): LocalEvidence {
  return {
    id: i.id,
    userId: i.userId,
    agentId: i.agentId,
    skillRelation: i.relation,
    violationType: i.violationType,
    context: {
      taskType: i.taskType,
      sourceRequirement: i.sourceRequirement ?? "any",
      agentId: i.agentId,
      attributes: {},
    },
    runtimeExecutionId: `rt-hist-${i.id}`,
    runtimeEvidence: [
      { kind: "RESULT", label: "Required source", value: i.sourceRequirement ?? "any", expected: "official", match: "LOW" },
      { kind: "FEEDBACK", label: "User correction submitted", value: true, match: "HIGH" },
    ],
    localResolution: i.resolution,
    parentGlobalVersion: i.parentVersion,
    skillVersions: i.skillVersions ?? { "skill-web-search": "1.2.0" },
    state: i.state ?? "CLUSTERED",
    qualityScore: i.quality ?? 0.85,
    createdAt: ago(i.ageDays ?? 30),
  };
}

export function seedCluster(o: {
  id: string;
  evidenceIds: string[];
  relation: SkillRelation;
  contextSignature: string;
  independentUserCount: number;
  totalEvidenceCount: number;
  promotionScore: number;
  state: EvidenceCluster["state"];
  ageDays?: number;
  candidateId?: string;
}): EvidenceCluster {
  return {
    id: o.id,
    evidenceIds: o.evidenceIds,
    skillRelation: o.relation,
    contextSignature: o.contextSignature,
    independentUserCount: o.independentUserCount,
    totalEvidenceCount: o.totalEvidenceCount,
    frequencyScore: Math.min(1, o.totalEvidenceCount / 12),
    coverageScore: Math.min(1, o.independentUserCount / 3),
    resolutionAgreement: 1,
    evidenceQuality: 0.85,
    promotionScore: o.promotionScore,
    state: o.state,
    createdAt: ago(o.ageDays ?? 30),
    candidateId: o.candidateId,
    versionCompatibility: 1,
  };
}

export function seedCandidate(o: {
  id: string;
  clusterId: string;
  relation: SkillRelation;
  title: string;
  state: GlobalGovernanceCandidate["state"];
  ageDays?: number;
  publishedContractId?: string;
  rationale?: string[];
}): GlobalGovernanceCandidate {
  return {
    id: o.id,
    clusterId: o.clusterId,
    proposedPredicate: [{ field: "taskType", operator: "EQUALS", value: "general" }],
    proposedRelation: o.relation,
    proposedType: "DEFAULT",
    state: o.state,
    rationale: o.rationale ?? [o.title],
    createdAt: ago(o.ageDays ?? 30),
    publishedContractId: o.publishedContractId,
  };
}

export function seedChangeSet(o: {
  id: string;
  fromVersion: string;
  toVersion: string;
  contractId: string;
  title: string;
  summary?: string;
  relation: SkillRelation;
  affectedContractIds: string[];
  revalidation?: { retired: string[]; refined: string[]; conflicted: string[] };
  changedSkills?: string[];
  ageDays?: number;
}): GlobalChangeSet {
  return {
    id: o.id,
    fromVersion: o.fromVersion,
    toVersion: o.toVersion,
    changedContracts: [o.contractId],
    changedSkills: o.changedSkills ?? [],
    changedRelationships: [o.relation],
    changedContextSchemas: [],
    affectedContractIds: o.affectedContractIds,
    revalidation: o.revalidation,
    outcomeOverrides: undefined,
    createdAt: ago(o.ageDays ?? 30),
  };
}

export function seedNotification(o: {
  kind: "info" | "success" | "warn" | "danger";
  title: string;
  body?: string;
  read?: boolean;
  ageDays?: number;
}) {
  return {
    kind: o.kind,
    title: o.title,
    body: o.body,
    read: o.read ?? true,
    createdAt: ago(o.ageDays ?? 7),
  };
}
