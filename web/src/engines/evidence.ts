// ============================================================
// Evidence Engine — V4.0 sections 109–111
// Runtime + correction + evaluation → structured evidence
// ============================================================
import type {
  GovernanceResolution, LocalEvidence, RuntimeContext,
  RuntimeEvidenceItem, RuntimeExecution, SkillRelation,
} from "../domain/types";

export function detectGovernanceOpportunity(rt: RuntimeExecution): {
  isOpportunity: boolean;
  violationType: string;
  relation: SkillRelation;
  resolution: GovernanceResolution;
  items: RuntimeEvidenceItem[];
} {
  const correction = rt.steps.find(s => s.type === "USER_CORRECTION");
  const selected = rt.selectedSkillId;
  const alternate = rt.correctionSkillId;
  const lowQuality = rt.anomalyReason?.includes("LOW") || rt.anomalyReason?.includes("non-official");

  const items: RuntimeEvidenceItem[] = [
    {
      kind: "RESULT",
      label: "Required source",
      value: rt.context.sourceRequirement ?? "any",
      expected: "official",
      match: rt.context.sourceRequirement === "official" ? "LOW" : "HIGH",
    },
    {
      kind: "METRIC",
      label: "Initial selected skill",
      value: selected ?? "-",
    },
    ...(alternate ? [{ kind: "CORRECTION" as const, label: "Corrected skill", value: alternate }] : []),
    {
      kind: "FEEDBACK",
      label: "User correction submitted",
      value: Boolean(correction),
      match: correction ? "HIGH" : "NONE",
    },
  ];

  // Official filing case: WebSearch chosen → non-official → corrected to IRSearch
  if (rt.context.taskType === "official_filing"
      && selected === "skill-web-search"
      && alternate === "skill-ir-search"
      && lowQuality) {
    return {
      isOpportunity: true,
      violationType: "OfficialSourceRoutingMismatch",
      relation: {
        type: "PRIORITY",
        sourceSkillId: "skill-ir-search",
        targetSkillId: "skill-web-search",
        direction: "OVER",
        predicate: { field: "taskType", operator: "EQUALS" as const, value: "official_filing" },
      },
      resolution: {
        type: "SKILL_PRIORITY",
        description: "When task is official_filing, IRSearch MUST be preferred over WebSearch.",
        alternateSkillId: "skill-ir-search",
        rationale: [
          "WebSearch returns mixed media / non-official sources",
          "IRSearch returns verified filings from investor relations sites",
          `User correction succeeded on ${new Date(rt.startedAt).toISOString().slice(0,10)}`,
        ],
      },
      items,
    };
  }

  // Scanned PDF case: OCR needed before PDF extraction
  if (rt.context.taskType === "scanned_pdf"
      && selected === "skill-pdf-extraction"
      && alternate === "skill-ocr"
      && rt.anomalyReason?.includes("SCAN")) {
    return {
      isOpportunity: true,
      violationType: "ScannedPDFMissingPreprocess",
      relation: {
        type: "ORDER",
        sourceSkillId: "skill-ocr",
        targetSkillId: "skill-pdf-extraction",
      },
      resolution: {
        type: "REORDER",
        description: "scanned_pdf requires OCR before PDF Extraction.",
        alternateSkillId: "skill-ocr",
        rationale: ["PDF Extraction 2.3 does not natively handle scanned PDFs"],
      },
      items,
    };
  }

  return { isOpportunity: false, violationType: "None", relation: undefined as never, resolution: undefined as never, items };
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

export function createEvidence(rt: RuntimeExecution, parentGlobalVersion: string, createContract: boolean): LocalEvidence {
  const det = detectGovernanceOpportunity(rt);
  const skillVersions: Record<string,string> = {};
  for (const sid of [rt.selectedSkillId, rt.correctionSkillId].filter(Boolean) as string[]) {
    // version looked up by caller; we leave a placeholder to be filled
    skillVersions[sid] = "0.0";
  }
  return {
    id: buildEvidenceId(rt.userId),
    userId: rt.userId,
    agentId: rt.agentId,
    skillRelation: det.relation,
    violationType: det.violationType,
    context: rt.context,
    runtimeExecutionId: rt.id,
    runtimeEvidence: det.items,
    localResolution: createContract ? det.resolution : undefined,
    parentGlobalVersion,
    skillVersions,
    state: "STRUCTURED",
    qualityScore: qualityScore(rt, det.items),
    createdAt: Date.now(),
  };
}
