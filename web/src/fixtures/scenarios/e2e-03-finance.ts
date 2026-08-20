// E2E-03 企业财务数据访问与临时授权
import type { GovernanceContract, Skill, User, Agent } from "../../domain/types";
import type { ScenarioConfig, ScenarioEvidenceProfile, ScenarioTask } from "./types";

const T0 = 1_756_000_000_000;

export const S03_SKILLS: Skill[] = [
  { id: "skill-internal-finance", name: "Internal Financial DB", description: "企业内部财务数据库（只读，需 finance:read）",
    version: "4.2", category: "Internal Data", capabilities: ["finance","internal"], status: "ACTIVE", provider: "fin.internal",
    requiredPermissions: ["finance:read"] },
  { id: "skill-report-exporter", name: "Report Exporter", description: "将结构化数据导出为脱敏报告",
    version: "1.4", category: "Output", capabilities: ["export"], status: "ACTIVE", provider: "docs.fabric" },
  { id: "skill-web-search", name: "Web Search", description: "通用公开 Web 搜索",
    version: "3.1", category: "Search", capabilities: ["web"], status: "ACTIVE", provider: "search.fabric" },
];

export const S03_USERS: User[] = [
  { id: "user-fin-mgr",   name: "吴 · 财务经理",   initials: "吴", avatarColor: "#0EA5E9", role: "Regional Finance Manager", organization: "华东财务" },
  { id: "user-fin-west",  name: "郑 · 财务经理",   initials: "郑", avatarColor: "#8B5CF6", role: "Regional Finance Manager", organization: "华南财务" },
  { id: "user-analyst",   name: "钱 · 分析师",     initials: "钱", avatarColor: "#64748B", role: "Business Analyst",        organization: "无财务权限" },
];

export const S03_AGENTS: Agent[] = S03_USERS.map((u, i) => ({
  id: `agent-${u.id}`, userId: u.id, name: ["Fin-A", "Fin-B", "Fin-C"][i],
  model: "fabric-model-4", skillIds: S03_SKILLS.map(s => s.id),
}));

const TASK_FINANCE: ScenarioTask = {
  id: "finance-analysis",
  label: "读取华东区本月费用与预算，分析偏差最大的成本中心",
  prompt: "读取华东区本月实际费用与预算，分析偏差最大的五个成本中心",
  taskType: "finance_analysis",
  sourceRequirement: "internal",
  permissions: [],
  candidates: [
    { skillId: "skill-internal-finance", plannerScore: 0.9, reason: ["相关性最高：内部财务库"] },
    { skillId: "skill-web-search", plannerScore: 0.35, reason: ["公开网无法覆盖内部费用数据"] },
  ],
  expect: {
    selectedSkillId: "skill-internal-finance",
    blockPermission: "finance:read",
    anomaly: false,
    snippets: [
      { title: "PERMISSION_BLOCK：缺少 finance:read，内部库调用前被置为不可用", source: "Global Invariant GC-3000", official: false },
    ],
    // After v21 mapping + reauth the same task succeeds:
    correctionSkillId: "skill-internal-finance",
    correctionSnippets: [
      { title: "delegated_finance_read（24h 委托）映射为 finance:read，访问放行", source: "Identity + GC-3100", official: true },
      { title: "华东区费用偏差 Top5 成本中心（部门级脱敏）", source: "Internal Financial DB", official: true },
    ],
  },
};

export const S03_TASKS: ScenarioTask[] = [TASK_FINANCE];

export const S03_GLOBAL: GovernanceContract[] = [
  {
    id: "GC-3000", domain: "GLOBAL", contractType: "INVARIANT", state: "ACTIVE",
    title: "Internal Finance requires finance:read",
    summary: "访问内部财务库必须持有 finance:read 权限；本地契约不可放宽此约束。",
    predicate: [{ field: "taskType", operator: "EQUALS", value: "finance_analysis" }],
    relations: [{ type: "PERMISSION", sourceSkillId: "skill-internal-finance",
      predicate: { field: "permission", operator: "IN", value: ["finance:read"] } }],
    scope: { taskTypes: ["finance_analysis"] }, overridePermission: false, originEvidenceIds: [],
    parentVersion: "v20", createdAt: T0 - 86400000 * 30, updatedAt: T0 - 86400000 * 30,
  },
];

export const S03_LOCAL: GovernanceContract[] = [];

export const e2e03: ScenarioConfig = {
  id: "e2e-03", index: 3,
  title: "企业财务数据访问与临时授权",
  shortTitle: "财务权限",
  industry: "企业财务",
  summary: "合法委托因权限声明未映射被误阻断；治理侧修正可信声明映射而非放宽权限，合法用户重认证后恢复，未授权者继续被阻断。",
  initialVersion: "v20",
  skills: S03_SKILLS, users: S03_USERS, agents: S03_AGENTS,
  globalContracts: S03_GLOBAL, localContracts: S03_LOCAL,
  platformStats: { skills: 1024, globalContracts: 264, localContractsObserved: 41200, users: 12000, agents: 26000, evidenceTotal: 133400 },
  tasks: S03_TASKS,
  evidence: (task: ScenarioTask, _userId: string): ScenarioEvidenceProfile => ({
    violationType: "PermissionDeclarationUnmapped",
    relation: {
      type: "PERMISSION", sourceSkillId: "skill-internal-finance",
      predicate: { field: "permission", operator: "IN", value: ["finance:read"] },
    },
    resolution: {
      type: "PERMISSION_BLOCK",
      description: "持有 24 小时 delegated_finance_read 委托，但治理 Schema 未将其映射为 finance:read，造成合法误阻断。",
      rationale: [
        "委托由集团财务负责人签发，含有效期与撤销机制",
        "Evidence 仅记录授权判定，不含财务数据",
        "修正方向是可信声明映射，而非放宽 Invariant",
      ],
    },
    localPredicates: [],
    items: [
      { kind: "RESULT", label: "Block reason", value: "missing finance:read", match: "LOW" },
      { kind: "METRIC", label: "Delegated claim present", value: "delegated_finance_read", match: "HIGH" },
      { kind: "FEEDBACK", label: "Legitimate access denied", value: true, match: "HIGH" },
    ],
  }),
  publishes: [
    {
      contractId: "GC-3100", toVersion: "v21", contractType: "INVARIANT",
      title: "Finance: delegated_finance_read maps to finance:read",
      summary: "委托有效期内，delegated_finance_read 映射为 finance:read；原 finance:read 要求不变，未授权者继续被阻断。",
      predicate: [{ field: "taskType", operator: "EQUALS", value: "finance_analysis" }],
      relations: [{ type: "PERMISSION", sourceSkillId: "skill-internal-finance",
        predicate: { field: "permission", operator: "IN", value: ["finance:read", "delegated_finance_read"] } }],
      outcomes: {},
    },
  ],
};
