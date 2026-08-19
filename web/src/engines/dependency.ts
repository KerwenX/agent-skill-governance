// ============================================================
// Dependency Engine — V4.0 sections 114–115, 87–90
// ============================================================
import type {
  GlobalChangeSet, GovernanceContract, GovernanceDependency, SkillRelation,
} from "../domain/types";

export interface AffectedResult {
  contract: GovernanceContract;
  reasons: ("ParentContract" | "SkillVersion" | "Relationship" | "ContextSchema")[];
}

export function findAffectedContracts(
  change: GlobalChangeSet,
  localContracts: GovernanceContract[],
): AffectedResult[] {
  return localContracts
    .filter(c => c.domain === "LOCAL" && c.state !== "RETIRED")
    .map(c => ({ contract: c, reasons: isAffected(c, change) }))
    .filter(r => r.reasons.length > 0);
}

export function isAffected(
  contract: GovernanceContract,
  delta: GlobalChangeSet,
): ("ParentContract" | "SkillVersion" | "Relationship" | "ContextSchema")[] {
  const dep: GovernanceDependency | undefined = contract.dependencies;
  if (!dep) return [];
  const reasons: ("ParentContract" | "SkillVersion" | "Relationship" | "ContextSchema")[] = [];

  // 1) Parent contract changed
  if (delta.changedContracts.includes(dep.parentContractId)) {
    reasons.push("ParentContract");
  }

  // 2) Skill version changed for any dependency skill
  for (const [sid, ver] of Object.entries(dep.skillVersions)) {
    const changed = delta.changedSkills.find(s => {
      const [id, newVer] = s.split("@");
      return id === sid && newVer && newVer !== ver;
    });
    if (changed) reasons.push("SkillVersion");
  }

  // 3) Relationship changed
  for (const rel of dep.relationships) {
    if (delta.changedRelationships.some(r => sameRelation(r, rel))) {
      reasons.push("Relationship");
    }
  }

  // 4) Context schema changed
  for (const schema of dep.contextSchemas) {
    if (delta.changedContextSchemas.includes(schema)) reasons.push("ContextSchema");
  }

  return dedupe(reasons);
}

function sameRelation(a: SkillRelation, b: SkillRelation): boolean {
  return a.type === b.type
      && a.sourceSkillId === b.sourceSkillId
      && (a.targetSkillId ?? "") === (b.targetSkillId ?? "");
}
function dedupe<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

/**
 * Build a GlobalChangeSet from a newly published global contract.
 */
export function buildChangeSet(
  fromVer: string,
  toVer: string,
  newContract: GovernanceContract,
  affected: AffectedResult[],
  changedSkills: string[] = [],
): GlobalChangeSet {
  return {
    id: `DELTA-${toVer.replace("v","")}`,
    fromVersion: fromVer,
    toVersion: toVer,
    changedContracts: [newContract.id, ...(newContract.id !== "GC-1014" ? [] : [])],
    changedSkills,
    changedRelationships: newContract.relations,
    changedContextSchemas: newContract.scope.taskTypes ?? [],
    affectedContractIds: affected.map(a => a.contract.id),
    createdAt: Date.now(),
  };
}
