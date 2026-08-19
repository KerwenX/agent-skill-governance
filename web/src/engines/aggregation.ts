// ============================================================
// Evidence Aggregation — V4.0 sections 111, 77
// ============================================================
import type { EvidenceCluster, LocalEvidence, SkillRelation } from "../domain/types";
import { clusterKey, contextSignature } from "./evidence";

export const PROMOTION_THRESHOLD = 0.75;

export function relationMatches(a: SkillRelation, b: SkillRelation): boolean {
  return a.type === b.type
      && a.sourceSkillId === b.sourceSkillId
      && (a.targetSkillId ?? "") === (b.targetSkillId ?? "");
}

export function versionCompatibility(a: Record<string,string>, b: Record<string,string>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (keys.size === 0) return 1;
  let match = 0;
  keys.forEach(k => { if (majorMinor(a[k]) === majorMinor(b[k])) match++; });
  return match / keys.size;
}
function majorMinor(v: string | undefined) {
  if (!v) return "none";
  const m = /^(\d+)\.(\d+)/.exec(v);
  return m ? `${m[1]}.${m[2]}.x` : v;
}

export function shouldCluster(existing: LocalEvidence[], candidate: LocalEvidence): boolean {
  if (existing.length === 0) return true;
  const first = existing[0];
  if (!relationMatches(first.skillRelation, candidate.skillRelation)) return false;
  if (first.violationType !== candidate.violationType) return false;
  if (contextSignature(first.context) !== contextSignature(candidate.context)) return false;
  if (versionCompatibility(first.skillVersions, candidate.skillVersions) < 0.6) return false;
  return true;
}

function ratio(n: number, d: number) { return d === 0 ? 0 : n / d; }

export function scoreCluster(items: LocalEvidence[]): Omit<EvidenceCluster, "id" | "evidenceIds" | "skillRelation" | "contextSignature" | "state" | "createdAt"> {
  const users = new Set(items.map(i => i.userId));
  const independentUserCount = users.size;
  const totalEvidenceCount = items.length;

  const resolutionAgreement = (() => {
    const resolvers = items.map(i => i.localResolution?.type ?? "NONE");
    const counts: Record<string, number> = {};
    resolvers.forEach(r => { counts[r] = (counts[r] ?? 0) + 1; });
    const top = Math.max(...Object.values(counts));
    return ratio(top, resolvers.length);
  })();

  const evidenceQuality = items.reduce((s, i) => s + i.qualityScore, 0) / items.length;

  // Normalized 0..1 scores — demo-tuned so 3 users cross threshold.
  const frequencyScore   = Math.min(1, totalEvidenceCount / 12);
  const coverageScore    = Math.min(1, independentUserCount / 3);

  const promotionScore = +(
      frequencyScore        * 0.25
    + coverageScore         * 0.25
    + resolutionAgreement   * 0.30
    + evidenceQuality       * 0.20
  ).toFixed(3);

  return {
    independentUserCount, totalEvidenceCount,
    frequencyScore: +frequencyScore.toFixed(2),
    coverageScore: +coverageScore.toFixed(2),
    resolutionAgreement: +resolutionAgreement.toFixed(2),
    evidenceQuality: +evidenceQuality.toFixed(2),
    promotionScore,
    versionCompatibility: items.length > 1
      ? versionCompatibility(items[0].skillVersions, items[items.length-1].skillVersions)
      : 1,
  };
}

export function computeClusterState(score: number, count: number): EvidenceCluster["state"] {
  if (score >= PROMOTION_THRESHOLD && count >= 2) return "PROMOTION_READY";
  if (count >= 1) return "EVALUATING";
  return "CLUSTERED";
}

export function clusterKeyFor(ev: LocalEvidence): string {
  return clusterKey(ev.skillRelation, ev.violationType, contextSignature(ev.context), ev.skillVersions);
}
