# 智能体 Skill 双端协同治理 — 企业财务数据访问与临时授权（对外演示手册）

> 版本：2026-08-20 08:51 ｜ 截图均取自系统真实运行画面

## 背景

持有效委托的区域财务经理被全局不变量误阻断——旧权限 Schema 只识别 finance:read，不识别委托声明。安全边界不能放宽，但合法访问不能被误伤。

本场演示展示：一线修正如何自动上行、治理引擎如何聚合与发布、全局规则如何按依赖链落地并闭环验证。

## 一、一线遭遇问题并沉淀本地经验（用户端）

![吴 · 财务经理 · Internal Financial DB 相关性最高，但在调用前被全局不变量阻断（PERMISSION_BLOCK）。](screenshots/demo/e2e-03/02-mgr-run.png)

*吴 · 财务经理 · Internal Financial DB 相关性最高，但在调用前被全局不变量阻断（PERMISSION_BLOCK）。*

![吴 · 财务经理 · 经理提交集团财务负责人签发的 24 小时委托；会话获得 delegated_finance_read。](screenshots/demo/e2e-03/03-mgr-request.png)

*吴 · 财务经理 · 经理提交集团财务负责人签发的 24 小时委托；会话获得 delegated_finance_read。*

![吴 · 财务经理 · 重跑仍被阻断——旧治理 Schema 只识别 finance:read，造成合法误阻断。](screenshots/demo/e2e-03/04-mgr-rerun-blocked.png)

*吴 · 财务经理 · 重跑仍被阻断——旧治理 Schema 只识别 finance:read，造成合法误阻断。*

![吴 · 财务经理 · 形成不含财务数据的证据：主体、委托类型、阻断规则、失败原因。](screenshots/demo/e2e-03/05-mgr-evidence.png)

*吴 · 财务经理 · 形成不含财务数据的证据：主体、委托类型、阻断规则、失败原因。*

![郑 · 财务经理 · 另一位持委托的区域经理出现同样的合法误阻断。](screenshots/demo/e2e-03/06-west-run.png)

*郑 · 财务经理 · 另一位持委托的区域经理出现同样的合法误阻断。*

![郑 · 财务经理 · 提交委托授权。](screenshots/demo/e2e-03/07-west-request.png)

*郑 · 财务经理 · 提交委托授权。*

![郑 · 财务经理 · 证据汇聚为同一类「声明未映射」问题。](screenshots/demo/e2e-03/08-west-evidence.png)

*郑 · 财务经理 · 证据汇聚为同一类「声明未映射」问题。*

## 二、治理引擎聚合证据并发布全局规则（治理侧）

![开发者端 · 开发者审查：不是放开权限，而是把可信委托声明映射为 finance:read。](screenshots/demo/e2e-03/09-dev-cluster.png)

*开发者端 · 开发者审查：不是放开权限，而是把可信委托声明映射为 finance:read。*

![开发者端 · 生成候选：委托有效期内 delegated_finance_read 映射为 finance:read。](screenshots/demo/e2e-03/10-dev-candidate.png)

*开发者端 · 生成候选：委托有效期内 delegated_finance_read 映射为 finance:read。*

![开发者端 · 安全管理员审批，原 Invariant 不放宽。](screenshots/demo/e2e-03/11-dev-approve.png)

*开发者端 · 安全管理员审批，原 Invariant 不放宽。*

![开发者端 · 影响分析：权限 Schema 变更灰度到财务沙箱后发布。](screenshots/demo/e2e-03/12-dev-impact.png)

*开发者端 · 影响分析：权限 Schema 变更灰度到财务沙箱后发布。*

![开发者端 · 发布 v21：权限模型新增 delegated_finance_read 映射。](screenshots/demo/e2e-03/13-publish-v21.png)

*开发者端 · 发布 v21：权限模型新增 delegated_finance_read 映射。*

![开发者端 · 权限 Schema 变更下行，相关规则重验证。](screenshots/demo/e2e-03/14-propagation.png)

*开发者端 · 权限 Schema 变更下行，相关规则重验证。*

## 三、升级落地与闭环验证

![吴 · 财务经理 · 财务经理重跑：委托被映射为 finance:read，内部库调用放行，输出脱敏偏差报告。](screenshots/demo/e2e-03/15-mgr-success.png)

*吴 · 财务经理 · 财务经理重跑：委托被映射为 finance:read，内部库调用放行，输出脱敏偏差报告。*

![钱 · 分析师 · 对照：无任何委托的分析师仍被阻断——安全边界未被降低。](screenshots/demo/e2e-03/16-analyst-blocked.png)

*钱 · 分析师 · 对照：无任何委托的分析师仍被阻断——安全边界未被降低。*

## 结语

权限模型发布后，委托被映射为 finance:read，持委托经理正常放行；无任何委托的分析师依旧被阻断——安全边界未被降低一分。

*本手册由系统真实运行画面自动生成（`DEMO_MODE=presentation DEMO_SCENARIO=e2e-03 python scripts/capture_demo.py`）。*
