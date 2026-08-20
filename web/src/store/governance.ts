// ============================================================
// Global Governance Store — one Zustand store per window;
// cross-window sync via eventBus. Scenario-driven seed state.
// ============================================================
import { create } from "zustand";
import { getScenario, DEFAULT_SCENARIO_ID } from "../fixtures/scenarios/registry";
import type { ScenarioConfig } from "../fixtures/scenarios/types";
import type {
  Agent, EvidenceCluster, GlobalChangeSet, GlobalGovernanceCandidate,
  GovernanceContract, GovernanceEvent, LocalEvidence, NotificationItem,
  RuntimeExecution, Skill, User,
} from "../domain/types";
import { eventBus, nextId } from "../app/eventBus";
import { recomputeClusters } from "../engines/clusterSync";

export type WindowRole = "demo" | "developer" | "user";

export interface GovernanceState {
  role: WindowRole;
  userId?: string;

  scenarioId: string;
  scenario: ScenarioConfig;

  // Fixture data (scenario-scoped)
  skills: Record<string, Skill>;
  users: Record<string, User>;
  agents: Record<string, Agent>;
  platformStats: ScenarioConfig["platformStats"];

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

  // Reducers
  init: (role: WindowRole, userId?: string, scenarioId?: string) => void;
  loadScenario: (id: string) => void;
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

  upgradeSkill: (skillId: string, version: string) => void;
  grantPermissions: (userId: string, permissions: string[]) => void;
  revokePermissions: (userId: string) => void;
  sessionPermissions: Record<string, string[]>;
}

const toMap = <T extends { id: string }>(arr: T[]) =>
  Object.fromEntries(arr.map(x => [x.id, x])) as Record<string, T>;

function seedFor(scenario: ScenarioConfig) {
  return {
    scenarioId: scenario.id,
    scenario,
    globalVersion: scenario.initialVersion,
    skills: toMap(scenario.skills),
    users: toMap(scenario.users),
    agents: toMap(scenario.agents),
    platformStats: scenario.platformStats,
    globalContracts: toMap(scenario.globalContracts),
    localContracts: toMap(scenario.localContracts),
    evidence: {},
    clusters: {},
    candidates: {},
    changeSets: {},
    runtimes: {},
    events: [],
    notifications: [],
    evidenceInboxCount: 0,
    sessionPermissions: {} as Record<string, string[]>,
  };
}

export const useGovernance = create<GovernanceState>((set, get) => ({
  role: "demo",
  ...seedFor(getScenario(DEFAULT_SCENARIO_ID)),

  init: (role, userId, scenarioId) => {
    const sc = getScenario(scenarioId);
    set({ role, userId, ...seedFor(sc) });
  },

  loadScenario: (id) => {
    const sc = getScenario(id);
    set({ ...seedFor(sc) });
    const evt: GovernanceEvent = {
      eventId: nextId("evt"), eventType: "SCENARIO_CHANGED",
      timestamp: Date.now(), sourceDomain: "SYSTEM", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: sc.initialVersion, payload: { scenarioId: id },
    };
    eventBus.publish(evt);
  },

  resetAll: () => {
    const sc = get().scenario;
    set(s => ({ ...s, ...seedFor(sc) }));
    const evt: GovernanceEvent = {
      eventId: nextId("evt"), eventType: "DEMO_RESET",
      timestamp: Date.now(), sourceDomain: "SYSTEM", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: get().globalVersion, payload: { reason: "reset" },
    };
    eventBus.publish(evt);
  },

  emit: (event) => {
    get().applyEvent(event);
    eventBus.publish(event);
  },

  applyEvent: (event) => {
    set(s => ({ events: [...s.events, event].slice(-500) }));

    switch (event.eventType) {
      case "SCENARIO_CHANGED": {
        const id = (event.payload as { scenarioId: string }).scenarioId;
        const sc = getScenario(id);
        set({ ...seedFor(sc) });
        break;
      }
      case "SKILL_UPGRADED": {
        const { skillId, version } = event.payload as { skillId: string; version: string };
        set(s => {
          const sk = s.skills[skillId];
          if (!sk) return s;
          return { skills: { ...s.skills, [skillId]: { ...sk, version } } };
        });
        break;
      }
      case "PERMISSIONS_CHANGED": {
        const { userId, permissions } = event.payload as { userId: string; permissions: string[] | null };
        set(s => ({
          sessionPermissions: permissions
            ? { ...s.sessionPermissions, [userId]: permissions }
            : Object.fromEntries(Object.entries(s.sessionPermissions).filter(([k]) => k !== userId)),
        }));
        break;
      }
      case "LOCAL_EVIDENCE_CREATED": {
        const p = event.payload as { evidenceId: string; evidence?: LocalEvidence };
        const ev = p.evidence;
        if (ev && !get().evidence[ev.id]) get().addEvidence(ev);
        if (get().role === "developer" && ev) {
          get().bumpInbox(1);
          const allEvidence = Object.values(get().evidence);
          const { clusters, result } = recomputeClusters(allEvidence, get().clusters, ev);
          if (result?.cluster) get().upsertCluster(result.cluster);
          if (result?.candidate) {
            get().upsertCandidate(result.candidate);
            get().pushNotification({
              kind: "success", title: "Promotion Ready",
              body: `${result.cluster!.id} reached score ${result.cluster!.promotionScore.toFixed(2)} → ${result.candidate.id}`,
              cta: { label: "Review", to: `/developer/candidates/${result.candidate.id}` },
            });
          }
          get().pushNotification({
            kind: "info", title: "New Governance Signal",
            body: `${ev.id} · ${ev.violationType} · ${ev.userId}`,
            cta: { label: "Inspect", to: "/developer/inbox" },
          });
        }
        break;
      }
      case "LOCAL_CONTRACT_CREATED": {
        const p = event.payload as { contract?: GovernanceContract };
        if (p.contract && !get().localContracts[p.contract.id]) get().addLocalContract(p.contract);
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
      case "GLOBAL_CONTRACT_PUBLISHED": {
        const csId = (event.payload as { changeSetId: string }).changeSetId;
        const cs = get().changeSets[csId];
        if (cs) {
          set({ globalVersion: cs.toVersion });
          for (const id of cs.affectedContractIds) {
            if (get().localContracts[id]) get().updateLocalContract(id, { state: "STALE" });
          }
          if (cs.revalidation) {
            for (const id of cs.revalidation.retired)
              if (get().localContracts[id]) get().updateLocalContract(id, { state: "RETIRED" });
            for (const id of cs.revalidation.refined)
              if (get().localContracts[id]) get().updateLocalContract(id, { state: "ACTIVE_REFINEMENT" });
            for (const id of cs.revalidation.conflicted)
              if (get().localContracts[id]) get().updateLocalContract(id, { state: "CONFLICT" });
          }
          get().pushNotification({
            kind: "success",
            title: `Global Governance ${cs.fromVersion} → ${cs.toVersion}`,
            body: `${cs.affectedContractIds.length} local contracts affected`,
            cta: { label: get().role === "developer" ? "Monitor" : "Review",
                   to: get().role === "developer"
                     ? `/developer/propagation/${cs.id}`
                     : `/user/${get().userId ?? "user-a"}/updates` },
          });
        }
        break;
      }
      case "LOCAL_CONTRACT_MARKED_STALE":
      case "LOCAL_CONTRACT_RETIRED":
      case "LOCAL_CONTRACT_REFINED":
      case "LOCAL_CONTRACT_CONFLICTED": {
        const p = event.payload as { contractId: string };
        if (p.contractId && get().localContracts[p.contractId]) {
          const map: Record<string, string> = {
            LOCAL_CONTRACT_MARKED_STALE: "STALE", LOCAL_CONTRACT_RETIRED: "RETIRED",
            LOCAL_CONTRACT_REFINED: "ACTIVE_REFINEMENT", LOCAL_CONTRACT_CONFLICTED: "CONFLICT",
          };
          const next = map[event.eventType];
          if (next) get().updateLocalContract(p.contractId, { state: next as never });
        }
        break;
      }
      default: break;
    }
  },

  addRuntime: (rt) => set(s => ({ runtimes: { ...s.runtimes, [rt.id]: rt } })),
  updateRuntime: (id, patch) =>
    set(s => {
      const prev = s.runtimes[id]; if (!prev) return s;
      return { runtimes: { ...s.runtimes, [id]: { ...prev, ...patch } } };
    }),

  addEvidence: (e) => set(s => ({ evidence: { ...s.evidence, [e.id]: e } })),
  updateEvidence: (id, patch) =>
    set(s => {
      const prev = s.evidence[id]; if (!prev) return s;
      return { evidence: { ...s.evidence, [id]: { ...prev, ...patch } } };
    }),

  addLocalContract: (c) => set(s => ({ localContracts: { ...s.localContracts, [c.id]: c } })),
  updateLocalContract: (id, patch) =>
    set(s => {
      const prev = s.localContracts[id]; if (!prev) return s;
      return { localContracts: { ...s.localContracts, [id]: { ...prev, ...patch, updatedAt: Date.now() } } };
    }),
  addGlobalContract: (c) => set(s => ({ globalContracts: { ...s.globalContracts, [c.id]: c } })),

  upsertCluster: (c) => set(s => ({ clusters: { ...s.clusters, [c.id]: c } })),
  upsertCandidate: (c) => set(s => ({ candidates: { ...s.candidates, [c.id]: c } })),
  addChangeSet: (c) => set(s => ({ changeSets: { ...s.changeSets, [c.id]: c } })),

  pushNotification: (n) =>
    set(s => ({ notifications: [{ ...n, id: nextId("ntf"), createdAt: Date.now() }, ...s.notifications].slice(0, 30) })),
  markAllNotificationsRead: () => set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),
  bumpInbox: (n = 1) => set(s => ({ evidenceInboxCount: s.evidenceInboxCount + n })),

  upgradeSkill: (skillId, version) => {
    const s = get();
    const sk = s.skills[skillId]; if (!sk) return;
    set({ skills: { ...s.skills, [skillId]: { ...sk, version } } });
    s.emit({
      eventId: nextId("evt"), eventType: "SKILL_UPGRADED",
      timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: s.globalVersion, payload: { skillId, version },
    });
  },
  grantPermissions: (userId, permissions) => {
    const s = get();
    set({ sessionPermissions: { ...s.sessionPermissions, [userId]: permissions } });
    s.emit({
      eventId: nextId("evt"), eventType: "PERMISSIONS_CHANGED",
      timestamp: Date.now(), sourceDomain: "USER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: s.globalVersion, payload: { userId, permissions },
    });
  },
  revokePermissions: (userId) => {
    const s = get();
    set({ sessionPermissions: Object.fromEntries(Object.entries(s.sessionPermissions).filter(([k]) => k !== userId)) });
    s.emit({
      eventId: nextId("evt"), eventType: "PERMISSIONS_CHANGED",
      timestamp: Date.now(), sourceDomain: "USER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: s.globalVersion, payload: { userId, permissions: null },
    });
  },
}));

if (typeof window !== "undefined") {
  eventBus.subscribe((event) => {
    if (event.sourceId === eventBus.id) return;
    useGovernance.getState().applyEvent(event);
  });
  (window as unknown as { __skillos?: unknown }).__skillos = { store: useGovernance, eventBus, nextId };
}
