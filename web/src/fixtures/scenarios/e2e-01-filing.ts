// E2E-01 证券研究官方财报来源治理 — evidence 生成逻辑
// （skills/users/contracts/tasks/script 等数据存储在 web/data/db.json，经 src/data/db.ts 加载）
import type { ScenarioEvidenceProfile, ScenarioTask } from "./types";

export function e2e01Evidence(task: ScenarioTask, userId: string): ScenarioEvidenceProfile {
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
}
