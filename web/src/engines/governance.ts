// ============================================================
// Governance Engine — V4.0 sections 112–113
// Effective governance resolution + candidate/contract creation
// ============================================================
import type {
  EvidenceCluster, GlobalGovernanceCandidate, GovernanceContract,
  GovernancePredicate, GovernanceResolution, LocalEvidence,
  SkillCandidate, SkillRelation,
} from "../domain/types";
import { PROMOTION_THRESHOLD } from "./aggregation";

let counter = 100;
export function nextContractId(domain: "GLOBAL" | "LOCAL") {
  counter += 1;
  return domain === "GLOBAL" ? `GC-${counter}` : `LC-${counter}`;
}
export function nextCandidateId() { counter += 1; return `GGC-${counter}`; }
export function nextChangeSetId(toVer: string) {
  const n = parseInt(toVer.replace("v",""), 10);
  return `DELTA-${n}`;
}

export function candidateFromCluster(cluster: EvidenceCluster, ev: LocalEvidence): GlobalGovernanceCandidate {
  const rel = cluster.skillRelation;
  const proposedPredicate: GovernancePredicate[] = [
    { field: "taskType", operator: "EQUALS", value: ev.context.taskType ?? "*" },
  ];
  if (ev.context.sourceRequirement) {
    proposedPredicate.push({ field: "sourceRequirement", operator: "EQUALS", value: ev.context.sourceRequirement });
  }
  return {
    id: nextCandidateId(),
    clusterId: cluster.id,
    proposedPredicate,
    proposedRelation: rel,
    proposedType: "DEFAULT",
    state: "GENERATED",
    rationale: [
      `${cluster.independentUserCount} independent users observed the same relation issue`,
      `Resolution agreement ${(cluster.resolutionAgreement * 100).toFixed(0)}%`,
      `Promotion score ${cluster.promotionScore.toFixed(2)} ≥ threshold ${PROMOTION_THRESHOLD}`,
    ],
    createdAt: Date.now(),
  };
}

export function contractFromCandidate(
  cand: GlobalGovernanceCandidate,
  cluster: EvidenceCluster,
  fromVersion: string,
  skillNames?: Record<string, string>,
): GovernanceContract {
  const s = cand.proposedRelation.sourceSkillId;
  const t = cand.proposedRelation.targetSkillId;
  const sn = (id?: string) => id ? (skillNames?.[id] ?? id.replace(/^skill-/, "")) : "";
  const title = cand.proposedRelation.type === "PRIORITY"
    ? `${sn(s)} > ${sn(t)}`
    : cand.proposedRelation.type === "ORDER"
      ? `${sn(s)} → ${sn(t)}`
      : cand.proposedRelation.type === "FALLBACK"
        ? `${sn(s)} ↘ ${sn(t)}`
        : `${cand.proposedRelation.type}: ${sn(s)}`;
  return {
    id: nextContractId("GLOBAL"),
    domain: "GLOBAL",
    contractType: cand.proposedType,
    state: "ACTIVE",
    title,
    summary: `Promoted from ${cluster.id} · ${cluster.totalEvidenceCount} evidence / ${cluster.independentUserCount} users`,
    predicate: cand.proposedPredicate,
    relations: [cand.proposedRelation],
    scope: { taskTypes: [String(cand.proposedPredicate[0]?.value ?? "*")] },
    overridePermission: cand.proposedType === "INVARIANT" ? false : true,
    originEvidenceIds: cluster.evidenceIds,
    parentVersion: fromVersion,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Build a short human-readable skill label from a skill map. */
export function skillName(id: string | undefined, skills?: Record<string, { name?: string }>): string {
  if (!id) return "";
  return skills?.[id]?.name ?? id.replace(/^skill-/, "");
}

export function buildLocalContractFromEvidence(ev: LocalEvidence, parentContractId = "GC-1000"): GovernanceContract {
  const res: GovernanceResolution = ev.localResolution ?? {
    type: "SKILL_PRIORITY", description: "Local rule", rationale: [],
  };
  const predicate: GovernancePredicate[] = [
    { field: "taskType", operator: "EQUALS", value: ev.context.taskType ?? "*" },
  ];
  if (ev.context.sourceRequirement) {
    predicate.push({ field: "sourceRequirement", operator: "EQUALS", value: ev.context.sourceRequirement });
  }
  for (const p of ev.localPredicates ?? []) predicate.push(p);
  const contextSchemas = [
    ev.context.taskType ?? "*",
    ...predicate.slice(1).map(p => p.field),
  ];
  return {
    id: nextContractId("LOCAL"),
    domain: "LOCAL",
    ownerId: ev.userId,
    contractType: "REFINEMENT",
    state: "ACTIVE",
    title: `Local · ${ev.violationType} (${ev.userId})`,
    summary: res.description,
    predicate,
    relations: [ev.skillRelation],
    scope: { userIds: [ev.userId] },
    // PERMISSION/ISOLATION evidence must not relax global invariants
    overridePermission: ev.skillRelation.type !== "PERMISSION" && ev.skillRelation.type !== "ISOLATION",
    dependencies: {
      parentContractId,
      skillVersions: { ...ev.skillVersions },
      relationships: [ev.skillRelation],
      contextSchemas,
    },
    originEvidenceIds: [ev.id],
    parentVersion: ev.parentGlobalVersion,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * resolveGovernance — V4.0 §113 simplified.
 * Enforces global invariants, then resolves defaults vs local refinements by specificity.
 */
export function resolveGovernance(
  globalInvariants: GovernanceContract[],
  globalDefaults: GovernanceContract[],
  localRefinements: GovernanceContract[],
  ctx: Record<string, unknown>,
  candidates: SkillCandidate[],
  skillPermissions: Record<string, string[]> = {},
): SkillCandidate[] {
  const perms = new Set(Array.isArray(ctx.permission) ? (ctx.permission as string[]) : []);

  const blocked = (skillId: string, rel: SkillRelation): boolean => {
    if (rel.type === "PERMISSION") {
      // A relation predicate may declare required permissions (permission IN [...]).
      const required = rel.predicate?.operator === "IN"
        ? (rel.predicate.value as string[])
        : (skillPermissions[skillId] ?? []);
      return required.length > 0 && !required.some(p => perms.has(p));
    }
    return false;
  };

  // 1) Enforce invariants (permissions, hard exclusions, isolation)
  for (const inv of globalInvariants) {
    if (!matchAll(inv.predicate, ctx)) continue;
    for (const rel of inv.relations) {
      const c = candidates.find(cc => cc.skillId === rel.sourceSkillId);
      if (rel.type === "PERMISSION" && c && blocked(rel.sourceSkillId, rel)) {
        c.finalScore = 0; c.reason = [...c.reason, `Blocked by ${inv.id}: missing permission`];
      }
      if (rel.type === "EXCLUSION") {
        const b = candidates.find(cc => cc.skillId === rel.targetSkillId);
        if (b) { b.finalScore = 0; b.reason = [...b.reason, `Excluded by ${inv.id}`]; }
      }
      if (rel.type === "ISOLATION" && c) {
        c.finalScore = 0; c.reason = [...c.reason, `Isolated by ${inv.id}`];
      }
    }
  }

  // 2) Resolve defaults vs local refinements by specificity
  const scored = candidates.map(c => {
    let bonus = 0;
    const reasons: string[] = [];
    for (const d of globalDefaults) {
      if (!matchAll(d.predicate, ctx)) continue;
      for (const rel of d.relations) {
        if (rel.type === "PRIORITY" && rel.sourceSkillId === c.skillId) {
          bonus += 0.22; reasons.push(`Global ${d.id}: +0.22`);
        }
        if (rel.type === "PRIORITY" && rel.targetSkillId === c.skillId) {
          bonus -= 0.20; reasons.push(`Global ${d.id}: -0.20`);
        }
        if (rel.type === "FALLBACK" && rel.targetSkillId === c.skillId) {
          bonus -= 0.10; reasons.push(`Global ${d.id}: fallback (deprioritized)`);
        }
        if (rel.type === "ORDER" && rel.sourceSkillId === c.skillId) {
          bonus += 0.30; reasons.push(`Global ${d.id}: ordered first`);
        }
        if (rel.type === "EXCLUSION" && rel.targetSkillId === c.skillId) {
          bonus -= 0.5; reasons.push(`Global ${d.id}: excluded`);
        }
      }
    }
    for (const l of localRefinements) {
      if (!matchAll(l.predicate, ctx)) continue;
      for (const rel of l.relations) {
        if (rel.type === "PRIORITY" && rel.sourceSkillId === c.skillId) {
          bonus += 0.18; reasons.push(`Local ${l.id}: +0.18`);
        }
        if (rel.type === "PRIORITY" && rel.targetSkillId === c.skillId) {
          bonus -= 0.30; reasons.push(`Local ${l.id}: -0.30`);
        }
        if (rel.type === "ORDER" && rel.sourceSkillId === c.skillId) {
          bonus += 0.12; reasons.push(`Local ${l.id}: ordered first`);
        }
        if (rel.type === "FALLBACK" && rel.targetSkillId === c.skillId) {
          bonus -= 0.08; reasons.push(`Local ${l.id}: fallback`);
        }
        if (rel.type === "EXCLUSION" && rel.targetSkillId === c.skillId) {
          bonus -= 0.6; reasons.push(`Local ${l.id}: excluded`);
        }
      }
    }
    return { ...c, governanceBonus: +(bonus).toFixed(2), reason: [...c.reason, ...reasons], finalScore: c.finalScore > 0 ? clamp(c.plannerScore + bonus) : 0 };
  });

  return scored;
}

function matchAll(preds: GovernancePredicate[], ctx: Record<string, unknown>): boolean {
  return preds.every(p => {
    const v = ctx[p.field];
    switch (p.operator) {
      case "EQUALS": return v === p.value;
      case "NOT_EQUALS": return v !== p.value;
      case "IN": return Array.isArray(p.value) && p.value.includes(v as string);
      case "NOT_IN": return Array.isArray(p.value) && !p.value.includes(v as string);
      case "EXISTS": return v !== undefined && v !== null && v !== false;
      default: return true;
    }
  });
}
function clamp(n: number) { return Math.max(0, Math.min(1, +n.toFixed(2))); }

/** Predicate helpers for building UX-friendly rule previews. */
export function humanPredicate(p: GovernancePredicate): string {
  return `${p.field} ${p.operator.toLowerCase().replace("_"," ")} ${JSON.stringify(p.value)}`;
}
export function humanRelation(r: SkillRelation, skills?: Record<string, { name?: string }>): string {
  const s = skillName(r.sourceSkillId, skills);
  const t = skillName(r.targetSkillId, skills);
  switch (r.type) {
    case "PRIORITY": return `${s} > ${t}`;
    case "ORDER":    return `${s} → ${t}`;
    case "EXCLUSION":return `${s} ⊥ ${t}`;
    case "FALLBACK": return `${s} ↘ ${t}`;
    case "ISOLATION":return `${s} ◫ ${t}`;
    case "PERMISSION": return `${s} 🔒 requires permission`;
  }
}
