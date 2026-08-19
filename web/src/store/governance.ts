// ============================================================
// Global Governance Store — V4.0 section 168
// One Zustand store per window; cross-window sync via eventBus.
// ============================================================
import { create } from "zustand";
import {
  AGENTS, INITIAL_GLOBAL_CONTRACTS, INITIAL_GLOBAL_VERSION,
  INITIAL_LOCAL_CONTRACTS, PLATFORM_STATS, SKILLS, USERS,
} from "../fixtures/base";
import type {
  Agent, EvidenceCluster, GlobalChangeSet, GlobalGovernanceCandidate,
  GovernanceContract, GovernanceEvent, LocalEvidence, NotificationItem,
  RuntimeExecution, Skill, User,
} from "../domain/types";
import { eventBus, nextId } from "../app/eventBus";
import { recomputeClusters } from "../engines/clusterSync";

export type WindowRole = "demo" | "developer" | "user";

interface GovernanceState {
  role: WindowRole;
  userId?: string;

  // Fixture data
  skills: Record<string, Skill>;
  users: Record<string, User>;
  agents: Record<string, Agent>;
  platformStats: typeof PLATFORM_STATS;

  // Runtime
  globalVersion: string;
  globalContracts: Record<string, GovernanceContract>;
  localContracts: Record<string, GovernanceContract>;
  evidence: Record<string, LocalEvidence>;
  clusters: Record<string, EvidenceCluster>;
  candidates: Record<string, GlobalGovernanceCandidate>;
  changeSets: Record<string, GlobalChangeSet>;
  runtimes: Record<string, RuntimeExecution>;
  events: GovernanceEvent[];
  notifications: NotificationItem[];

  // Demo / UI
  evidenceInboxCount: number;
  activeScenarioId: string;

  // Reducers
  init: (role: WindowRole, userId?: string) => void;
  resetAll: () => void;
  applyEvent: (event: GovernanceEvent) => void;
  emit: (event: GovernanceEvent) => void;

  addRuntime: (rt: RuntimeExecution) => void;
  updateRuntime: (id: string, patch: Partial<RuntimeExecution>) => void;

  addEvidence: (e: LocalEvidence) => void;
  updateEvidence: (id: string, patch: Partial<LocalEvidence>) => void;

  addLocalContract: (c: GovernanceContract) => void;
  updateLocalContract: (id: string, patch: Partial<GovernanceContract>) => void;
  addGlobalContract: (c: GovernanceContract) => void;

  upsertCluster: (c: EvidenceCluster) => void;
  upsertCandidate: (c: GlobalGovernanceCandidate) => void;
  addChangeSet: (c: GlobalChangeSet) => void;

  pushNotification: (n: Omit<NotificationItem, "id" | "createdAt">) => void;
  markAllNotificationsRead: () => void;
  bumpInbox: (n?: number) => void;

  setActiveScenario: (id: string) => void;
}

const toMap = <T extends { id: string }>(arr: T[]) =>
  Object.fromEntries(arr.map(x => [x.id, x])) as Record<string, T>;

function initialFixtureState() {
  return {
    globalVersion: INITIAL_GLOBAL_VERSION,
    skills: toMap(SKILLS),
    users: toMap(USERS),
    agents: toMap(AGENTS),
    platformStats: PLATFORM_STATS,
    globalContracts: toMap(INITIAL_GLOBAL_CONTRACTS),
    localContracts: toMap(INITIAL_LOCAL_CONTRACTS),
    evidence: {},
    clusters: {},
    candidates: {},
    changeSets: {},
    runtimes: {},
    events: [],
    notifications: [],
    evidenceInboxCount: 61,
    activeScenarioId: "scenario-01",
  };
}

export const useGovernance = create<GovernanceState>((set, get) => ({
  role: "demo",
  ...initialFixtureState(),

  init: (role, userId) => {
    set({ role, userId, ...initialFixtureState() });
  },

  resetAll: () => {
    set(s => ({ ...s, ...initialFixtureState() }));
    const evt: GovernanceEvent = {
      eventId: nextId("evt"), eventType: "DEMO_RESET",
      timestamp: Date.now(), sourceDomain: "SYSTEM", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: get().globalVersion, payload: { reason: "reset" },
    };
    eventBus.publish(evt);
  },

  emit: (event) => {
    // applyEvent() records into events log + applies local side-effects.
    get().applyEvent(event);
    // Broadcast to other windows (local subscription skips events from self).
    eventBus.publish(event);
  },

  applyEvent: (event) => {
    // Central cross-window reducer. Local reducers call this too via emit.
    set(s => ({ events: [...s.events, event].slice(-500) }));

    switch (event.eventType) {
      case "LOCAL_EVIDENCE_CREATED": {
        const p = event.payload as { evidenceId: string; evidence?: LocalEvidence };
        const ev = p.evidence;
        if (ev && !get().evidence[ev.id]) {
          get().addEvidence(ev);
        }
        // Developer: synchronous clustering (no stale React-effect closures)
        if (get().role === "developer" && ev) {
          get().bumpInbox(1);
          const allEvidence = Object.values(get().evidence);
          const { clusters, result } = recomputeClusters(allEvidence, get().clusters, ev);
          if (result?.cluster) {
            get().upsertCluster(result.cluster);
          }
          if (result?.candidate) {
            get().upsertCandidate(result.candidate);
            get().pushNotification({
              kind: "success",
              title: "Promotion Ready",
              body: `${result.cluster!.id} reached score ${result.cluster!.promotionScore.toFixed(2)} → ${result.candidate.id}`,
              cta: { label: "Review", to: `/developer/candidates/${result.candidate.id}` },
            });
          }
          if (ev) {
            get().pushNotification({
              kind: "info",
              title: "New Governance Signal",
              body: `${ev.id} · ${ev.violationType} · ${ev.userId}`,
              cta: { label: "Inspect", to: "/developer/inbox" },
            });
          }
        }
        break;
      }
      case "LOCAL_CONTRACT_CREATED": {
        const p = event.payload as { contract?: GovernanceContract };
        if (p.contract && !get().localContracts[p.contract.id]) {
          get().addLocalContract(p.contract);
        }
        break;
      }
      case "GLOBAL_CANDIDATE_CREATED":
      case "GLOBAL_CANDIDATE_APPROVED":
      case "GLOBAL_CANDIDATE_REJECTED": {
        const p = event.payload as { candidate?: GlobalGovernanceCandidate };
        if (p.candidate) get().upsertCandidate(p.candidate);
        break;
      }
      case "GLOBAL_CHANGESET_CREATED": {
        const p = event.payload as { changeSet?: GlobalChangeSet; globalContract?: GovernanceContract };
        if (p.changeSet) get().addChangeSet(p.changeSet);
        if (p.globalContract) get().addGlobalContract(p.globalContract);
        break;
      }
      case "DEPENDENCY_SCAN_STARTED":
      case "LOCAL_CONTRACT_AFFECTED":
      case "REVALIDATION_STARTED": {
        // These are presentation cues; business state is handled via MARKED_STALE / result events.
        break;
      }
      case "GLOBAL_CONTRACT_PUBLISHED": {
        const csId = (event.payload as { changeSetId: string }).changeSetId;
        const cs = get().changeSets[csId];
        if (cs) {
          set({ globalVersion: cs.toVersion });
          // Mark affected STALE, then apply computed revalidation outcomes.
          for (const id of cs.affectedContractIds) {
            if (get().localContracts[id]) {
              get().updateLocalContract(id, { state: "STALE" });
            }
          }
          if (cs.revalidation) {
            for (const id of cs.revalidation.retired) {
              if (get().localContracts[id]) get().updateLocalContract(id, { state: "RETIRED" });
            }
            for (const id of cs.revalidation.refined) {
              if (get().localContracts[id]) get().updateLocalContract(id, { state: "ACTIVE_REFINEMENT" });
            }
            for (const id of cs.revalidation.conflicted) {
              if (get().localContracts[id]) get().updateLocalContract(id, { state: "CONFLICT" });
            }
          }
          get().pushNotification({
            kind: "success",
            title: `Global Governance ${cs.fromVersion} → ${cs.toVersion}`,
            body: `${cs.affectedContractIds.length} local contracts affected`,
            cta: { label: get().role === "developer" ? "Monitor" : "Review",
                   to: get().role === "developer"
                     ? `/developer/propagation/${cs.id}`
                     : `/${get().userId ? `user/${get().userId}` : "demo"}/updates` },
          });
        }
        break;
      }
      case "LOCAL_CONTRACT_MARKED_STALE":
      case "LOCAL_CONTRACT_RETIRED":
      case "LOCAL_CONTRACT_REFINED":
      case "LOCAL_CONTRACT_CONFLICTED": {
        const p = event.payload as { contractId: string; state?: string };
        if (p.contractId && get().localContracts[p.contractId]) {
          const stateMap: Record<string, string> = {
            LOCAL_CONTRACT_MARKED_STALE: "STALE",
            LOCAL_CONTRACT_RETIRED: "RETIRED",
            LOCAL_CONTRACT_REFINED: "ACTIVE_REFINEMENT",
            LOCAL_CONTRACT_CONFLICTED: "CONFLICT",
          };
          const nextState = stateMap[event.eventType];
          if (nextState) {
            get().updateLocalContract(p.contractId, { state: nextState as never });
          }
        }
        break;
      }
      default: break;
    }
  },

  addRuntime: (rt) => set(s => ({ runtimes: { ...s.runtimes, [rt.id]: rt } })),
  updateRuntime: (id, patch) =>
    set(s => {
      const prev = s.runtimes[id];
      if (!prev) return s;
      return { runtimes: { ...s.runtimes, [id]: { ...prev, ...patch } } };
    }),

  addEvidence: (e) => set(s => ({ evidence: { ...s.evidence, [e.id]: e } })),
  updateEvidence: (id, patch) =>
    set(s => {
      const prev = s.evidence[id]; if (!prev) return s;
      return { evidence: { ...s.evidence, [id]: { ...prev, ...patch } } };
    }),

  addLocalContract: (c) =>
    set(s => ({ localContracts: { ...s.localContracts, [c.id]: c } })),
  updateLocalContract: (id, patch) =>
    set(s => {
      const prev = s.localContracts[id]; if (!prev) return s;
      return { localContracts: { ...s.localContracts, [id]: { ...prev, ...patch, updatedAt: Date.now() } } };
    }),
  addGlobalContract: (c) =>
    set(s => ({ globalContracts: { ...s.globalContracts, [c.id]: c } })),

  upsertCluster: (c) =>
    set(s => ({ clusters: { ...s.clusters, [c.id]: c } })),
  upsertCandidate: (c) =>
    set(s => ({ candidates: { ...s.candidates, [c.id]: c } })),
  addChangeSet: (c) =>
    set(s => ({ changeSets: { ...s.changeSets, [c.id]: c } })),

  pushNotification: (n) =>
    set(s => ({
      notifications: [
        { ...n, id: nextId("ntf"), createdAt: Date.now() },
        ...s.notifications,
      ].slice(0, 30),
    })),
  markAllNotificationsRead: () =>
    set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),

  bumpInbox: (n = 1) => set(s => ({ evidenceInboxCount: s.evidenceInboxCount + n })),

  setActiveScenario: (id) => set({ activeScenarioId: id }),
}));

// Subscribe once to cross-window events and route them through reducer.
if (typeof window !== "undefined") {
  eventBus.subscribe((event) => {
    // Skip events this window itself emitted (already applied through emit)
    if (event.sourceId === eventBus.id) return;
    useGovernance.getState().applyEvent(event);
  });
  // E2E / debug access
  (window as unknown as { __skillos?: unknown }).__skillos = {
    store: useGovernance,
    eventBus,
    nextId,
  };
}
