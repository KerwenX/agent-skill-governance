// Developer-side demo command handling: navigate / approve / publish
import React from "react";
import { useNavigate } from "react-router-dom";
import { useGovernance } from "../store/governance";
import { eventBus } from "../app/eventBus";
import { buildPublish, applyPublish } from "../engines/publishing";
import type { GovernanceEvent } from "../domain/types";

/** Listens to DEMO_COMMAND events and drives developer-side actions. */
export function useDevDemoCommands() {
  const navigate = useNavigate();
  const store = useGovernance;

  React.useEffect(() => {
    let busy = false;
    return eventBus.subscribe(async (event) => {
      if (event.eventType !== "DEMO_COMMAND") return;
      if (busy) return;
      const payload = event.payload as { action: string; to?: string; userId?: string };
      if (payload.userId) return;

      busy = true;
      try {
        const s = store.getState();
        if (payload.action === "navigate" && payload.to) navigate(payload.to);

        if (payload.action === "openCandidate") {
          const cand = Object.values(s.candidates).find(c => c.state === "GENERATED" || c.state === "APPROVED");
          if (cand) navigate(`/developer/candidates/${cand.id}`);
        }
        if (payload.action === "approveCandidate") {
          const cand = Object.values(s.candidates)[0];
          if (!cand) return;
          s.upsertCandidate({ ...cand, state: "APPROVED" });
          navigate(`/developer/contracts/new?candidate=${cand.id}`);
        }
        if (payload.action === "runImpact") {
          const cand = Object.values(s.candidates)[0];
          if (cand) navigate(`/developer/impact/${cand.id}`);
        }
        if (payload.action === "publish") {
          const cand = Object.values(s.candidates).find(c => c.state === "APPROVED") ?? Object.values(s.candidates)[0];
          const pub = buildPublish(s, cand);
          if (!pub) return;
          applyPublish(s, pub, cand);
          navigate(`/developer/propagation/${pub.changeSet.id}`);
        }
        if (payload.action === "applyUpgrade") {
          const p = payload as unknown as { skillId: string; version: string };
          if (p.skillId && p.version) s.upgradeSkill(p.skillId, p.version);
        }
      } finally {
        setTimeout(() => { busy = false; }, 300);
      }
    });
  }, [navigate, store]);
}
