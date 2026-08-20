// ============================================================
// 本地简易数据库（JSON 文件种子 + localStorage 运行时库）
//
// · data/db.json  —— 种子副本（只读基准，保证每次启动数据一致）
// · localStorage —— 运行时数据库，启动时从副本复位，运行中可增删改查
// · 所有 store 写操作均同步落库，界面即时反映修改
// ============================================================
import type {
  EvidenceCluster, GlobalChangeSet, GlobalGovernanceCandidate,
  GovernanceContract, LocalEvidence, RuntimeExecution, Skill, User, Agent,
} from "../domain/types";

const LS_KEY = "skillos-db-v1";
const SEED_URL = "/data/db.json";

export interface ScenarioScriptStep {
  id: string;
  narration: string;
  focus: string;
  wait?: number;
  command?: Record<string, unknown>;
  target?: string;
}
export interface ScenarioScript {
  scenarioId: string;
  windows: { key: string; kind: string; userId?: string; label: string; sub: string; color: string; initials?: string; w: number; h: number }[];
  steps: ScenarioScriptStep[];
}

export interface ScenarioData {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  industry: string;
  summary: string;
  initialVersion: string;
  skills: Skill[];
  users: User[];
  agents: Agent[];
  globalContracts: GovernanceContract[];
  localContracts: GovernanceContract[];
  platformStats: { skills: number; globalContracts: number; localContractsObserved: number; users: number; agents: number; evidenceTotal: number };
  tasks: unknown[];
  publishes: unknown[];
  seed: {
    evidence: LocalEvidence[];
    clusters: EvidenceCluster[];
    candidates: GlobalGovernanceCandidate[];
    changeSets: GlobalChangeSet[];
    notifications: { kind: string; title: string; body?: string; read?: boolean; ageDays?: number }[];
  } | null;
  script: ScenarioScript | null;
}

export interface DbShape {
  meta: { version: number; seedAt: string; updatedAt: string };
  scenarios: Record<string, ScenarioData>;
  /** 运行时实体（演示中产生的证据/契约/聚类/变更集等），启动时清空 */
  runtime: Record<string, Record<string, unknown>>;
}

let cache: DbShape | null = null;

/** 启动时调用：从 JSON 副本复位运行时库，保证每次启动数据一致。 */
export async function ensureDb(): Promise<DbShape> {
  const res = await fetch(SEED_URL);
  if (!res.ok) throw new Error(`db seed load failed: ${res.status}`);
  const seed = (await res.json()) as DbShape;
  seed.meta.updatedAt = new Date().toISOString();
  seed.runtime = {};  // 运行时库：每次启动从空开始（副本复位）
  localStorage.setItem(LS_KEY, JSON.stringify(seed));
  cache = seed;
  return seed;
}

/** 运行中读库（内存缓存，先于 localStorage 同步）。 */
export function getDb(): DbShape {
  if (cache) return cache;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) throw new Error("db not initialised — call ensureDb() before render");
  cache = JSON.parse(raw) as DbShape;
  return cache;
}

function saveDb() {
  if (!cache) return;
  cache.meta.updatedAt = new Date().toISOString();
  localStorage.setItem(LS_KEY, JSON.stringify(cache));
}

/** 从副本复位（“数据副本”入口）。 */
export async function resetDb() {
  return ensureDb();
}

// ---------------- 通用 CRUD（本地简易数据库） ----------------
// 运行时实体统一存于 db.runtime（按 id 索引的对象列），种子数据保持只读副本
function colOf(db: DbShape, entity: string): Record<string, unknown> {
  const col = db.runtime[entity] ?? (db.runtime[entity] = {});
  return col;
}

export function listDb<T>(entity: string): T[] {
  return Object.values(colOf(getDb(), entity)) as T[];
}

export function insertDb<T extends { id: string }>(entity: string, item: T): T {
  colOf(getDb(), entity)[item.id] = item;
  saveDb();
  return item;
}

export function updateDb<T extends { id: string }>(entity: string, id: string, patch: Partial<T>): T | undefined {
  const col = colOf(getDb(), entity);
  const cur = col[id] as T | undefined;
  if (!cur) return undefined;
  col[id] = { ...cur, ...patch };
  saveDb();
  return col[id] as T;
}

export function deleteDb(entity: string, id: string): boolean {
  const db = getDb();
  const col = colOf(db, entity);
  if (id in col) {
    delete col[id];
    saveDb();
    return true;
  }
  // 种子实体：记录删除标记（副本复位后恢复），运行中界面即时消失
  const deleted = db.runtime.deleted ?? (db.runtime.deleted = {});
  const list = (deleted[entity] as string[] | undefined) ?? (deleted[entity] = []);
  if (!list.includes(id)) {
    list.push(id);
    saveDb();
  }
  return true;
}

export function countDb(entity: string): number {
  return Object.keys(colOf(getDb(), entity)).length;
}

// ---------------- 领域便捷方法 ----------------
/** 场景数据（应用运行中的删除标记）。 */
export function getScenarioData(id: string): ScenarioData {
  const sc = getDb().scenarios[id];
  if (!sc) throw new Error(`scenario ${id} not found in local db`);
  const deleted = getDb().runtime?.deleted?.localContracts as string[] | undefined;
  if (!deleted?.length) return sc;
  return { ...sc, localContracts: sc.localContracts.filter(c => !deleted.includes(c.id)) };
}

/** 切换用户：取该用户的本地规则 / 运行证据（按 userId 分区读取）。 */
export function getUserData(userId: string) {
  const db = getDb();
  const localContracts: (GovernanceContract & { _scenario: string })[] = [];
  const evidence: (LocalEvidence & { _scenario: string })[] = [];
  for (const s of Object.values(db.scenarios)) {
    for (const c of s.localContracts) if (c.ownerId === userId) localContracts.push({ ...c, _scenario: s.id });
    for (const e of s.seed?.evidence ?? []) if (e.userId === userId) evidence.push({ ...e, _scenario: s.id });
  }
  return { localContracts, evidence };
}

// 运行期写集合（这些集合由运行时产生/演进，持久化到同名实体）
export function persistContract(entity: "localContracts" | "globalContracts", c: GovernanceContract) {
  insertDb(entity, c);
}
export function persistEvidence(e: LocalEvidence) {
  insertDb("evidence", e);
}
export function persistRuntime(rt: RuntimeExecution) {
  insertDb("runtimes", rt);
}
export function persistCluster(c: EvidenceCluster) {
  insertDb("clusters", c);
}
export function persistCandidate(c: GlobalGovernanceCandidate) {
  insertDb("candidates", c);
}
export function persistChangeSet(c: GlobalChangeSet) {
  insertDb("changeSets", c);
}
