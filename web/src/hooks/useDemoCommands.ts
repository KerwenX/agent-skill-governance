// Developer-side demo command handling: navigate / approve / publish
import React from "react";
import { useNavigate } from "react-router-dom";
import { useGovernance } from "../store/governance";
import { eventBus, nextId } from "../app/eventBus";
import { buildChangeSet, findAffectedContracts } from "../engines/dependency";
import { contractFromCandidate } from "../engines/governance";
import { revalidate } from "../engines/revalidation";
import type { GovernanceEvent } from "../domain/types";

/**
 * Listens to DEMO_COMMAND events and drives developer-side actions:
 *  - navigate / openCandidate / approveCandidate / runImpact / publish
 *
 * The actual publish mirrors DevContractEditor's publish() logic.
 */
export function useDevDemoCommands() {
  const navigate = useNavigate();
  const store = useGovernance;

  React.useEffect(() => {
    let busy = false;
    return eventBus.subscribe(async (event) => {
      if (event.eventType !== "DEMO_COMMAND") return;
      if (busy) return;
      const payload = event.payload as { action: string; to?: string; userId?: string };
      if (payload.userId) return; // user-targeted command

      busy = true;
      try {
        const s = store.getState();

        if (payload.action === "navigate" && payload.to) {
          navigate(payload.to);
        }

        if (payload.action === "openCandidate") {
          const cand = Object.values(s.candidates).find(c => c.state === "GENERATED" || c.state === "APPROVED");
          if (cand) navigate(`/developer/candidates/${cand.id}`);
        }

        if (payload.action === "approveCandidate") {
          const cand = Object.values(s.candidates)[0];
          if (!cand) return;
          const updated = { ...cand, state: "APPROVED" as const };
          s.upsertCandidate(updated);
          s.emit({
            eventId: nextId("evt"), eventType: "GLOBAL_CANDIDATE_APPROVED",
            timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
            targetDomain: "ALL", correlationId: nextId("corr"), globalVersion: s.globalVersion,
            payload: { candidate: updated },
          } as GovernanceEvent);
          navigate(`/developer/contracts/new?candidate=${cand.id}`);
        }

        if (payload.action === "runImpact") {
          // Navigate to a (synthetic) impact route that visualizes scanning,
          // then after animation, proceed to publish.
          const cand = Object.values(s.candidates)[0];
          if (cand) navigate(`/developer/impact/${cand.id}`);
        }

        if (payload.action === "publish") {
          const cand = Object.values(s.candidates)[0];
          const cluster = cand ? s.clusters[cand.clusterId] : undefined;
          if (!cand || !cluster) return;

          const fromVer = s.globalVersion;
          const toVer = `v${parseInt(fromVer.replace("v",""),10)+1}`;
          const contract = contractFromCandidate(cand, cluster);
          contract.state = "ACTIVE";

          // Build change set using dependency engine
          const preview = {
            id: "PREVIEW", fromVersion: fromVer, toVersion: toVer,
            changedContracts: [contract.id],
            changedSkills: [],
            changedRelationships: contract.relations,
            changedContextSchemas: contract.scope.taskTypes ?? [],
            affectedContractIds: [],
            createdAt: Date.now(),
          };
          const allLocals = Object.values(s.localContracts);
          const affected = findAffectedContracts(preview, allLocals);

          const retired: string[] = []; const refined: string[] = []; const conflicted: string[] = [];
          for (const a of affected) {
            const r = revalidate(a.contract, [contract, ...Object.values(s.globalContracts)],
              { ...preview, changedContracts: [contract.id] } as never,
              { taskType: "official_filing" });
            if (r.result === "RETIRED") retired.push(a.contract.id);
            else if (r.result === "ACTIVE_REFINEMENT") refined.push(a.contract.id);
            else conflicted.push(a.contract.id);
          }

          const cs = buildChangeSet(fromVer, toVer, contract, affected);
          cs.revalidation = { retired, refined, conflicted };

          s.addGlobalContract(contract);
          s.addChangeSet(cs);
          s.upsertCandidate({ ...cand, state: "PUBLISHED", publishedContractId: contract.id });

          // ChangeSet must arrive BEFORE the publish event: other windows look up
          // changeSets[changeSetId] when applying GLOBAL_CONTRACT_PUBLISHED.
          s.emit({
            eventId: nextId("evt"), eventType: "GLOBAL_CHANGESET_CREATED",
            timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
            targetDomain: "ALL", correlationId: nextId("corr"),
            globalVersion: toVer, payload: { changeSet: cs, globalContract: contract },
          } as GovernanceEvent);
          s.emit({
            eventId: nextId("evt"), eventType: "GLOBAL_CONTRACT_PUBLISHED",
            timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
            targetDomain: "ALL", correlationId: nextId("corr"),
            globalVersion: toVer, payload: { changeSetId: cs.id },
          } as GovernanceEvent);

          navigate(`/developer/propagation/${cs.id}`);
        }
      } finally {
        setTimeout(() => { busy = false; }, 400);
      }
    });
  }, [navigate, store]);
}
