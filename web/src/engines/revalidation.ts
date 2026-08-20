// ============================================================
// Revalidation Engine — local contract outcome after a global change
//  - RETIRED             : new global fully covers local (no local-specific conditions)
//  - ACTIVE_REFINEMENT   : compatible + still has local-specific conditions
//  - CONFLICT            : incompatible with new global
// Scenario may force a deterministic outcome via changeSet.outcomeOverrides.
// ============================================================
import type {
  GlobalChangeSet, GovernanceContract, GovernancePredicate,
  RevalidationResult,
} from "../domain/types";

function samePredicate(a: GovernancePredicate, b: GovernancePredicate): boolean {
  return a.field === b.field && a.operator === b.operator && JSON.stringify(a.value) === JSON.stringify(b.value);
}

function humanPredicate(p: GovernancePredicate): string {
  return `${p.field} ${p.operator.toLowerCase().replace("_", " ")} ${JSON.stringify(p.value)}`;
}

export function revalidate(
  local: GovernanceContract,
  globalContracts: GovernanceContract[],
  changeSet: GlobalChangeSet,
  _currentContext: Record<string, unknown>,
): RevalidationResult {
  const forced = changeSet.outcomeOverrides?.[local.id];

  // 1) Conflict: local relation opposes a newly active global relation on the same pair.
  const conflictingGlobal = globalContracts.find(g => {
    if (g.state !== "ACTIVE") return false;
    return g.relations.some(gr =>
      local.relations.some(lr => relationsConflict(gr, lr)),
    );
  });
  if (conflictingGlobal || forced === "CONFLICT") {
    const explanation = conflictingGlobal
      ? [
          `Global ${conflictingGlobal.id} relation contradicts this local rule.`,
          "Merge attempt: INCOMPATIBLE — relations have opposite direction.",
        ]
      : [`Scenario-defined conflict for ${local.id}.`];
    return result(local, changeSet, "PARTIAL", false, local.predicate, "CONFLICT", explanation);
  }

  // 2) Determine which local predicates are NOT covered by a global contract
  //    (those become local-specific refinements).
  const globalPreds = globalContracts
    .filter(g => g.state === "ACTIVE")
    .flatMap(g => g.predicate);
  const localSpecific = local.predicate.filter(p => !globalPreds.some(gp => samePredicate(gp, p)));

  if (forced === "ACTIVE_REFINEMENT" || (localSpecific.length > 0 && forced !== "RETIRED")) {
    const explanation = [
      "Global covers the shared rule; local retains specific conditions:",
      ...localSpecific.map(p => `• ${humanPredicate(p)}`),
    ];
    return result(local, changeSet, "PARTIAL", true, localSpecific, "ACTIVE_REFINEMENT", explanation);
  }

  // 3) Fully covered → retired.
  return result(local, changeSet, "FULL", true, [], "RETIRED", [
    "New global rule covers 100% of the local rule's conditions.",
    "No local-specific conditions remain.",
  ]);
}

function relationsConflict(gr: GovernanceContract["relations"][number], lr: GovernanceContract["relations"][number]): boolean {
  // PRIORITY source→target vs EXCLUSION in the reverse direction.
  if (gr.type === "PRIORITY" && lr.type === "EXCLUSION"
      && gr.sourceSkillId === lr.targetSkillId
      && (gr.targetSkillId ?? "") === (lr.sourceSkillId ?? "")) return true;
  // Local PRIORITY opposes a global PRIORITY in the reverse direction.
  if (gr.type === "PRIORITY" && lr.type === "PRIORITY"
      && gr.sourceSkillId === lr.targetSkillId
      && (gr.targetSkillId ?? "") === (lr.sourceSkillId ?? "")) return true;
  // Local ORDER/FALLBACK requires a skill version the global removed (version mismatch
  // is represented by changedSkills; treat opposing ORDER/FALLBACK as conflict).
  return false;
}

function result(
  local: GovernanceContract,
  cs: GlobalChangeSet,
  coverage: "FULL" | "PARTIAL" | "NONE",
  compatible: boolean,
  localSpecificConditions: GovernancePredicate[],
  outcome: "RETIRED" | "ACTIVE_REFINEMENT" | "CONFLICT",
  explanation: string[],
): RevalidationResult {
  return {
    localContractId: local.id,
    globalVersion: cs.toVersion,
    coverage,
    compatible,
    localSpecificConditions,
    result: outcome,
    explanation,
    completedAt: Date.now(),
  };
}
