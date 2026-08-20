// E2E-03 企业财务数据访问与临时授权 — evidence 生成逻辑
// （数据存储于 web/data/db.json，经 src/data/db.ts 加载）
import type { ScenarioEvidenceProfile, ScenarioTask } from "./types";

export function e2e03Evidence(task: ScenarioTask, _userId: string): ScenarioEvidenceProfile {
  return {
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
  };
}
