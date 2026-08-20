// User-side automatic revalidation when a global publish arrives.
import React from "react";
import { useGovernance } from "../store/governance";
import { findAffectedContracts } from "../engines/dependency";
import { revalidate } from "../engines/revalidation";
import { orchestrator } from "../app/animations";

export function useUserRevalidation() {
  const role = useGovernance(s => s.role);
  const userId = useGovernance(s => s.userId);
  const events = useGovernance(s => s.events);
  const localContracts = useGovernance(s => s.localContracts);
  const globalContracts = useGovernance(s => s.globalContracts);
  const updateLocalContract = useGovernance(s => s.updateLocalContract);

  const processed = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (role !== "user" || !userId) return;
    const last = events[events.length - 1];
    if (!last || last.eventType !== "GLOBAL_CONTRACT_PUBLISHED") return;
    if (processed.current.has(last.eventId)) return;
    processed.current.add(last.eventId);

    const changeSetId = (last.payload as { changeSetId: string }).changeSetId;
    const s = useGovernance.getState();
    const cs = s.changeSets[changeSetId];
    if (!cs) return;

    const mine = Object.values(localContracts).filter(c => c.ownerId === userId);
    const affected = findAffectedContracts(cs, mine);

    (async () => {
      for (const a of affected) updateLocalContract(a.contract.id, { state: "STALE" });
      await orchestrator.wait(400);

      for (const a of affected) {
        updateLocalContract(a.contract.id, { state: "REVALIDATING" });
        await orchestrator.wait(500);
        // currentContext: derive from the local contract's own predicates so the
        // generic revalidation can judge which conditions remain local-specific.
        const ctx: Record<string, unknown> = {};
        for (const p of a.contract.predicate) ctx[p.field] = p.value;
        const result = revalidate(a.contract, Object.values(globalContracts), cs, ctx);
        const newState =
          result.result === "RETIRED" ? "RETIRED"
          : result.result === "ACTIVE_REFINEMENT" ? "ACTIVE_REFINEMENT"
          : "CONFLICT";
        updateLocalContract(a.contract.id, { state: newState as never, revalidation: result });
        await orchestrator.wait(180);
      }
    })();
  }, [events, role, userId, localContracts, globalContracts, updateLocalContract]);
}
