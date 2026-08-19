// ============================================================
// Developer-side automatic clustering + promotion.
// Subscribes to store state; when new evidence appears, clusters
// and (when threshold crossed) emits candidate.
// ============================================================
import React from "react";
import { useGovernance } from "../store/governance";
import { clusterKeyFor, computeClusterState, PROMOTION_THRESHOLD, scoreCluster, shouldCluster } from "../engines/aggregation";
import { candidateFromCluster } from "../engines/governance";
import { eventBus, nextId } from "../app/eventBus";
import type { GovernanceEvent } from "../domain/types";

export function useDevClustering() {
  const role = useGovernance(s => s.role);
  const evidence = useGovernance(s => s.evidence);
  const clusters = useGovernance(s => s.clusters);
  const candidates = useGovernance(s => s.candidates);
  const upsertCluster = useGovernance(s => s.upsertCluster);
  const upsertCandidate = useGovernance(s => s.upsertCandidate);
  const updateEvidence = useGovernance(s => s.updateEvidence);
  const emit = useGovernance(s => s.emit);
  const globalVersion = useGovernance(s => s.globalVersion);

  const processedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (role !== "developer") return;
    const all = Object.values(evidence);
    for (const ev of all) {
      if (processedRef.current.has(ev.id)) continue;
      processedRef.current.add(ev.id);

      // find a cluster this evidence belongs to
      let matchedId: string | undefined;
      for (const c of Object.values(clusters)) {
        const members = c.evidenceIds.map(id => evidence[id]).filter(Boolean);
        if (shouldCluster(members, ev)) { matchedId = c.id; break; }
      }

      if (matchedId) {
        const existing = clusters[matchedId];
        const members = existing.evidenceIds.map(id => evidence[id]).filter(Boolean);
        const items = [...members, ev];
        const scores = scoreCluster(items);
        const newState = computeClusterState(scores.promotionScore, items.length);
        const updated = {
          ...existing,
          evidenceIds: items.map(i => i.id),
          ...scores,
          state: newState,
        };
        upsertCluster(updated);
        updateEvidence(ev.id, { state: "CLUSTERED" });

        if (newState === "PROMOTION_READY" && existing.state !== "PROMOTION_READY"
            && !Object.values(candidates).some(c => c.clusterId === updated.id)) {
          const cand = candidateFromCluster(updated, ev);
          upsertCandidate(cand);
          updated.candidateId = cand.id;
          updated.state = "CANDIDATE_CREATED";
          upsertCluster(updated);

          const evt: GovernanceEvent = {
            eventId: nextId("evt"), eventType: "PROMOTION_THRESHOLD_REACHED",
            timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
            targetDomain: "ALL", correlationId: nextId("corr"), globalVersion,
            payload: { clusterId: updated.id, candidateId: cand.id, score: scores.promotionScore, threshold: PROMOTION_THRESHOLD },
          };
          emit(evt);
        } else {
          const evt: GovernanceEvent = {
            eventId: nextId("evt"), eventType: "EVIDENCE_CLUSTER_UPDATED",
            timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
            targetDomain: "ALL", correlationId: nextId("corr"), globalVersion,
            payload: { clusterId: updated.id, count: items.length, score: scores.promotionScore },
          };
          emit(evt);
        }
      } else {
        // create new cluster with this single evidence
        const scores = scoreCluster([ev]);
        const id = `C-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
        const state = computeClusterState(scores.promotionScore, 1);
        upsertCluster({
          id,
          evidenceIds: [ev.id],
          skillRelation: ev.skillRelation,
          contextSignature: clusterKeyFor(ev),
          ...scores,
          state,
          createdAt: Date.now(),
        });
        updateEvidence(ev.id, { state: "CLUSTERED" });
        const evt: GovernanceEvent = {
          eventId: nextId("evt"), eventType: "EVIDENCE_CLUSTER_CREATED",
          timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
          targetDomain: "ALL", correlationId: nextId("corr"), globalVersion,
          payload: { clusterId: id, evidenceId: ev.id },
        };
        emit(evt);
      }
    }
  }, [evidence, role]);
}
