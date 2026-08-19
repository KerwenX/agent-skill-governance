// ============================================================
// Demo Script — 引导式自动演示编排
// Launcher 按时间轴下发 DEMO_COMMAND，各窗口自动执行
// ============================================================
import type { GovernanceEvent } from "../domain/types";
import { eventBus, nextId } from "./eventBus";
import { orchestrator } from "./animations";

export type Target = "launcher" | "developer" | "user-a" | "user-b" | "user-c" | "all";

export interface DemoStep {
  id: string;
  /** 旁白（显示在 Launcher 控制台） */
  narration: string;
  /** 观众应该看哪个窗口 */
  focus: Target;
  /** 等待时长（毫秒，不受速度缩放影响业务，但展示节奏受影响） */
  wait?: number;
  /** 下发的命令（可选） */
  command?: { action: string; userId?: string; prompt?: string; to?: string };
  /** 命令发往哪个目标 */
  target?: Target;
}

export const DEMO_SCRIPT: DemoStep[] = [
  // ----- 第一幕：User A 遭遇问题 -----
  {
    id: "intro",
    narration: "第一幕 · 三位分析师分别在各自的智能体工作台查询上市公司官方财报。当前全局版本 v18 没有针对「官方公告」的路由规则。",
    focus: "launcher",
    wait: 4500,
  },
  {
    id: "a-run",
    narration: "User A（林·分析师）发起查询：智能体选中 Web Search，返回的却是 Reuters/CNBC 等媒体来源，与「官方」要求不符。",
    focus: "user-a",
    target: "user-a",
    command: { action: "run", prompt: "查一下英伟达最新的官方季度财报（10-Q）" },
    wait: 7000,
  },
  {
    id: "a-correct",
    narration: "A 点击「修正」，改用 Investor Relations Search，成功返回 investor.nvidia.com 的官方公告。系统识别到治理机会。",
    focus: "user-a",
    target: "user-a",
    command: { action: "correct" },
    wait: 4000,
  },
  {
    id: "a-build",
    narration: "A 把这次修正结构化为本地证据，并生成本地规则：官方公告场景下 IRSearch 优先于 WebSearch。",
    focus: "user-a",
    target: "user-a",
    command: { action: "buildEvidence" },
    wait: 3500,
  },
  {
    id: "a-create-rule",
    narration: "证据构建器自动提取上下文、技能关系、违规类型、版本依赖，一键提交并创建本地契约 LC-A。",
    focus: "user-a",
    target: "user-a",
    command: { action: "createLocalRule" },
    wait: 3500,
  },

  // ----- 第二幕：B、C 遇到同样问题 -----
  {
    id: "b-run",
    narration: "User B（陈·投研助理）遇到完全相同的问题：Web Search 返回非官方来源。",
    focus: "user-b",
    target: "user-b",
    command: { action: "run", prompt: "查一下英伟达最新的官方季度财报（10-Q）" },
    wait: 7000,
  },
  {
    id: "b-correct-build",
    narration: "B 同样修正并提交证据。注意 B 的本地规则还包含「internal_resource=true」这个用户特有条件。",
    focus: "user-b",
    target: "user-b",
    command: { action: "correct" },
    wait: 4000,
  },
  {
    id: "b-build",
    narration: "B 的证据被结构化并发送给开发者端。",
    focus: "user-b",
    target: "user-b",
    command: { action: "buildEvidence" },
    wait: 3000,
  },
  {
    id: "b-create-rule",
    narration: "B 的本地规则创建完成。",
    focus: "user-b",
    target: "user-b",
    command: { action: "createLocalRule" },
    wait: 3000,
  },
  {
    id: "c-run",
    narration: "User C（周·交易员）的终端网络策略屏蔽了 IR 站点，本地规则强制只走 Web Search。同样的官方公告任务也触发了问题。",
    focus: "user-c",
    target: "user-c",
    command: { action: "run", prompt: "查一下英伟达最新的官方季度财报（10-Q）" },
    wait: 7000,
  },
  {
    id: "c-correct-build",
    narration: "C 提交修正证据。现在三份独立证据指向同一类问题。",
    focus: "user-c",
    target: "user-c",
    command: { action: "correct" },
    wait: 4000,
  },
  {
    id: "c-build",
    narration: "C 的证据发送到开发者端，聚类即将越过升级阈值。",
    focus: "user-c",
    target: "user-c",
    command: { action: "buildEvidence" },
    wait: 3000,
  },
  {
    id: "c-create-rule",
    narration: "C 的本地规则（强制 WebSearch）已建立——它将在全局发布后与新规则产生冲突。",
    focus: "user-c",
    target: "user-c",
    command: { action: "createLocalRule" },
    wait: 3500,
  },

  // ----- 第三幕：开发者端聚合、审批、发布 -----
  {
    id: "dev-cluster",
    narration: "第三幕 · 切到开发者端。三份证据自动聚类，独立用户数=3、结果一致性=100%，升级评分 0.78 越过阈值 0.75 → PROMOTION READY。",
    focus: "developer",
    target: "developer",
    command: { action: "navigate", to: "/developer/证据" },
    wait: 5000,
  },
  {
    id: "dev-candidate",
    narration: "系统自动生成全局候选 GGC：当任务类型=官方公告时，IRSearch 优先于 WebSearch。",
    focus: "developer",
    target: "developer",
    command: { action: "openCandidate" },
    wait: 4500,
  },
  {
    id: "dev-approve",
    narration: "开发者审批通过，进入全局契约编辑器。",
    focus: "developer",
    target: "developer",
    command: { action: "approveCandidate" },
    wait: 4000,
  },
  {
    id: "dev-impact",
    narration: "影响分析：扫描依赖图，发现 3 个受影响本地契约（A、B、C 各一个）。",
    focus: "developer",
    target: "developer",
    command: { action: "runImpact" },
    wait: 5000,
  },
  {
    id: "dev-publish",
    narration: "发布全局治理 v18 → v19。依赖波沿全局契约→技能关系→本地契约逐层传播。",
    focus: "developer",
    target: "developer",
    command: { action: "publish" },
    wait: 5000,
  },
  {
    id: "dev-propagation",
    narration: "传播监控：提交 → 依赖扫描 → 本地失效 → 重验证。",
    focus: "developer",
    target: "developer",
    command: { action: "navigate", to: "/developer/propagation/DELTA-19" },
    wait: 6000,
  },

  // ----- 第四幕：三种本地结局 -----
  {
    id: "outcome-a",
    narration: "第四幕 · 三个用户窗口同时收到 v19。User A 的本地规则被全局完全覆盖 → RETIRED（退役）。",
    focus: "user-a",
    target: "user-a",
    command: { action: "navigate", to: "/user/user-a/governance" },
    wait: 4500,
  },
  {
    id: "outcome-b",
    narration: "User B 的规则包含 internal_resource 这一本地特有条件 → ACTIVE_REFINEMENT（共享部分被吸收，本地部分保留）。",
    focus: "user-b",
    target: "user-b",
    command: { action: "navigate", to: "/user/user-b/governance" },
    wait: 4500,
  },
  {
    id: "outcome-c",
    narration: "User C 的本地规则强制 WebSearch，与新全局规则方向相反 → CONFLICT，进入冲突解决器。",
    focus: "user-c",
    target: "user-c",
    command: { action: "navigate", to: "/user/user-c/conflicts/LC-C-01" },
    wait: 5000,
  },

  // ----- 第五幕：闭环验证 -----
  {
    id: "closure",
    narration: "第五幕 · 闭环验证。User A 再次运行同样的任务，这次全局规则生效：IRSearch 得分从 0.78 提升到 1.00，WebSearch 降到 0.61，IRSearch 被选中，直接返回官方来源。",
    focus: "user-a",
    target: "user-a",
    command: { action: "navigate", to: "/user/user-a" },
    wait: 2500,
  },
  {
    id: "closure-run",
    narration: "局部运行证据 → 全局治理演化 → 局部重验证与消解。专利三段式闭环完成。",
    focus: "user-a",
    target: "user-a",
    command: { action: "run", prompt: "查一下英伟达最新的官方季度财报（10-Q）" },
    wait: 7000,
  },
  {
    id: "end",
    narration: "演示结束。可在各窗口中自由查看治理状态、历史、依赖网络与重验证结果。",
    focus: "launcher",
    wait: 3000,
  },
];

export function sendCommand(target: Target, command: DemoStep["command"]) {
  if (!command) return;
  // Handlers filter on payload.userId — carry the full window id ("user-a", …),
  // otherwise every window executes every command.
  const userId = target.startsWith("user-") ? target : undefined;
  const event: GovernanceEvent = {
    eventId: nextId("evt"),
    eventType: "DEMO_COMMAND",
    timestamp: Date.now(),
    sourceDomain: target === "developer" ? "DEVELOPER" : "USER",
    sourceId: eventBus.id,
    targetDomain: target === "developer" ? "DEVELOPER" : target === "all" ? "ALL" : "USER",
    targetIds: target === "all" ? undefined : [target],
    correlationId: nextId("corr"),
    globalVersion: "v18",
    payload: userId ? { ...command, userId } : command,
  };
  eventBus.publish(event);
}

export function broadcastReset() {
  const event: GovernanceEvent = {
    eventId: nextId("evt"), eventType: "DEMO_RESET",
    timestamp: Date.now(), sourceDomain: "SYSTEM", sourceId: eventBus.id,
    targetDomain: "ALL", correlationId: nextId("corr"),
    globalVersion: "v18", payload: { reason: "demo-start" },
  };
  eventBus.publish(event);
}

export { orchestrator };
