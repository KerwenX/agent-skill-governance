// ============================================================
// Demo Scripts — one guided script per scenario.
// Launcher opens the scenario's windows and walks its steps.
// ============================================================
import type { GovernanceEvent } from "../domain/types";
import { eventBus, nextId } from "./eventBus";

export type Target = "launcher" | "developer" | "all" | string; // string = user window key e.g. "user-a"

export interface DemoStep {
  id: string;
  narration: string;
  focus: Target;
  wait?: number;
  command?: { action: string; userId?: string; prompt?: string; to?: string; task?: string; skillId?: string; version?: string; permissions?: string[] };
  target?: Target;
}

export interface DemoWindow {
  key: string;            // "developer" or "user-<id>"
  kind: "developer" | "user";
  userId?: string;
  label: string;
  sub: string;
  color: string;
  initials?: string;
  w: number;
  h: number;
}

export interface DemoScript {
  scenarioId: string;
  windows: DemoWindow[];
  steps: DemoStep[];
}

// ----- E2E-01 证券财报来源 -----
const s01: DemoScript = {
  scenarioId: "e2e-01",
  windows: [
    { key: "developer", kind: "developer", label: "开发者端", sub: "/developer", color: "#2A48B8", w: 1440, h: 900 },
    { key: "user-a", kind: "user", userId: "user-a", label: "林 · 研究员",   sub: "/user/user-a", color: "#5B82F6", initials: "林", w: 760, h: 900 },
    { key: "user-b", kind: "user", userId: "user-b", label: "陈 · 投研助理", sub: "/user/user-b", color: "#8B5CF6", initials: "陈", w: 760, h: 900 },
    { key: "user-c", kind: "user", userId: "user-c", label: "周 · 交易员",   sub: "/user/user-c", color: "#F59E0B", initials: "周", w: 760, h: 900 },
  ],
  steps: [
    { id: "intro", focus: "launcher", wait: 3500,
      narration: "第一幕 · 三位分析师查询上市公司官方财报。全局版本 v18 尚无「官方公告」优先规则。" },
    { id: "a-run", focus: "user-a", target: "user-a",
      command: { action: "run", prompt: "查一下英伟达最新的官方季度财报（10-Q）" }, wait: 6500,
      narration: "User A 发起查询：智能体选中 Web Search，返回 Reuters/CNBC 等媒体来源，与「官方」要求不符。" },
    { id: "a-correct", focus: "user-a", target: "user-a", command: { action: "correct" }, wait: 3500,
      narration: "A 修正为 IR Search，成功返回 investor.nvidia.com 官方公告。" },
    { id: "a-build", focus: "user-a", target: "user-a", command: { action: "buildEvidence" }, wait: 3000,
      narration: "A 把修正结构化为本地证据。" },
    { id: "a-rule", focus: "user-a", target: "user-a", command: { action: "createLocalRule" }, wait: 2500,
      narration: "生成本地规则：官方公告场景 IRSearch 优先于 WebSearch。" },

    { id: "b-run", focus: "user-b", target: "user-b",
      command: { action: "run", prompt: "查一下英伟达最新的官方季度财报（10-Q）" }, wait: 6500,
      narration: "User B 遇到同样问题，但其证据还含 internal_resource=true 这一特有条件。" },
    { id: "b-correct", focus: "user-b", target: "user-b", command: { action: "correct" }, wait: 3500, narration: "B 完成修正。" },
    { id: "b-build", focus: "user-b", target: "user-b", command: { action: "buildEvidence" }, wait: 2500, narration: "B 的证据上行。" },
    { id: "b-rule", focus: "user-b", target: "user-b", command: { action: "createLocalRule" }, wait: 2500, narration: "B 的本地规则建立。" },

    { id: "c-run", focus: "user-c", target: "user-c",
      command: { action: "run", prompt: "查一下英伟达最新的官方季度财报（10-Q）" }, wait: 6500,
      narration: "User C 的终端屏蔽 IR 站点，本地规则强制走 WebSearch。" },
    { id: "c-correct", focus: "user-c", target: "user-c", command: { action: "correct" }, wait: 3500, narration: "C 提交修正证据。" },
    { id: "c-build", focus: "user-c", target: "user-c", command: { action: "buildEvidence" }, wait: 2500, narration: "第三份证据汇聚。" },
    { id: "c-rule", focus: "user-c", target: "user-c", command: { action: "createLocalRule" }, wait: 2500,
      narration: "C 的本地规则（强制 WebSearch）建立——它将与全局规则冲突。" },

    { id: "dev-cluster", focus: "developer", target: "developer", command: { action: "navigate", to: "/developer/证据" }, wait: 4500,
      narration: "第三幕 · 三份证据自动聚类，独立用户数=3、一致性=100%，升级评分越过阈值 → PROMOTION READY。" },
    { id: "dev-candidate", focus: "developer", target: "developer", command: { action: "openCandidate" }, wait: 4000, narration: "生成全局候选：IRSearch 优先于 WebSearch。" },
    { id: "dev-approve", focus: "developer", target: "developer", command: { action: "approveCandidate" }, wait: 3500, narration: "开发者审批通过，进入契约编辑器。" },
    { id: "dev-impact", focus: "developer", target: "developer", command: { action: "runImpact" }, wait: 4500, narration: "影响分析：扫描出受影响本地契约。" },
    { id: "dev-publish", focus: "developer", target: "developer", command: { action: "publish" }, wait: 4500, narration: "发布全局治理 v18 → v19。" },
    { id: "dev-propagation", focus: "developer", target: "developer", command: { action: "navigate", to: "/developer/propagation/DELTA-19" }, wait: 5000, narration: "传播监控：提交→依赖扫描→本地失效→重验证。" },

    { id: "outcome-a", focus: "user-a", target: "user-a", command: { action: "navigate", to: "/user/user-a/governance" }, wait: 3500, narration: "A 的规则被全局完全覆盖 → RETIRED。" },
    { id: "outcome-b", focus: "user-b", target: "user-b", command: { action: "navigate", to: "/user/user-b/governance" }, wait: 3500, narration: "B 保留 internal_resource 条件 → ACTIVE_REFINEMENT。" },
    { id: "outcome-c", focus: "user-c", target: "user-c", command: { action: "navigate", to: "/user/user-c/conflicts/LC-C-01" }, wait: 4000, narration: "C 与全局方向相反 → CONFLICT，进入冲突解决器。" },

    { id: "closure", focus: "user-a", target: "user-a", command: { action: "navigate", to: "/user/user-a" }, wait: 2000, narration: "第五幕 · 闭环验证。" },
    { id: "closure-run", focus: "user-a", target: "user-a",
      command: { action: "run", prompt: "查一下英伟达最新的官方季度财报（10-Q）" }, wait: 6000,
      narration: "A 重跑同一任务，全局规则生效，直接返回官方来源。" },
    { id: "end", focus: "launcher", wait: 2500, narration: "E2E-01 演示结束。" },
  ],
};

// ----- E2E-02 理赔扫描件 / PDF 升级 -----
const s02: DemoScript = {
  scenarioId: "e2e-02",
  windows: [
    { key: "developer", kind: "developer", label: "开发者端", sub: "/developer", color: "#2A48B8", w: 1440, h: 900 },
    { key: "user-east",  kind: "user", userId: "user-east",  label: "王 · 华东理赔", sub: "/user/user-east",  color: "#0EA5E9", initials: "王", w: 760, h: 900 },
    { key: "user-south", kind: "user", userId: "user-south", label: "李 · 华南理赔", sub: "/user/user-south", color: "#22C55E", initials: "李", w: 760, h: 900 },
    { key: "user-fax",   kind: "user", userId: "user-fax",   label: "赵 · 车险传真", sub: "/user/user-fax",   color: "#F97316", initials: "赵", w: 760, h: 900 },
    { key: "user-legacy",kind: "user", userId: "user-legacy",label: "孙 · 旧插件",   sub: "/user/user-legacy",color: "#94A3B8", initials: "孙", w: 760, h: 900 },
  ],
  steps: [
    { id: "intro", focus: "launcher", wait: 3500,
      narration: "E2E-02 · 三个理赔团队处理扫描件。PDF Extraction 2.3 不原生支持扫描件，字段召回率仅 41%。" },
    { id: "east-run", focus: "user-east", target: "user-east", command: { action: "run", task: "scanned-pdf" }, wait: 6500,
      narration: "华东团队上传扫描诊断证明：直接 PDF 抽取返回空文本/字段缺失。" },
    { id: "east-correct", focus: "user-east", target: "user-east", command: { action: "correct" }, wait: 3500,
      narration: "改为先 OCR 再 PDF 抽取，召回率提升到 97%。" },
    { id: "east-build", focus: "user-east", target: "user-east", command: { action: "buildEvidence" }, wait: 2500, narration: "结构化证据上行。" },
    { id: "east-rule", focus: "user-east", target: "user-east", command: { action: "createLocalRule" }, wait: 2500, narration: "本地顺序规则：OCR BEFORE PDF。" },

    { id: "south-run", focus: "user-south", target: "user-south", command: { action: "run", task: "scanned-pdf" }, wait: 6500, narration: "华南团队出现相同问题。" },
    { id: "south-correct", focus: "user-south", target: "user-south", command: { action: "correct" }, wait: 3500, narration: "同样改为 OCR 预处理。" },
    { id: "south-build", focus: "user-south", target: "user-south", command: { action: "buildEvidence" }, wait: 2500, narration: "证据上行。" },
    { id: "south-rule", focus: "user-south", target: "user-south", command: { action: "createLocalRule" }, wait: 2500, narration: "本地规则建立。" },

    { id: "fax-run", focus: "user-fax", target: "user-fax", command: { action: "run", task: "fax-pdf" }, wait: 6500,
      narration: "车险传真件图像质量更低，需要二次 OCR 增强。" },
    { id: "fax-correct", focus: "user-fax", target: "user-fax", command: { action: "correct" }, wait: 3500, narration: "增强 OCR 后召回率 96%。" },
    { id: "fax-build", focus: "user-fax", target: "user-fax", command: { action: "buildEvidence" }, wait: 2500, narration: "证据携带 image_quality=low 特有条件。" },

    { id: "dev-cluster", focus: "developer", target: "developer", command: { action: "navigate", to: "/developer/证据" }, wait: 4500,
      narration: "治理侧按 PDF 2.3 / OCR 1.7 版本聚类，确认跨团队共性。" },
    { id: "dev-candidate", focus: "developer", target: "developer", command: { action: "openCandidate" }, wait: 4000, narration: "生成全局候选：scanned_pdf 先 OCR 再抽取。" },
    { id: "dev-approve", focus: "developer", target: "developer", command: { action: "approveCandidate" }, wait: 3500, narration: "审批通过。" },
    { id: "dev-impact", focus: "developer", target: "developer", command: { action: "runImpact" }, wait: 4500, narration: "影响分析：标准团队规则将被覆盖，传真件规则保留细化。" },
    { id: "publish-v31", focus: "developer", target: "developer", command: { action: "publish" }, wait: 4500,
      narration: "发布临时全局规则 v31：scanned_pdf → OCR → PDF 2.3。" },
    { id: "propagation-v31", focus: "developer", target: "developer", command: { action: "navigate", to: "/developer/propagation/DELTA-31" }, wait: 4500,
      narration: "传播：华东/华南规则退役，传真件保持 ACTIVE_REFINEMENT。" },

    { id: "upgrade", focus: "developer", target: "developer", command: { action: "applyUpgrade", skillId: "skill-pdf-extraction", version: "2.4" }, wait: 3000,
      narration: "Skill 团队发布 PDF Extraction 2.4，原生支持扫描件。" },
    { id: "publish-v32", focus: "developer", target: "developer", command: { action: "publish" }, wait: 4500,
      narration: "影子回放后发布 v32：标准扫描件直读 2.4，native_confidence<0.92 才回退 OCR。" },
    { id: "propagation-v32", focus: "developer", target: "developer", command: { action: "navigate", to: "/developer/propagation/DELTA-32" }, wait: 4500,
      narration: "第二轮重验证：旧 OCR 1.5 插件用户因版本范围不兼容进入 CONFLICT。" },
    { id: "legacy-conflict", focus: "user-legacy", target: "user-legacy", command: { action: "navigate", to: "/user/user-legacy/governance" }, wait: 3500,
      narration: "旧插件用户需升级插件或转人工，不能继续绑定已停用版本。" },
    { id: "closure", focus: "user-east", target: "user-east", command: { action: "run", task: "scanned-pdf" }, wait: 6000,
      narration: "闭环：华东重跑样本，标准扫描件从三步缩短为两步，字段准确率保持。" },
    { id: "end", focus: "launcher", wait: 2500, narration: "E2E-02 演示结束。" },
  ],
};

// ----- E2E-03 财务权限 / 临时授权 -----
const s03: DemoScript = {
  scenarioId: "e2e-03",
  windows: [
    { key: "developer", kind: "developer", label: "开发者端", sub: "/developer", color: "#2A48B8", w: 1440, h: 900 },
    { key: "user-fin-mgr",  kind: "user", userId: "user-fin-mgr",  label: "吴 · 财务经理", sub: "/user/user-fin-mgr",  color: "#0EA5E9", initials: "吴", w: 760, h: 900 },
    { key: "user-fin-west", kind: "user", userId: "user-fin-west", label: "郑 · 财务经理", sub: "/user/user-fin-west", color: "#8B5CF6", initials: "郑", w: 760, h: 900 },
    { key: "user-analyst",  kind: "user", userId: "user-analyst",  label: "钱 · 分析师",   sub: "/user/user-analyst",  color: "#64748B", initials: "钱", w: 760, h: 900 },
  ],
  steps: [
    { id: "intro", focus: "launcher", wait: 3500,
      narration: "E2E-03 · 区域财务经理想读取内部费用数据。全局不变量要求 finance:read，当前会话无权限。" },
    { id: "mgr-run", focus: "user-fin-mgr", target: "user-fin-mgr", command: { action: "run", task: "finance-analysis" }, wait: 6000,
      narration: "Internal Financial DB 相关性最高，但在调用前被全局不变量阻断（PERMISSION_BLOCK）。" },
    { id: "mgr-request", focus: "user-fin-mgr", target: "user-fin-mgr", command: { action: "requestGrant" }, wait: 2500,
      narration: "经理提交集团财务负责人签发的 24 小时委托；会话获得 delegated_finance_read。" },
    { id: "mgr-rerun-blocked", focus: "user-fin-mgr", target: "user-fin-mgr", command: { action: "run", task: "finance-analysis" }, wait: 5500,
      narration: "重跑仍被阻断——旧治理 Schema 只识别 finance:read，造成合法误阻断。" },
    { id: "mgr-evidence", focus: "user-fin-mgr", target: "user-fin-mgr", command: { action: "buildEvidence" }, wait: 2500,
      narration: "形成不含财务数据的证据：主体、委托类型、阻断规则、失败原因。" },

    { id: "west-run", focus: "user-fin-west", target: "user-fin-west", command: { action: "run", task: "finance-analysis" }, wait: 5500, narration: "另一位持委托的区域经理出现同样的合法误阻断。" },
    { id: "west-request", focus: "user-fin-west", target: "user-fin-west", command: { action: "requestGrant" }, wait: 2000, narration: "提交委托授权。" },
    { id: "west-evidence", focus: "user-fin-west", target: "user-fin-west", command: { action: "buildEvidence" }, wait: 2500, narration: "证据汇聚为同一类「声明未映射」问题。" },

    { id: "dev-cluster", focus: "developer", target: "developer", command: { action: "navigate", to: "/developer/证据" }, wait: 4500,
      narration: "开发者审查：不是放开权限，而是把可信委托声明映射为 finance:read。" },
    { id: "dev-candidate", focus: "developer", target: "developer", command: { action: "openCandidate" }, wait: 4000, narration: "生成候选：委托有效期内 delegated_finance_read 映射为 finance:read。" },
    { id: "dev-approve", focus: "developer", target: "developer", command: { action: "approveCandidate" }, wait: 3500, narration: "安全管理员审批，原 Invariant 不放宽。" },
    { id: "dev-impact", focus: "developer", target: "developer", command: { action: "runImpact" }, wait: 4000, narration: "影响分析：权限 Schema 变更灰度到财务沙箱后发布。" },
    { id: "publish-v21", focus: "developer", target: "developer", command: { action: "publish" }, wait: 4500, narration: "发布 v21：权限模型新增 delegated_finance_read 映射。" },
    { id: "propagation", focus: "developer", target: "developer", command: { action: "navigate", to: "/developer/propagation/DELTA-21" }, wait: 4000, narration: "权限 Schema 变更下行，相关规则重验证。" },

    { id: "mgr-success", focus: "user-fin-mgr", target: "user-fin-mgr", command: { action: "run", task: "finance-analysis" }, wait: 6000,
      narration: "财务经理重跑：委托被映射为 finance:read，内部库调用放行，输出脱敏偏差报告。" },
    { id: "analyst-blocked", focus: "user-analyst", target: "user-analyst", command: { action: "run", task: "finance-analysis" }, wait: 5500,
      narration: "对照：无任何委托的分析师仍被阻断——安全边界未被降低。" },
    { id: "end", focus: "launcher", wait: 2500, narration: "E2E-03 演示结束。" },
  ],
};

export const DEMO_SCRIPTS: Record<string, DemoScript> = {
  "e2e-01": s01, "e2e-02": s02, "e2e-03": s03,
};

export function sendCommand(target: Target, command: DemoStep["command"]) {
  if (!command) return;
  // Carry the full window id ("user-a", …) — handlers compare against route userId.
  const userId = target.startsWith("user-") ? target : undefined;
  const event: GovernanceEvent = {
    eventId: nextId("evt"),
    eventType: "DEMO_COMMAND",
    timestamp: Date.now(),
    sourceDomain: target === "developer" ? "DEVELOPER" : "USER",
    sourceId: eventBus.id,
    targetDomain: target === "developer" ? "DEVELOPER" : target === "all" || target === "launcher" ? "ALL" : "USER",
    targetIds: target === "all" || target === "launcher" ? undefined : [target],
    correlationId: nextId("corr"),
    globalVersion: "v0",
    payload: userId ? { ...command, userId } : command,
  };
  eventBus.publish(event);
}

export function broadcastScenario(scenarioId: string) {
  const event: GovernanceEvent = {
    eventId: nextId("evt"), eventType: "SCENARIO_CHANGED",
    timestamp: Date.now(), sourceDomain: "SYSTEM", sourceId: eventBus.id,
    targetDomain: "ALL", correlationId: nextId("corr"),
    globalVersion: "v0", payload: { scenarioId },
  };
  eventBus.publish(event);
}

export function broadcastReset() {
  const event: GovernanceEvent = {
    eventId: nextId("evt"), eventType: "DEMO_RESET",
    timestamp: Date.now(), sourceDomain: "SYSTEM", sourceId: eventBus.id,
    targetDomain: "ALL", correlationId: nextId("corr"),
    globalVersion: "v0", payload: { reason: "demo-start" },
  };
  eventBus.publish(event);
}
