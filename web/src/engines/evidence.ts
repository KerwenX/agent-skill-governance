// ============================================================
// Evidence Engine — runtime + correction → structured evidence
// Scenario-driven: the workspace supplies an evidence profile.
// ============================================================
import type {
  GovernancePredicate, GovernanceResolution, LocalEvidence,
  RuntimeContext, RuntimeEvidenceItem, RuntimeExecution, SkillRelation,
} from "../domain/types";

export interface EvidenceProfile {
  violationType: string;
  relation: SkillRelation;
  resolution: GovernanceResolution;
  items: RuntimeEvidenceItem[];
  localPredicates?: GovernancePredicate[];
}

/** Stable context signature for cluster matching. */
export function contextSignature(ctx: RuntimeContext): string {
  return [
    ctx.taskType ?? "*",
    ctx.sourceRequirement ?? "*",
    ctx.entityType ?? "*",
    [...(ctx.resources ?? [])].sort().join(","),
  ].join("|");
}

/** Cluster key — V4.0 §111. */
export function clusterKey(rel: SkillRelation, violation: string, sig: string, versions: Record<string,string>): string {
  return [
    `${rel.type}:${rel.sourceSkillId}->${rel.targetSkillId ?? "-"}`,
    violation,
    sig,
    Object.entries(versions).sort().map(([k,v]) => `${k}=${majorMinor(v)}`).join(","),
  ].join("||");
}

function majorMinor(v: string) {
  const m = /^(\d+)\.(\d+)/.exec(v);
  return m ? `${m[1]}.${m[2]}.x` : v;
}

export function qualityScore(rt: RuntimeExecution, items: RuntimeEvidenceItem[]): number {
  let q = 0.5;
  if (rt.correctionSkillId) q += 0.2;
  if (items.some(i => i.match === "HIGH")) q += 0.15;
  if (items.some(i => i.kind === "METRIC")) q += 0.1;
  if (rt.resultSnippets && rt.resultSnippets.length > 0) q += 0.05;
  return Math.min(1, +q.toFixed(2));
}

export function buildEvidenceId(userId: string) {
  return `LE-${userId.toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

export function createEvidence(
  rt: RuntimeExecution,
  parentGlobalVersion: string,
  createContract: boolean,
  profile: EvidenceProfile,
): LocalEvidence {
  const skillVersions: Record<string,string> = {};
  for (const sid of [rt.selectedSkillId, rt.correctionSkillId].filter(Boolean) as string[]) {
    skillVersions[sid] = "0.0"; // filled by caller from skills map
  }
  return {
    id: buildEvidenceId(rt.userId),
    userId: rt.userId,
    agentId: rt.agentId,
    skillRelation: profile.relation,
    violationType: profile.violationType,
    context: rt.context,
    runtimeExecutionId: rt.id,
    runtimeEvidence: profile.items,
    localResolution: createContract ? profile.resolution : undefined,
    localPredicates: profile.localPredicates,
    parentGlobalVersion,
    skillVersions,
    state: "STRUCTURED",
    qualityScore: qualityScore(rt, profile.items),
    createdAt: Date.now(),
  };
}
