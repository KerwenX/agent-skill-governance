// ============================================================
// Synchronous clustering — runs in the developer's reducer when
// evidence arrives, avoiding stale React-effect closures.
// ============================================================
import type { EvidenceCluster, GlobalGovernanceCandidate, GovernanceEvent, LocalEvidence } from "../domain/types";
import { clusterKeyFor, computeClusterState, PROMOTION_THRESHOLD, scoreCluster, shouldCluster } from "./aggregation";
import { candidateFromCluster } from "./governance";

export interface ClusterSyncResult {
  cluster?: EvidenceCluster;
  candidate?: GlobalGovernanceCandidate;
  promoted: boolean;
  eventType: "created" | "updated" | "promoted";
}

/**
 * Recompute clusters given all known evidence.
 * Returns the cluster that absorbed `newEvidence` (if provided) and
 * a new candidate if the threshold was crossed.
 */
export function recomputeClusters(
  allEvidence: LocalEvidence[],
  existingClusters: Record<string, EvidenceCluster>,
  newEvidence?: LocalEvidence,
): { clusters: Record<string, EvidenceCluster>; result?: ClusterSyncResult } {
  const clusters: Record<string, EvidenceCluster> = { ...existingClusters };
  let result: ClusterSyncResult | undefined;

  // Group evidence by similarity (rebuild affected clusters).
  // Strategy: keep existing cluster memberships stable; for new evidence,
  // find the first existing cluster whose members match, else create a new one.
  if (newEvidence) {
    let matched: EvidenceCluster | undefined;
    for (const c of Object.values(clusters)) {
      const members = c.evidenceIds.map(id => allEvidence.find(e => e.id === id)).filter(Boolean) as LocalEvidence[];
      if (shouldCluster(members, newEvidence)) { matched = c; break; }
    }

    if (matched) {
      const members = matched.evidenceIds
        .map(id => allEvidence.find(e => e.id === id))
        .filter(Boolean) as LocalEvidence[];
      const items = [...members, newEvidence];
      const scores = scoreCluster(items);
      const prevState = matched.state;
      const newState = computeClusterState(scores.promotionScore, items.length);
      const updated: EvidenceCluster = {
        ...matched,
        evidenceIds: items.map(i => i.id),
        ...scores,
        state: newState,
      };
      clusters[matched.id] = updated;

      const crossed = newState === "PROMOTION_READY" && prevState !== "PROMOTION_READY";
      let candidate: GlobalGovernanceCandidate | undefined;
      if (crossed) {
        candidate = candidateFromCluster(updated, newEvidence);
        updated.candidateId = candidate.id;
        updated.state = "CANDIDATE_CREATED";
      }
      result = { cluster: updated, candidate, promoted: crossed, eventType: crossed ? "promoted" : "updated" };
    } else {
      const scores = scoreCluster([newEvidence]);
      const id = `C-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const state = computeClusterState(scores.promotionScore, 1);
      const created: EvidenceCluster = {
        id,
        evidenceIds: [newEvidence.id],
        skillRelation: newEvidence.skillRelation,
        contextSignature: clusterKeyFor(newEvidence),
        ...scores,
        state,
        createdAt: Date.now(),
      };
      clusters[id] = created;
      result = { cluster: created, promoted: false, eventType: "created" };
    }
  }

  return { clusters, result };
}
