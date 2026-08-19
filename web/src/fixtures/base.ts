// ============================================================
// Base fixture — V4.0 sections 118–125
// Seed 42; deterministic demo state.
// ============================================================
import type {
  Skill, User, Agent, GovernanceContract, GovernancePredicate,
} from "../domain/types";

const T0 = 1_756_000_000_000; // fixed epoch; Date.now() used only at runtime for new events

export const SKILLS: Skill[] = [
  { id: "skill-web-search",        name: "Web Search",             description: "通用公开 Web 搜索（含新闻/博客/媒体）",
    version: "3.1", category: "Search",           capabilities: ["web","news","html"],     status: "ACTIVE", provider: "search.fabric" },
  { id: "skill-ir-search",         name: "Investor Relations Search", description: "上市公司投资者关系官网检索（10-K/10-Q/季报/年报）",
    version: "2.4", category: "Financial Search", capabilities: ["official","filings"],   status: "ACTIVE", provider: "ir.fabric" },
  { id: "skill-pdf-extraction",    name: "PDF Extraction",         description: "PDF 文档结构与文本抽取",
    version: "2.3", category: "Document",         capabilities: ["pdf","text"],           status: "ACTIVE", provider: "docs.fabric" },
  { id: "skill-ocr",               name: "OCR",                    description: "扫描件/图像 OCR 文字识别",
    version: "1.7", category: "Document",         capabilities: ["image","ocr"],          status: "ACTIVE", provider: "vision.fabric" },
  { id: "skill-internal-finance",  name: "Internal Financial DB",  description: "企业内部财务数据库（只读）",
    version: "4.2", category: "Internal Data",    capabilities: ["finance","internal"],   status: "ACTIVE", provider: "fin.internal" },
  { id: "skill-report-exporter",   name: "Report Exporter",        description: "将结构化数据导出为报告",
    version: "1.4", category: "Output",           capabilities: ["export"],              status: "ACTIVE", provider: "docs.fabric" },
  { id: "skill-cache-market",      name: "Cached Market Quote",    description: "延迟 15 分钟的缓存行情，作回退源",
    version: "1.0", category: "Financial Data",   capabilities: ["quote","cached"],       status: "ACTIVE", provider: "market.fabric" },
  { id: "skill-stock-query",       name: "Realtime Stock Query",   description: "实时股票行情查询",
    version: "2.0", category: "Financial Data",   capabilities: ["quote","realtime"],     status: "ACTIVE", provider: "market.fabric" },
];

export const USERS: User[] = [
  { id: "user-a", name: "林 · 分析师",    initials: "林", avatarColor: "#5B82F6", role: "Equity Research Analyst",  organization: "Research Desk" },
  { id: "user-b", name: "陈 · 投研助理", initials: "陈", avatarColor: "#8B5CF6", role: "Senior Research Associate", organization: "Buy-side" },
  { id: "user-c", name: "周 · 交易员",    initials: "周", avatarColor: "#F59E0B", role: "Desk Trader",                organization: "Trading" },
];

export const AGENTS: Agent[] = USERS.map((u, i) => ({
  id: `agent-${u.id}`,
  userId: u.id,
  name: ["Atlas", "Hermes", "Orion"][i],
  model: "fabric-model-4",
  skillIds: SKILLS.map(s => s.id),
}));

// Global state at v18: a few unrelated contracts, but NO official_filing priority rule.
export const INITIAL_GLOBAL_VERSION = "v18";
export const NEXT_GLOBAL_VERSION    = "v19";
export const PDF_GLOBAL_VERSION     = "v20";

export const INITIAL_GLOBAL_CONTRACTS: GovernanceContract[] = [
  {
    id: "GC-1000",
    domain: "GLOBAL",
    contractType: "INVARIANT",
    state: "ACTIVE",
    title: "Internal Finance requires Finance permission",
    summary: "Internal Financial DB 仅对持有 finance:read 权限的会话可用。",
    predicate: [{ field: "permission", operator: "IN", value: ["finance:read"] }],
    relations: [{ type: "PERMISSION", sourceSkillId: "skill-internal-finance" }],
    scope: { taskTypes: ["*"] },
    overridePermission: false,
    originEvidenceIds: [],
    parentVersion: "v12",
    createdAt: T0 - 1000 * 60 * 60 * 24 * 30,
    updatedAt: T0 - 1000 * 60 * 60 * 24 * 30,
  },
  {
    id: "GC-1014",
    domain: "GLOBAL",
    contractType: "DEFAULT",
    state: "ACTIVE",
    title: "Realtime quote overrides cache",
    summary: "实时行情可用时，优先 Realtime Stock Query，缓存行情仅作失败回退。",
    predicate: [{ field: "taskType", operator: "EQUALS", value: "market_quote" }],
    relations: [{ type: "FALLBACK", sourceSkillId: "skill-stock-query", targetSkillId: "skill-cache-market" }],
    scope: { taskTypes: ["market_quote"] },
    overridePermission: true,
    originEvidenceIds: [],
    parentVersion: "v15",
    createdAt: T0 - 1000 * 60 * 60 * 24 * 12,
    updatedAt: T0 - 1000 * 60 * 60 * 24 * 12,
  },
];

// User B & C already have local contracts at v18 — they will be affected by v19.
// User A starts clean; they will create LC-A during Scenario 01.
export const INITIAL_LOCAL_CONTRACTS: GovernanceContract[] = [
  {
    id: "LC-B-01",
    domain: "LOCAL",
    ownerId: "user-b",
    contractType: "REFINEMENT",
    state: "ACTIVE",
    title: "User B · 官方公告优先 IR；内部财务数据走 Internal DB",
    summary: "official_filing → IRSearch；若 session 含 internal_resource=true，则追加 Internal Financial DB。",
    predicate: [
      { field: "taskType",           operator: "EQUALS", value: "official_filing" },
      { field: "sourceRequirement",  operator: "EQUALS", value: "official" },
      { field: "internal_resource",  operator: "EQUALS", value: true },
    ],
    relations: [
      { type: "PRIORITY", sourceSkillId: "skill-ir-search",  targetSkillId: "skill-web-search", direction: "OVER" },
    ],
    scope: { userIds: ["user-b"] },
    overridePermission: true,
    dependencies: {
      parentContractId: "GC-1014",
      skillVersions: { "skill-ir-search": "2.4", "skill-web-search": "3.1" },
      relationships: [{ type: "PRIORITY", sourceSkillId: "skill-ir-search", targetSkillId: "skill-web-search" }],
      contextSchemas: ["official_filing", "internal_resource"],
    },
    originEvidenceIds: ["LE-B-PREV"],
    parentVersion: "v18",
    createdAt: T0 - 1000 * 60 * 60 * 24 * 4,
    updatedAt: T0 - 1000 * 60 * 60 * 24 * 4,
  } as GovernanceContract,
  {
    id: "LC-C-01",
    domain: "LOCAL",
    ownerId: "user-c",
    contractType: "REFINEMENT",
    state: "ACTIVE",
    title: "User C · 仅使用 Web Search（交易终端屏蔽 IR 站点）",
    summary: "official_filing 场景下强制只走 Web Search（终端网络策略限制）。",
    predicate: [
      { field: "taskType",          operator: "EQUALS", value: "official_filing" },
      { field: "sourceRequirement", operator: "EQUALS", value: "official" },
    ],
    relations: [
      { type: "EXCLUSION", sourceSkillId: "skill-web-search", targetSkillId: "skill-ir-search" },
    ],
    scope: { userIds: ["user-c"] },
    overridePermission: true,
    dependencies: {
      parentContractId: "GC-1014",
      skillVersions: { "skill-ir-search": "2.4", "skill-web-search": "3.1" },
      relationships: [{ type: "EXCLUSION", sourceSkillId: "skill-web-search", targetSkillId: "skill-ir-search" }],
      contextSchemas: ["official_filing"],
    },
    originEvidenceIds: ["LE-C-PREV"],
    parentVersion: "v18",
    createdAt: T0 - 1000 * 60 * 60 * 24 * 2,
    updatedAt: T0 - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: "LC-B-PDF",
    domain: "LOCAL",
    ownerId: "user-b",
    contractType: "REFINEMENT",
    state: "ACTIVE",
    title: "User B · 扫描 PDF 走 OCR → PDF Extraction 顺序",
    summary: "scanned_pdf 场景：OCR 作为 PDF Extraction 的前置步骤（PDF v2.3 不原生支持扫描件）。",
    predicate: [
      { field: "taskType", operator: "EQUALS", value: "scanned_pdf" },
    ],
    relations: [
      { type: "ORDER", sourceSkillId: "skill-ocr", targetSkillId: "skill-pdf-extraction" },
    ],
    scope: { userIds: ["user-b"] },
    overridePermission: true,
    dependencies: {
      parentContractId: "GC-1014",
      skillVersions: { "skill-pdf-extraction": "2.3", "skill-ocr": "1.7" },
      relationships: [{ type: "ORDER", sourceSkillId: "skill-ocr", targetSkillId: "skill-pdf-extraction" }],
      contextSchemas: ["scanned_pdf"],
    },
    originEvidenceIds: ["LE-B-PDF"],
    parentVersion: "v18",
    createdAt: T0 - 1000 * 60 * 60 * 24 * 1,
    updatedAt: T0 - 1000 * 60 * 60 * 24 * 1,
  },
];

// Counts shown on Overview (we render ~dozens but show bigger platform totals).
export const PLATFORM_STATS = {
  skills: 1024,
  globalContracts: 248,
  localContractsObserved: 38125,
  users: 10000,
  agents: 24000,
  evidenceTotal: 121893,
};

// Demo prompts
export const DEMO_PROMPTS = [
  { id: "p1", label: "Find NVIDIA's latest official quarterly filing.", taskType: "official_filing", sourceRequirement: "official" },
  { id: "p2", label: "Pull latest 10-Q from Apple IR.",               taskType: "official_filing", sourceRequirement: "official" },
  { id: "p3", label: "Extract this scanned Q2 earnings PDF.",         taskType: "scanned_pdf",     sourceRequirement: "any" },
];
