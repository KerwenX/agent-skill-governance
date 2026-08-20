// E2E-01 证券研究官方财报来源治理
import type { GovernanceContract, Skill, User, Agent } from "../../domain/types";
import type { ScenarioConfig, ScenarioEvidenceProfile, ScenarioTask } from "./types";

const T0 = 1_756_000_000_000;

export const S01_SKILLS: Skill[] = [
  { id: "skill-web-search", name: "Web Search", description: "通用公开 Web 搜索（含新闻/博客/媒体）",
    version: "3.1", category: "Search", capabilities: ["web","news","html"], status: "ACTIVE", provider: "search.fabric" },
  { id: "skill-ir-search", name: "Investor Relations Search", description: "上市公司投资者关系官网检索（10-K/10-Q/季报/年报）",
    version: "2.4", category: "Financial Search", capabilities: ["official","filings"], status: "ACTIVE", provider: "ir.fabric" },
  { id: "skill-internal-finance", name: "Internal Financial DB", description: "企业内部财务数据库（只读）",
    version: "4.2", category: "Internal Data", capabilities: ["finance","internal"], status: "ACTIVE", provider: "fin.internal",
    requiredPermissions: ["finance:read"] },
];

export const S01_USERS: User[] = [
  { id: "user-a", name: "林 · 研究员",   initials: "林", avatarColor: "#5B82F6", role: "Equity Research Analyst",  organization: "Research Desk" },
  { id: "user-b", name: "陈 · 投研助理", initials: "陈", avatarColor: "#8B5CF6", role: "Senior Research Associate", organization: "Buy-side" },
  { id: "user-c", name: "周 · 交易员",   initials: "周", avatarColor: "#F59E0B", role: "Desk Trader",                organization: "Trading" },
];

export const S01_AGENTS: Agent[] = S01_USERS.map((u, i) => ({
  id: `agent-${u.id}`, userId: u.id, name: ["Atlas", "Hermes", "Orion"][i],
  model: "fabric-model-4", skillIds: S01_SKILLS.map(s => s.id),
}));

const TASK_NVIDIA: ScenarioTask = {
  id: "official-filing",
  label: "查询英伟达最新官方季度财报（10-Q）",
  prompt: "查一下英伟达最新的官方季度财报（10-Q）",
  taskType: "official_filing",
  sourceRequirement: "official",
  candidates: [
    { skillId: "skill-web-search", plannerScore: 0.81, reason: ["关键词命中度高，覆盖公开网页"] },
    { skillId: "skill-ir-search",  plannerScore: 0.78, reason: ["匹配投资者关系领域，返回官方公告"] },
  ],
  expect: {
    selectedSkillId: "skill-web-search",
    anomaly: true,
    anomalyReason: "来源要求=官方，实际返回=综合媒体（匹配度 LOW / non-official）",
    snippets: [
      { title: "NVIDIA Q3 财报：营收同比增 262% — Reuters", source: "reuters.com", official: false },
      { title: "NVIDIA 股价盘后波动 — CNBC", source: "cnbc.com", official: false },
      { title: "NVIDIA 财报预览 — Yahoo Finance", source: "finance.yahoo.com", official: false },
    ],
    correctionSkillId: "skill-ir-search",
    correctionSnippets: [
      { title: "NVIDIA Q3 FY2025 季度财报（10-Q）", source: "investor.nvidia.com", official: true },
      { title: "NVIDIA 投资者关系 · 财务文档", source: "investor.nvidia.com", official: true },
    ],
  },
};

export const S01_TASKS: ScenarioTask[] = [TASK_NVIDIA];

export const S01_GLOBAL: GovernanceContract[] = [
  {
    id: "GC-1000", domain: "GLOBAL", contractType: "INVARIANT", state: "ACTIVE",
    title: "Internal Finance requires Finance permission",
    summary: "Internal Financial DB 仅对持有 finance:read 权限的会话可用。",
    predicate: [{ field: "taskType", operator: "IN", value: ["*"] }],
    relations: [{ type: "PERMISSION", sourceSkillId: "skill-internal-finance" }],
    scope: { taskTypes: ["*"] }, overridePermission: false, originEvidenceIds: [],
    parentVersion: "v12", createdAt: T0 - 86400000 * 30, updatedAt: T0 - 86400000 * 30,
  },
];

export const S01_LOCAL: GovernanceContract[] = [
  {
    id: "LC-B-01", domain: "LOCAL", ownerId: "user-b", contractType: "REFINEMENT", state: "ACTIVE",
    title: "User B · 官方公告优先 IR；内部财务数据走 Internal DB",
    summary: "official_filing → IRSearch；若 session 含 internal_resource=true，则追加 Internal Financial DB。",
    predicate: [
      { field: "taskType", operator: "EQUALS", value: "official_filing" },
      { field: "sourceRequirement", operator: "EQUALS", value: "official" },
      { field: "internal_resource", operator: "EQUALS", value: true },
    ],
    relations: [{ type: "PRIORITY", sourceSkillId: "skill-ir-search", targetSkillId: "skill-web-search", direction: "OVER" }],
    scope: { userIds: ["user-b"] }, overridePermission: true,
    dependencies: {
      parentContractId: "GC-1000",
      skillVersions: { "skill-ir-search": "2.4", "skill-web-search": "3.1" },
      relationships: [{ type: "PRIORITY", sourceSkillId: "skill-ir-search", targetSkillId: "skill-web-search" }],
      contextSchemas: ["official_filing", "internal_resource"],
    },
    originEvidenceIds: ["LE-B-PREV"], parentVersion: "v18",
    createdAt: T0 - 86400000 * 4, updatedAt: T0 - 86400000 * 4,
  },
  {
    id: "LC-C-01", domain: "LOCAL", ownerId: "user-c", contractType: "REFINEMENT", state: "ACTIVE",
    title: "User C · 仅使用 Web Search（交易终端屏蔽 IR 站点）",
    summary: "official_filing 场景下强制只走 Web Search（终端网络策略限制）。",
    predicate: [
      { field: "taskType", operator: "EQUALS", value: "official_filing" },
      { field: "sourceRequirement", operator: "EQUALS", value: "official" },
    ],
    relations: [{ type: "EXCLUSION", sourceSkillId: "skill-web-search", targetSkillId: "skill-ir-search" }],
    scope: { userIds: ["user-c"] }, overridePermission: true,
    dependencies: {
      parentContractId: "GC-1000",
      skillVersions: { "skill-ir-search": "2.4", "skill-web-search": "3.1" },
      relationships: [{ type: "EXCLUSION", sourceSkillId: "skill-web-search", targetSkillId: "skill-ir-search" }],
      contextSchemas: ["official_filing"],
    },
    originEvidenceIds: ["LE-C-PREV"], parentVersion: "v18",
    createdAt: T0 - 86400000 * 2, updatedAt: T0 - 86400000 * 2,
  },
];

export const e2e01: ScenarioConfig = {
  id: "e2e-01", index: 1,
  title: "证券研究官方财报来源治理",
  shortTitle: "官方财报来源",
  industry: "证券研究",
  summary: "三位分析师查询官方财报时被通用搜索带偏，本地修正汇聚为全局优先规则，并产生退役/精化/冲突三种结局。",
  initialVersion: "v18",
  skills: S01_SKILLS, users: S01_USERS, agents: S01_AGENTS,
  globalContracts: S01_GLOBAL, localContracts: S01_LOCAL,
  platformStats: { skills: 1024, globalContracts: 248, localContractsObserved: 38125, users: 10000, agents: 24000, evidenceTotal: 121893 },
  tasks: S01_TASKS,
  evidence: (task: ScenarioTask, userId: string): ScenarioEvidenceProfile => {
    const localPredicates = userId === "user-b"
      ? [{ field: "internal_resource", operator: "EQUALS" as const, value: true }]
      : userId === "user-c"
        ? [{ field: "irSearchUnavailable", operator: "EQUALS" as const, value: true }]
        : [];
    return {
      violationType: "OfficialSourceRoutingMismatch",
      relation: {
        type: "PRIORITY", sourceSkillId: "skill-ir-search", targetSkillId: "skill-web-search", direction: "OVER",
        predicate: { field: "taskType", operator: "EQUALS", value: task.taskType },
      },
      resolution: {
        type: "SKILL_PRIORITY",
        description: "官方披露任务中，Investor Relations Search 优先于 Web Search。",
        alternateSkillId: "skill-ir-search",
        rationale: [
          "WebSearch 返回综合媒体 / 非官方来源",
          "IRSearch 返回投资者关系官网的已披露公告",
          "用户修正成功获得官方来源",
        ],
      },
      localPredicates,
      items: [
        { kind: "RESULT", label: "Required source", value: task.sourceRequirement ?? "any", expected: "official", match: "LOW" },
        { kind: "METRIC", label: "Initial selected skill", value: "skill-web-search" },
        { kind: "CORRECTION", label: "Corrected skill", value: "skill-ir-search" },
        { kind: "FEEDBACK", label: "User correction submitted", value: true, match: "HIGH" },
      ],
    };
  },
  publishes: [
    {
      contractId: "GC-1100", toVersion: "v19", contractType: "DEFAULT",
      title: "Official filing: IRSearch > WebSearch",
      summary: "官方披露任务默认优先投资者关系官网检索，通用搜索降权。",
      predicate: [
        { field: "taskType", operator: "EQUALS", value: "official_filing" },
        { field: "sourceRequirement", operator: "EQUALS", value: "official" },
      ],
      relations: [{ type: "PRIORITY", sourceSkillId: "skill-ir-search", targetSkillId: "skill-web-search", direction: "OVER" }],
      outcomes: {
        // A's new local rule → RETIRED (fully covered, generic)
        "LC-B-01": "ACTIVE_REFINEMENT", // retains internal_resource
        "LC-C-01": "CONFLICT",          // EXCLUSION opposes global PRIORITY
      },
    },
  ],
};
