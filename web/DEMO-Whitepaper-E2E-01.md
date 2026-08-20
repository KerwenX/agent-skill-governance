# 智能体 Skill 双端协同治理 — 证券研究官方财报来源治理（对外演示手册）

> 版本：2026-08-20 08:48 ｜ 截图均取自系统真实运行画面

## 背景

分析师查询上市公司官方财报时，智能体默认选中通用网页搜索，返回的却是 Reuters、CNBC 等媒体摘要——数据没错，但「来源合规」的业务约束被绕过了。

本场演示展示：一线修正如何自动上行、治理引擎如何聚合与发布、全局规则如何按依赖链落地并闭环验证。

## 一、一线遭遇问题并沉淀本地经验（用户端）

![林 · 研究员 · User A 发起查询：智能体选中 Web Search，返回 Reuters/CNBC 等媒体来源，与「官方」要求不符。](screenshots/demo/e2e-01/02-a-run.png)

*林 · 研究员 · User A 发起查询：智能体选中 Web Search，返回 Reuters/CNBC 等媒体来源，与「官方」要求不符。*

![林 · 研究员 · A 修正为 IR Search，成功返回 investor.nvidia.com 官方公告。](screenshots/demo/e2e-01/03-a-correct.png)

*林 · 研究员 · A 修正为 IR Search，成功返回 investor.nvidia.com 官方公告。*

![林 · 研究员 · A 把修正结构化为本地证据。](screenshots/demo/e2e-01/04-a-build.png)

*林 · 研究员 · A 把修正结构化为本地证据。*

![林 · 研究员 · 生成本地规则：官方公告场景 IRSearch 优先于 WebSearch。](screenshots/demo/e2e-01/05-a-rule.png)

*林 · 研究员 · 生成本地规则：官方公告场景 IRSearch 优先于 WebSearch。*

![陈 · 投研助理 · User B 遇到同样问题，但其证据还含 internal_resource=true 这一特有条件。](screenshots/demo/e2e-01/06-b-run.png)

*陈 · 投研助理 · User B 遇到同样问题，但其证据还含 internal_resource=true 这一特有条件。*

![陈 · 投研助理 · B 完成修正。](screenshots/demo/e2e-01/07-b-correct.png)

*陈 · 投研助理 · B 完成修正。*

![陈 · 投研助理 · B 的证据上行。](screenshots/demo/e2e-01/08-b-build.png)

*陈 · 投研助理 · B 的证据上行。*

![陈 · 投研助理 · B 的本地规则建立。](screenshots/demo/e2e-01/09-b-rule.png)

*陈 · 投研助理 · B 的本地规则建立。*

![周 · 交易员 · User C 的终端屏蔽 IR 站点，本地规则强制走 WebSearch。](screenshots/demo/e2e-01/10-c-run.png)

*周 · 交易员 · User C 的终端屏蔽 IR 站点，本地规则强制走 WebSearch。*

![周 · 交易员 · C 提交修正证据。](screenshots/demo/e2e-01/11-c-correct.png)

*周 · 交易员 · C 提交修正证据。*

![周 · 交易员 · 第三份证据汇聚。](screenshots/demo/e2e-01/12-c-build.png)

*周 · 交易员 · 第三份证据汇聚。*

![周 · 交易员 · C 的本地规则（强制 WebSearch）建立——它将与全局规则冲突。](screenshots/demo/e2e-01/13-c-rule.png)

*周 · 交易员 · C 的本地规则（强制 WebSearch）建立——它将与全局规则冲突。*

## 二、治理引擎聚合证据并发布全局规则（治理侧）

![开发者端 · 第三幕 · 三份证据自动聚类，独立用户数=3、一致性=100%，升级评分越过阈值 → PROMOTION READY。](screenshots/demo/e2e-01/14-dev-cluster.png)

*开发者端 · 第三幕 · 三份证据自动聚类，独立用户数=3、一致性=100%，升级评分越过阈值 → PROMOTION READY。*

![开发者端 · 生成全局候选：IRSearch 优先于 WebSearch。](screenshots/demo/e2e-01/15-dev-candidate.png)

*开发者端 · 生成全局候选：IRSearch 优先于 WebSearch。*

![开发者端 · 开发者审批通过，进入契约编辑器。](screenshots/demo/e2e-01/16-dev-approve.png)

*开发者端 · 开发者审批通过，进入契约编辑器。*

![开发者端 · 影响分析：扫描出受影响本地契约。](screenshots/demo/e2e-01/17-dev-impact.png)

*开发者端 · 影响分析：扫描出受影响本地契约。*

![开发者端 · 发布全局治理 v18 → v19。](screenshots/demo/e2e-01/18-dev-publish.png)

*开发者端 · 发布全局治理 v18 → v19。*

![开发者端 · 传播监控：提交→依赖扫描→本地失效→重验证。](screenshots/demo/e2e-01/19-dev-propagation.png)

*开发者端 · 传播监控：提交→依赖扫描→本地失效→重验证。*

## 三、升级落地与闭环验证

![林 · 研究员 · A 的规则被全局完全覆盖 → RETIRED。](screenshots/demo/e2e-01/20-outcome-a.png)

*林 · 研究员 · A 的规则被全局完全覆盖 → RETIRED。*

![陈 · 投研助理 · B 保留 internal_resource 条件 → ACTIVE_REFINEMENT。](screenshots/demo/e2e-01/21-outcome-b.png)

*陈 · 投研助理 · B 保留 internal_resource 条件 → ACTIVE_REFINEMENT。*

![周 · 交易员 · C 与全局方向相反 → CONFLICT，进入冲突解决器。](screenshots/demo/e2e-01/22-outcome-c.png)

*周 · 交易员 · C 与全局方向相反 → CONFLICT，进入冲突解决器。*

![林 · 研究员 · 第五幕 · 闭环验证。](screenshots/demo/e2e-01/23-closure.png)

*林 · 研究员 · 第五幕 · 闭环验证。*

![林 · 研究员 · A 重跑同一任务，全局规则生效，直接返回官方来源。](screenshots/demo/e2e-01/24-closure-run.png)

*林 · 研究员 · A 重跑同一任务，全局规则生效，直接返回官方来源。*

## 结语

同一任务再次发起时，全局规则在技能规划阶段直接生效：IR 搜索得分升至 1.00，通用搜索降至 0.61，零人工干预直达官方来源。一条来自一线的人工修正，经过「证据上行 → 全局演化 → 局部消解」闭环，成为全团队默认可用的基础设施。

*本手册由系统真实运行画面自动生成（`DEMO_MODE=presentation DEMO_SCENARIO=e2e-01 python scripts/capture_demo.py`）。*
