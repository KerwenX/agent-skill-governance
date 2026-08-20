// ============================================================
// Publishing — build a global contract + change set from the
// active scenario publish profile and apply generic revalidation.
// Used by both the developer editor and the demo auto-publish.
// ============================================================
import type {
  GlobalChangeSet, GlobalGovernanceCandidate, GovernanceContract, GovernanceEvent,
} from "../domain/types";
import type { GovernanceState } from "../store/governance";
import { findAffectedContracts, buildChangeSet } from "./dependency";
import { revalidate } from "./revalidation";
import { nextChangeSetId } from "./governance";
import { eventBus, nextId } from "../app/eventBus";

export interface PublishResult {
  contract: GovernanceContract;
  changeSet: GlobalChangeSet;
}

/** Select the next scenario publish profile (first with toVersion > current). */
export function nextPublishProfile(scenario: GovernanceState["scenario"], currentVersion: string) {
  const cur = parseInt(currentVersion.replace("v", ""), 10);
  return scenario.publishes.find(p => parseInt(p.toVersion.replace("v", ""), 10) > cur);
}

function samePredicateShape(a: GovernanceContract, b: GovernanceContract): boolean {
  if (a.predicate.length !== b.predicate.length) return false;
  return a.predicate.every((p, i) => {
    const q = b.predicate[i];
    return q && p.field === q.field && p.operator === q.operator && JSON.stringify(p.value) === JSON.stringify(q.value);
  });
}

/** Build (but do not persist) the contract + change set for a publish. */
export function buildPublish(state: GovernanceState, candidate?: GlobalGovernanceCandidate): PublishResult | null {
  const profile = nextPublishProfile(state.scenario, state.globalVersion);
  if (!profile) return null;
  const fromVer = state.globalVersion;

  const contract: GovernanceContract = {
    id: profile.contractId,
    domain: "GLOBAL",
    contractType: profile.contractType,
    state: "ACTIVE",
    title: profile.title,
    summary: profile.summary,
    predicate: profile.predicate,
    relations: profile.relations,
    scope: { taskTypes: profile.predicate.map(p => String(p.value)) },
    overridePermission: profile.contractType === "INVARIANT" ? false : true,
    originEvidenceIds: candidate ? [candidate.id] : [],
    parentVersion: fromVer,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Supersede prior global contracts with the same predicate shape (e.g. v31 → v32).
  const supersedes: string[] = [];
  for (const g of Object.values(state.globalContracts)) {
    if (g.id !== contract.id && g.state === "ACTIVE" && samePredicateShape(g, contract)) {
      supersedes.push(g.id);
    }
  }

  const allLocals = Object.values(state.localContracts);
  const changedSkills = profile.changedSkills ?? [];
  const preview: GlobalChangeSet = {
    id: "PREVIEW", fromVersion: fromVer, toVersion: profile.toVersion,
    changedContracts: [contract.id], changedSkills,
    changedRelationships: contract.relations,
    changedContextSchemas: contract.scope.taskTypes ?? [],
    affectedContractIds: [], createdAt: Date.now(),
  };
  const affected = findAffectedContracts(preview, allLocals);

  const retired: string[] = []; const refined: string[] = []; const conflicted: string[] = [];
  const ctx: Record<string, unknown> = {};
  for (const p of contract.predicate) ctx[p.field] = p.value;
  const allGlobals = Object.values(state.globalContracts);
  for (const a of affected) {
    const forced = profile.outcomes[a.contract.id];
    const r = forced
      ? { result: forced } as ReturnType<typeof revalidate>
      : revalidate(a.contract, [contract, ...allGlobals],
          { ...preview, id: nextChangeSetId(profile.toVersion) }, ctx);
    if (r.result === "RETIRED") retired.push(a.contract.id);
    else if (r.result === "ACTIVE_REFINEMENT") refined.push(a.contract.id);
    else conflicted.push(a.contract.id);
  }

  const cs = buildChangeSet(fromVer, profile.toVersion, contract, affected, changedSkills);
  cs.id = nextChangeSetId(profile.toVersion);
  cs.revalidation = { retired, refined, conflicted };
  cs.outcomeOverrides = profile.outcomes;
  (contract as GovernanceContract & { supersedes?: string[] }).supersedes = supersedes;
  return { contract, changeSet: cs };
}

/** Persist a publish: add contract/changeSet, retire superseded, emit events. */
export function applyPublish(state: GovernanceState, pub: PublishResult, candidate?: GlobalGovernanceCandidate) {
  const { contract, changeSet: cs } = pub;
  const supersedes = (contract as GovernanceContract & { supersedes?: string[] }).supersedes ?? [];
  for (const id of supersedes) {
    if (state.globalContracts[id]) state.addGlobalContract({ ...state.globalContracts[id], state: "STALE" });
  }
  state.addGlobalContract(contract);
  state.addChangeSet(cs);
  for (const id of cs.affectedContractIds) {
    if (state.localContracts[id]) state.updateLocalContract(id, { state: "STALE" });
  }
  if (cs.revalidation) {
    for (const id of cs.revalidation.retired) state.updateLocalContract(id, { state: "RETIRED" });
    for (const id of cs.revalidation.refined) state.updateLocalContract(id, { state: "ACTIVE_REFINEMENT" });
    for (const id of cs.revalidation.conflicted) state.updateLocalContract(id, { state: "CONFLICT" });
  }
  if (candidate) state.upsertCandidate({ ...candidate, state: "PUBLISHED", publishedContractId: contract.id });

  state.emit({
    eventId: nextId("evt"), eventType: "GLOBAL_CHANGESET_CREATED", timestamp: Date.now(),
    sourceDomain: "DEVELOPER", sourceId: eventBus.id, targetDomain: "ALL", correlationId: nextId("corr"),
    globalVersion: cs.toVersion, payload: { changeSet: cs, globalContract: contract },
  } as GovernanceEvent);
  state.emit({
    eventId: nextId("evt"), eventType: "GLOBAL_CONTRACT_PUBLISHED", timestamp: Date.now(),
    sourceDomain: "DEVELOPER", sourceId: eventBus.id, targetDomain: "ALL", correlationId: nextId("corr"),
    globalVersion: cs.toVersion, payload: { changeSetId: cs.id },
  } as GovernanceEvent);
}
