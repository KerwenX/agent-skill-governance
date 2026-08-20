// E2E-02 保险理赔扫描件治理与 PDF Skill 版本升级 — evidence 生成逻辑
// （数据存储于 web/data/db.json，经 src/data/db.ts 加载）
import type { ScenarioEvidenceProfile, ScenarioTask } from "./types";

export function e2e02Evidence(task: ScenarioTask, userId: string): ScenarioEvidenceProfile {
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
}
