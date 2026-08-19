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

export function contractFromCandidate(cand: GlobalGovernanceCandidate, cluster: EvidenceCluster): GovernanceContract {
  const title = cand.proposedRelation.type === "PRIORITY"
    ? `Official filing: ${skillName(cand.proposedRelation.sourceSkillId)} > ${skillName(cand.proposedRelation.targetSkillId)}`
    : `${cand.proposedRelation.type} relation`;
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
    parentVersion: "v18",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function skillName(id?: string) {
  const map: Record<string,string> = {
    "skill-web-search": "WebSearch",
    "skill-ir-search": "IRSearch",
    "skill-pdf-extraction": "PDFExtraction",
    "skill-ocr": "OCR",
    "skill-internal-finance": "InternalFinancialDB",
    "skill-stock-query": "StockQuery",
    "skill-cache-market": "CachedQuote",
  };
  return id ? (map[id] ?? id) : "";
}

export function buildLocalContractFromEvidence(ev: LocalEvidence): GovernanceContract {
  const res: GovernanceResolution = ev.localResolution ?? {
    type: "SKILL_PRIORITY", description: "Local rule", rationale: [],
  };
  const predicate: GovernancePredicate[] = [
    { field: "taskType", operator: "EQUALS", value: ev.context.taskType ?? "*" },
  ];
  if (ev.context.sourceRequirement) {
    predicate.push({ field: "sourceRequirement", operator: "EQUALS", value: ev.context.sourceRequirement });
  }
  // User B-specific: carry internal_resource into local-specific condition
  if (ev.userId === "user-b" && ev.context.taskType === "official_filing") {
    predicate.push({ field: "internal_resource", operator: "EQUALS", value: true });
  }
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
    overridePermission: true,
    dependencies: {
      parentContractId: "GC-1014",
      skillVersions: { ...ev.skillVersions },
      relationships: [ev.skillRelation],
      contextSchemas: [ev.context.taskType ?? "*"],
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
): SkillCandidate[] {
  // 1) Enforce invariants (permissions, hard exclusions)
  for (const inv of globalInvariants) {
    if (!matchAll(inv.predicate, ctx)) continue;
    for (const rel of inv.relations) {
      if (rel.type === "PERMISSION") {
        // zero-out the skill if permission missing
        const c = candidates.find(cc => cc.skillId === rel.sourceSkillId);
        if (c && !hasPermission(ctx, rel.sourceSkillId)) c.finalScore = 0;
      }
      if (rel.type === "EXCLUSION") {
        const a = candidates.find(cc => cc.skillId === rel.sourceSkillId);
        const b = candidates.find(cc => cc.skillId === rel.targetSkillId);
        if (a && b) {
          if (a.plannerScore >= b.plannerScore) b.finalScore = 0;
          else a.finalScore = 0;
        }
      }
    }
  }

  // 2) Resolve defaults vs local refinements by specificity
  const scored = candidates.map(c => {
    let bonus = 0;
    let reasons: string[] = [];
    for (const d of globalDefaults) {
      if (!matchAll(d.predicate, ctx)) continue;
      for (const rel of d.relations) {
        if (rel.type === "PRIORITY" && rel.sourceSkillId === c.skillId) {
          bonus += 0.22; reasons.push(`Global ${d.id}: +0.22`);
        }
        if (rel.type === "PRIORITY" && rel.targetSkillId === c.skillId) {
          bonus -= 0.20; reasons.push(`Global ${d.id}: -0.20 (deprioritized)`);
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
        if (rel.type === "EXCLUSION" && rel.targetSkillId === c.skillId) {
          bonus -= 0.6; reasons.push(`Local ${l.id}: excluded`);
        }
      }
    }
    return { ...c, governanceBonus: +(bonus).toFixed(2), reason: reasons, finalScore: clamp(c.plannerScore + bonus) };
  });

  return scored;
}

function hasPermission(ctx: Record<string, unknown>, skillId: string): boolean {
  if (skillId === "skill-internal-finance") {
    return Array.isArray(ctx.permission) && (ctx.permission as string[]).includes("finance:read");
  }
  return true;
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
export function humanRelation(r: SkillRelation): string {
  const s = skillName(r.sourceSkillId);
  const t = skillName(r.targetSkillId);
  switch (r.type) {
    case "PRIORITY": return `${s} > ${t}`;
    case "ORDER":    return `${s} → ${t}`;
    case "EXCLUSION":return `${s} ⊥ ${t}`;
    case "FALLBACK": return `${s} ↘ ${t}`;
    case "ISOLATION":return `${s} ◫ ${t}`;
    case "PERMISSION": return `${s} 🔒 requires permission`;
  }
}
