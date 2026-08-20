# 智能体 Skill 双端协同治理 — 保险理赔扫描件治理与 PDF Skill 升级（对外演示手册）

> 版本：2026-08-20 08:50 ｜ 截图均取自系统真实运行画面

## 背景

理赔团队上传扫描件时，PDF 抽取直接返回空字段（召回率仅 41%）。一线先 OCR 再抽取的修正经验，如何变成全团队默认流程，并在技能升级后自动收敛版本冲突？

本场演示展示：一线修正如何自动上行、治理引擎如何聚合与发布、全局规则如何按依赖链落地并闭环验证。

## 一、一线遭遇问题并沉淀本地经验（用户端）

![王 · 华东理赔 · 华东团队上传扫描诊断证明：直接 PDF 抽取返回空文本/字段缺失。](screenshots/demo/e2e-02/02-east-run.png)

*王 · 华东理赔 · 华东团队上传扫描诊断证明：直接 PDF 抽取返回空文本/字段缺失。*

![王 · 华东理赔 · 改为先 OCR 再 PDF 抽取，召回率提升到 97%。](screenshots/demo/e2e-02/03-east-correct.png)

*王 · 华东理赔 · 改为先 OCR 再 PDF 抽取，召回率提升到 97%。*

![王 · 华东理赔 · 结构化证据上行。](screenshots/demo/e2e-02/04-east-build.png)

*王 · 华东理赔 · 结构化证据上行。*

![王 · 华东理赔 · 本地顺序规则：OCR BEFORE PDF。](screenshots/demo/e2e-02/05-east-rule.png)

*王 · 华东理赔 · 本地顺序规则：OCR BEFORE PDF。*

![李 · 华南理赔 · 华南团队出现相同问题。](screenshots/demo/e2e-02/06-south-run.png)

*李 · 华南理赔 · 华南团队出现相同问题。*

![李 · 华南理赔 · 同样改为 OCR 预处理。](screenshots/demo/e2e-02/07-south-correct.png)

*李 · 华南理赔 · 同样改为 OCR 预处理。*

![李 · 华南理赔 · 证据上行。](screenshots/demo/e2e-02/08-south-build.png)

*李 · 华南理赔 · 证据上行。*

![李 · 华南理赔 · 本地规则建立。](screenshots/demo/e2e-02/09-south-rule.png)

*李 · 华南理赔 · 本地规则建立。*

![赵 · 车险传真 · 车险传真件图像质量更低，需要二次 OCR 增强。](screenshots/demo/e2e-02/10-fax-run.png)

*赵 · 车险传真 · 车险传真件图像质量更低，需要二次 OCR 增强。*

![赵 · 车险传真 · 增强 OCR 后召回率 96%。](screenshots/demo/e2e-02/11-fax-correct.png)

*赵 · 车险传真 · 增强 OCR 后召回率 96%。*

![赵 · 车险传真 · 证据携带 image_quality=low 特有条件。](screenshots/demo/e2e-02/12-fax-build.png)

*赵 · 车险传真 · 证据携带 image_quality=low 特有条件。*

## 二、治理引擎聚合证据并发布全局规则（治理侧）

![开发者端 · 治理侧按 PDF 2.3 / OCR 1.7 版本聚类，确认跨团队共性。](screenshots/demo/e2e-02/13-dev-cluster.png)

*开发者端 · 治理侧按 PDF 2.3 / OCR 1.7 版本聚类，确认跨团队共性。*

![开发者端 · 生成全局候选：scanned_pdf 先 OCR 再抽取。](screenshots/demo/e2e-02/14-dev-candidate.png)

*开发者端 · 生成全局候选：scanned_pdf 先 OCR 再抽取。*

![开发者端 · 审批通过。](screenshots/demo/e2e-02/15-dev-approve.png)

*开发者端 · 审批通过。*

![开发者端 · 影响分析：标准团队规则将被覆盖，传真件规则保留细化。](screenshots/demo/e2e-02/16-dev-impact.png)

*开发者端 · 影响分析：标准团队规则将被覆盖，传真件规则保留细化。*

![开发者端 · 发布临时全局规则 v31：scanned_pdf → OCR → PDF 2.3。](screenshots/demo/e2e-02/17-publish-v31.png)

*开发者端 · 发布临时全局规则 v31：scanned_pdf → OCR → PDF 2.3。*

![开发者端 · 传播：华东/华南规则退役，传真件保持 ACTIVE_REFINEMENT。](screenshots/demo/e2e-02/18-propagation-v31.png)

*开发者端 · 传播：华东/华南规则退役，传真件保持 ACTIVE_REFINEMENT。*

![开发者端 · Skill 团队发布 PDF Extraction 2.4，原生支持扫描件。](screenshots/demo/e2e-02/19-upgrade.png)

*开发者端 · Skill 团队发布 PDF Extraction 2.4，原生支持扫描件。*

![开发者端 · 影子回放后发布 v32：标准扫描件直读 2.4，native_confidence<0.92 才回退 OCR。](screenshots/demo/e2e-02/20-publish-v32.png)

*开发者端 · 影子回放后发布 v32：标准扫描件直读 2.4，native_confidence<0.92 才回退 OCR。*

![开发者端 · 第二轮重验证：旧 OCR 1.5 插件用户因版本范围不兼容进入 CONFLICT。](screenshots/demo/e2e-02/21-propagation-v32.png)

*开发者端 · 第二轮重验证：旧 OCR 1.5 插件用户因版本范围不兼容进入 CONFLICT。*

## 三、升级落地与闭环验证

![孙 · 旧插件 · 旧插件用户需升级插件或转人工，不能继续绑定已停用版本。](screenshots/demo/e2e-02/22-legacy-conflict.png)

*孙 · 旧插件 · 旧插件用户需升级插件或转人工，不能继续绑定已停用版本。*

![王 · 华东理赔 · 闭环：华东重跑样本，标准扫描件从三步缩短为两步，字段准确率保持。](screenshots/demo/e2e-02/23-closure.png)

*王 · 华东理赔 · 闭环：华东重跑样本，标准扫描件从三步缩短为两步，字段准确率保持。*

## 结语

PDF Extraction 2.4 发布后，标准扫描件直读成功；仍绑定旧 OCR 1.5 的插件用户被自动标记冲突并进入重验证——升级没有破坏任何人的合规基线。

*本手册由系统真实运行画面自动生成（`DEMO_MODE=presentation DEMO_SCENARIO=e2e-02 python scripts/capture_demo.py`）。*
