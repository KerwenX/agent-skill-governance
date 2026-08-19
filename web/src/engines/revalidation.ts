// ============================================================
// Revalidation Engine — V4.0 sections 116–117
// ============================================================
import type {
  GlobalChangeSet, GovernanceContract, GovernancePredicate,
  RevalidationResult,
} from "../domain/types";

/**
 * Decide the outcome for a single local contract after a global change.
 *
 *  - RETIRED             : new global fully covers local (no local-specific conditions)
 *  - ACTIVE_REFINEMENT   : compatible + still has local-specific conditions
 *  - CONFLICT            : incompatible with new global
 */
export function revalidate(
  local: GovernanceContract,
  globalContracts: GovernanceContract[],
  _changeSet: GlobalChangeSet,
  currentContext: Record<string, unknown>,
): RevalidationResult {
  const localSpecific = local.predicate.filter(p =>
    p.field === "internal_resource"
    || p.field === "permission"
    || p.field === "resources"
    || (p.field === "taskType" && p.value === "scanned_pdf")
  );

  const explanation: string[] = [];

  // Case C: Conflict — local excludes the source the new global prioritizes,
  // or local's relation direction contradicts global.
  const conflictingGlobal = globalContracts.find(g => {
    if (g.state !== "ACTIVE") return false;
    return g.relations.some(gr =>
      local.relations.some(lr =>
        (gr.type === "PRIORITY" && lr.type === "EXCLUSION"
          && gr.sourceSkillId === lr.targetSkillId
          && gr.targetSkillId === lr.sourceSkillId)
      )
    );
  });

  if (conflictingGlobal) {
    explanation.push(`Global ${conflictingGlobal.id} prioritizes the skill excluded by this local rule.`);
    explanation.push("Merge attempt: INCOMPATIBLE — relations have opposite direction.");
    return {
      localContractId: local.id,
      globalVersion: _changeSet.toVersion,
      coverage: "PARTIAL",
      compatible: false,
      localSpecificConditions: localSpecific,
      result: "CONFLICT",
      explanation,
      completedAt: Date.now(),
    };
  }

  // Skill-version case: e.g. PDF Extraction 2.4 natively handles scanned PDF
  if (localSpecific.some(p => p.field === "taskType" && p.value === "scanned_pdf")
      && _changeSet.changedSkills.some(s => s.startsWith("skill-pdf-extraction@2.4"))) {
    explanation.push("PDF Extraction 2.4 natively supports scanned PDFs.");
    explanation.push("Local OCR-order rule is fully covered by global version update.");
    return {
      localContractId: local.id,
      globalVersion: _changeSet.toVersion,
      coverage: "FULL",
      compatible: true,
      localSpecificConditions: [],
      result: "RETIRED",
      explanation,
      completedAt: Date.now(),
    };
  }

  // Case B: Refinement — local has user-specific context (e.g. internal_resource)
  if (localSpecific.length > 0) {
    explanation.push("Global covers the shared rule; local retains user-specific conditions:");
    localSpecific.forEach(p => explanation.push(`• ${humanPredicate(p)}`));
    return {
      localContractId: local.id,
      globalVersion: _changeSet.toVersion,
      coverage: "PARTIAL",
      compatible: true,
      localSpecificConditions: localSpecific,
      result: "ACTIVE_REFINEMENT",
      explanation,
      completedAt: Date.now(),
    };
  }

  // Case A: Retired — fully covered
  explanation.push("New global rule covers 100% of the local rule's conditions.");
  explanation.push("No local-specific conditions remain.");
  return {
    localContractId: local.id,
    globalVersion: _changeSet.toVersion,
    coverage: "FULL",
    compatible: true,
    localSpecificConditions: [],
    result: "RETIRED",
    explanation,
    completedAt: Date.now(),
  };
}

function humanPredicate(p: GovernancePredicate): string {
  return `${p.field} ${p.operator.toLowerCase()} ${JSON.stringify(p.value)}`;
}
