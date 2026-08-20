// E2E-02 保险理赔扫描件治理与 PDF Skill 版本升级
import type { GovernanceContract, Skill, User, Agent } from "../../domain/types";
import type { ScenarioConfig, ScenarioEvidenceProfile, ScenarioTask } from "./types";

const T0 = 1_756_000_000_000;

export const S02_SKILLS: Skill[] = [
  { id: "skill-pdf-extraction", name: "PDF Extraction", description: "PDF 文档结构与文本抽取（2.3 不原生支持扫描件）",
    version: "2.3", category: "Document", capabilities: ["pdf","text"], status: "ACTIVE", provider: "docs.fabric" },
  { id: "skill-ocr", name: "OCR", description: "扫描件/图像 OCR 文字识别",
    version: "1.7", category: "Document", capabilities: ["image","ocr"], status: "ACTIVE", provider: "vision.fabric" },
  { id: "skill-claim-validator", name: "Claim Field Validator", description: "理赔字段召回率/质量校验",
    version: "1.2", category: "Insurance", capabilities: ["claim","validate"], status: "ACTIVE", provider: "claims.fabric" },
];

export const S02_USERS: User[] = [
  { id: "user-east",    name: "王 · 华东理赔",   initials: "王", avatarColor: "#0EA5E9", role: "Claim Adjuster", organization: "华东理赔" },
  { id: "user-south",   name: "李 · 华南理赔",   initials: "李", avatarColor: "#22C55E", role: "Claim Adjuster", organization: "华南理赔" },
  { id: "user-fax",     name: "赵 · 车险传真",   initials: "赵", avatarColor: "#F97316", role: "Claim Adjuster", organization: "车险（传真件）" },
  { id: "user-legacy",  name: "孙 · 旧插件",     initials: "孙", avatarColor: "#94A3B8", role: "Claim Adjuster", organization: "旧 OCR 插件" },
];

export const S02_AGENTS: Agent[] = S02_USERS.map((u, i) => ({
  id: `agent-${u.id}`, userId: u.id, name: ["Claim-A", "Claim-B", "Claim-C", "Claim-D"][i],
  model: "fabric-model-4", skillIds: S02_SKILLS.map(s => s.id),
}));

// Standard scanned pdf task — PDF 2.3 returns empty text → validator recall 41%
const TASK_SCANNED: ScenarioTask = {
  id: "scanned-pdf",
  label: "提取扫描版诊断证明与费用发票的理赔字段",
  prompt: "上传医院扫描版诊断证明和费用发票，提取理赔字段",
  taskType: "scanned_pdf",
  sourceRequirement: "any",
  candidates: [
    { skillId: "skill-pdf-extraction", plannerScore: 0.84, reason: ["文档类型直接命中 PDF 抽取"] },
    { skillId: "skill-ocr", plannerScore: 0.55, reason: ["图像 OCR，规划器默认作为备选"] },
  ],
  expect: {
    selectedSkillId: "skill-pdf-extraction",
    anomaly: true,
    closureVersion: "v31",
    anomalyReason: "SCAN: PDF 无文本层，字段召回率 41%（< 95% 门槛）",
    snippets: [
      { title: "发票号：缺失", source: "PDF Extraction 2.3", official: false },
      { title: "诊断：缺失", source: "PDF Extraction 2.3", official: false },
      { title: "字段召回率 41%", source: "Claim Field Validator", official: false },
    ],
    correctionSkillId: "skill-ocr",
    correctionSnippets: [
      { title: "OCR 预处理 → PDF 抽取 → 字段校验", source: "OCR 1.7 + PDF 2.3", official: true },
      { title: "字段召回率 97%", source: "Claim Field Validator", official: true },
    ],
  },
};

// Low-quality fax variant — needs stronger OCR / double enhancement
const TASK_FAX: ScenarioTask = {
  id: "fax-pdf",
  label: "提取低质量传真件理赔字段",
  prompt: "上传车险传真件，提取理赔字段",
  taskType: "scanned_pdf",
  sourceRequirement: "any",
  attributes: { image_quality: "low" },
  candidates: [
    { skillId: "skill-pdf-extraction", plannerScore: 0.82, reason: ["文档类型命中"] },
    { skillId: "skill-ocr", plannerScore: 0.58, reason: ["低质量图像需要 OCR 增强"] },
  ],
  expect: {
    selectedSkillId: "skill-pdf-extraction",
    anomaly: true,
    closureVersion: "v31",
    anomalyReason: "SCAN: 传真件无文本层且图像质量低，字段召回率 33%",
    snippets: [
      { title: "字段召回率 33%", source: "Claim Field Validator", official: false },
    ],
    correctionSkillId: "skill-ocr",
    correctionSnippets: [
      { title: "二次 OCR 增强后字段召回率 96%", source: "OCR 1.7 (enhanced)", official: true },
    ],
  },
};

export const S02_TASKS: ScenarioTask[] = [TASK_SCANNED, TASK_FAX];

export const S02_GLOBAL: GovernanceContract[] = [];

// Seed: fax team already has a stricter local ORDER rule with image_quality=low
export const S02_LOCAL: GovernanceContract[] = [
  {
    id: "LC-FAX-01", domain: "LOCAL", ownerId: "user-fax", contractType: "REFINEMENT", state: "ACTIVE",
    title: "User 传真件 · 低质量扫描先 OCR 增强再抽取",
    summary: "image_quality=low 时，OCR（增强参数）BEFORE PDF Extraction。",
    predicate: [
      { field: "taskType", operator: "EQUALS", value: "scanned_pdf" },
      { field: "image_quality", operator: "EQUALS", value: "low" },
    ],
    relations: [{ type: "ORDER", sourceSkillId: "skill-ocr", targetSkillId: "skill-pdf-extraction" }],
    scope: { userIds: ["user-fax"] }, overridePermission: true,
    dependencies: {
      parentContractId: "GC-1000",
      skillVersions: { "skill-pdf-extraction": "2.3", "skill-ocr": "1.7" },
      relationships: [{ type: "ORDER", sourceSkillId: "skill-ocr", targetSkillId: "skill-pdf-extraction" }],
      contextSchemas: ["scanned_pdf", "image_quality"],
    },
    originEvidenceIds: ["LE-FAX-PREV"], parentVersion: "v30",
    createdAt: T0 - 86400000 * 3, updatedAt: T0 - 86400000 * 3,
  },
  {
    id: "LC-LEGACY-01", domain: "LOCAL", ownerId: "user-legacy", contractType: "REFINEMENT", state: "ACTIVE",
    title: "User 旧插件 · 强制调用已停用的 OCR 1.5",
    summary: "旧插件本地规则绑定 OCR 1.5；v32 只允许 OCR 1.7，版本范围冲突。",
    predicate: [{ field: "taskType", operator: "EQUALS", value: "scanned_pdf" }],
    relations: [{ type: "ORDER", sourceSkillId: "skill-ocr", targetSkillId: "skill-pdf-extraction" }],
    scope: { userIds: ["user-legacy"] }, overridePermission: true,
    dependencies: {
      parentContractId: "GC-1000",
      skillVersions: { "skill-ocr": "1.5", "skill-pdf-extraction": "2.3" },
      relationships: [{ type: "ORDER", sourceSkillId: "skill-ocr", targetSkillId: "skill-pdf-extraction" }],
      contextSchemas: ["scanned_pdf"],
    },
    originEvidenceIds: ["LE-LEGACY-PREV"], parentVersion: "v30",
    createdAt: T0 - 86400000 * 10, updatedAt: T0 - 86400000 * 10,
  },
];

export const e2e02: ScenarioConfig = {
  id: "e2e-02", index: 2,
  title: "保险理赔扫描件治理与 PDF Skill 升级",
  shortTitle: "理赔扫描件",
  industry: "保险理赔",
  summary: "局部 OCR 顺序修复先升为全局临时规则 v31；PDF 2.4 原生支持扫描件后，v32 改为直读+低置信度回退，并处理旧 OCR 插件冲突。",
  initialVersion: "v30",
  skills: S02_SKILLS, users: S02_USERS, agents: S02_AGENTS,
  globalContracts: S02_GLOBAL, localContracts: S02_LOCAL,
  platformStats: { skills: 860, globalContracts: 132, localContractsObserved: 12480, users: 6200, agents: 9800, evidenceTotal: 54210 },
  tasks: S02_TASKS,
  evidence: (task: ScenarioTask, userId: string): ScenarioEvidenceProfile => {
    const localPredicates = userId === "user-fax"
      ? [{ field: "image_quality", operator: "EQUALS" as const, value: "low" }]
      : [];
    return {
      violationType: "ScannedPDFMissingPreprocess",
      relation: {
        type: "ORDER", sourceSkillId: "skill-ocr", targetSkillId: "skill-pdf-extraction",
        predicate: { field: "taskType", operator: "EQUALS", value: task.taskType },
      },
      resolution: {
        type: "REORDER",
        description: "scanned_pdf 需要先 OCR 再进行 PDF 抽取；低置信度时转人工。",
        alternateSkillId: "skill-ocr",
        rationale: ["PDF Extraction 2.3 不原生支持扫描件", "先 OCR 后字段召回率提升至 97%"],
      },
      localPredicates,
      items: [
        { kind: "METRIC", label: "Field recall before", value: "41%", expected: ">=95%", match: "LOW" },
        { kind: "METRIC", label: "Initial selected skill", value: "skill-pdf-extraction" },
        { kind: "CORRECTION", label: "Corrected flow", value: "OCR -> PDF Extraction" },
        { kind: "RESULT", label: "Field recall after", value: "97%", match: "HIGH" },
      ],
    };
  },
  publishes: [
    {
      // First global release: temporary ORDER rule for PDF 2.3
      contractId: "GC-2100", toVersion: "v31", contractType: "DEFAULT",
      title: "Scanned PDF: OCR → PDF Extraction (2.3)",
      summary: "对 PDF Extraction 2.3 的 scanned_pdf 输入，先 OCR 再抽取（临时全局默认）。",
      predicate: [{ field: "taskType", operator: "EQUALS", value: "scanned_pdf" }],
      relations: [{ type: "ORDER", sourceSkillId: "skill-ocr", targetSkillId: "skill-pdf-extraction" }],
      outcomes: {
        // generic revalidation: standard ORDER rules → RETIRED, fax (image_quality=low) → ACTIVE_REFINEMENT
      },
    },
    {
      // Second release: PDF 2.4 ships native scan support → direct read, fallback OCR only at low confidence
      contractId: "GC-2101", toVersion: "v32", contractType: "DEFAULT",
      title: "Scanned PDF: PDF 2.4 direct read, low-confidence OCR fallback",
      summary: "PDF Extraction 2.4 原生扫描识别；标准扫描件直读，native_confidence<0.92 时回退 OCR。",
      predicate: [{ field: "taskType", operator: "EQUALS", value: "scanned_pdf" }],
      relations: [{ type: "FALLBACK", sourceSkillId: "skill-pdf-extraction", targetSkillId: "skill-ocr" }],
      changedSkills: ["skill-pdf-extraction@2.4"],
      outcomes: {
        // Legacy rule pins OCR 1.5, which is outside the v32 allowed version → CONFLICT.
        "LC-LEGACY-01": "CONFLICT",
      },
    },
  ],
};
