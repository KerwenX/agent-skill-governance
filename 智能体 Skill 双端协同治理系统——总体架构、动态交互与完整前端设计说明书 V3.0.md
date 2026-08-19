# 智能体 Skill 双端协同治理系统
## 总体架构、动态交互与完整前端设计说明书 V3.0

---

# 第一部分：总体设计

# 1. 产品核心定位

本系统不是一个静态的 Skill 管理后台，而是一套能够把 **Skill Governance 的产生、传播、演化和消解过程视觉化** 的双端协同治理系统。

系统由两个正式产品端组成：

```text
Developer Console
        ⇅
Governance Interaction Protocol
        ⇅
User Console A
User Console B
User Console C
...
User Console N
```

Developer Console 代表：

> **共享 Skill 生态的全局治理域**

User Console 代表：

> **特定用户、Agent、Task、Session 与真实 Runtime 环境下的局部治理域**

专利明确将二者定义为信息可见范围、治理作用范围不同的两个逻辑治理域。

因此整个产品的第一原则是：

> **双端必须真正独立，但治理过程必须持续互相感知。**

---

# 2. 顶层产品目标

系统必须让第一次看到产品的人，可以通过交互自然理解四件事。

## 2.1 Governance 从哪里来

不是开发者凭空写规则。

而是：

```text
User Runtime
↓
Runtime Evidence
↓
Local Governance
↓
Cross-user Evidence
↓
Global Governance
```

---

## 2.2 Local 为什么不能直接变 Global

单一用户的特殊权限、资源、环境或任务不能代表全部用户。

因此必须：

```text
Local Evidence
↓
Cross-user Aggregation
↓
Promotion Evaluation
↓
Global Candidate
```

专利对此定义了基于多个独立用户端证据的重复性、覆盖范围、一致性、证据质量等条件升级机制。

---

## 2.3 Global 变化为什么会影响 Local

Local Contract 不是孤立规则。

它保存：

```text
ParentContract
SkillVersion
Relationship
ContextSchema
```

因此 Global、Skill Version 或 Relationship 变化以后，系统能够沿依赖主动定位受影响 Local Contract。

---

## 2.4 Local 为什么不是简单覆盖或删除

Global 更新后：

```text
ACTIVE
↓
STALE
↓
REVALIDATING
↓
RETIRED
/
ACTIVE_REFINEMENT
/
CONFLICT
```

这正是专利中局部治理动态消解的核心生命周期。

---

# 3. 产品体验总原则

系统交互设计遵循六条顶层原则。

---

## 原则一：过程优先于结果

不能只告诉用户：

```text
Global Contract Published
```

而必须让其看到：

```text
Candidate
↓
Impact Analysis
↓
Version Diff
↓
Publish
↓
Dependency Scan
↓
Affected Contracts
↓
State Invalidated
↓
Revalidation
↓
Final Resolution
```

每一步都应具有：

- 输入；
- 系统计算；
- 当前状态；
- 输出；
- 下一状态。

---

## 原则二：所有重大状态变化必须“有原因”

任何：

```text
ACTIVE → STALE
```

都必须允许点击：

```text
Why?
```

查看：

```text
Triggered By
GC-v19 Published

Dependency Changed
Skill Relationship

Previous Validation Basis
GC-v18

Action Required
Revalidation
```

系统不能出现没有解释的“魔法状态切换”。

---

## 原则三：跨端动作必须产生可感知反馈

例如：

User A：

```text
Create Local Governance
```

Developer Console 必须实时出现：

```text
New Evidence Received
```

Developer：

```text
Publish GC-v19
```

多个 User Console 必须同步出现：

```text
Global Governance Updated
```

观众必须真正“看到两端在通信”。

---

## 原则四：治理链路必须可追溯

任何一个 Global Contract，都应能逆向追溯：

```text
Global Contract
↑
Governance Candidate
↑
Evidence Cluster
↑
Local Evidence
↑
Runtime Trace
```

任何一个 Local Contract，都应能看到：

```text
Current State
↑
Revalidation
↑
Global Change
↑
Original Local Evidence
```

---

## 原则五：海量状态通过“聚合 → 下钻”展示

系统既要展示：

```text
1,024 Skills
38,125 Local Contracts
121,893 Evidence Events
```

也要允许点击其中一个：

```text
LC-8921
```

进入单条 Contract 的完整生命周期。

因此所有大规模页面采用：

> **Macro View → Cluster View → Entity View → Trace View**

四层下钻逻辑。

---

## 原则六：状态演化必须连续，而不是跳页断裂

例如 Global 发布后，不应：

```text
点击 Publish
↓
跳转新页面
↓
突然显示 29 个 Stale
```

而应表现为：

```text
Publish
↓
Version v18 → v19 动画
↓
Global Change Packet 生成
↓
Dependency Graph 扫描
↓
29 个节点逐渐点亮
↓
Affected Count 实时增长
↓
节点 ACTIVE → STALE
↓
进入 Revalidation 队列
```

页面跳转只发生在自然阶段边界，而不是每一个逻辑步骤都换页。

---

# 4. 系统交互视觉语言

整个产品统一使用六类动态视觉对象。

---

## 4.1 Event Pulse

用于表示：

> 某端产生了一个新的治理事件。

例如：

```text
User A
●
│ LOCAL_EVIDENCE_CREATED
│
──────────────→ Developer
```

动画表现：

- 源节点轻微扩散；
- 出现事件粒子；
- 沿连线移动；
- 到达目标端；
- 目标计数 +1；
- Inbox 卡片滑入。

---

## 4.2 Dependency Wave

用于表示：

> Global Change 正在沿 Dependency 扩散。

例如：

```text
GC-v19
  ●
 ╱│╲
● ● ●
│ │ │
LC LC LC
```

动画：

1. Global 节点点亮；
2. 第一层 Dependency 连线高亮；
3. 匹配节点依次高亮；
4. 不相关节点淡出；
5. Affected Count 动态累加。

---

## 4.3 State Morph

用于状态迁移。

例如：

```text
ACTIVE
```

先出现：

```text
Validation basis changed
```

然后 Badge 过渡为：

```text
STALE
```

再出现：

```text
Queued for revalidation
```

最后：

```text
REVALIDATING
```

而不是瞬间切换。

---

## 4.4 Governance Diff

用于：

```text
Before
vs
After
```

例如：

```text
GC-v18
No Rule

↓

GC-v19
IR Search > Web Search
```

改变的部分应突出显示。

---

## 4.5 Lineage Trail

用于：

```text
Runtime
→ Evidence
→ Cluster
→ Candidate
→ Contract
```

页面顶部持续存在小型 Breadcrumb：

```text
LE-2048
→
C-0182
→
GGC-102
→
GC-1001
```

点击任何节点都可以回溯。

---

## 4.6 Runtime Explanation

用于回答：

> 为什么这次 Agent 最终选了这个 Skill？

显示：

```text
Context
+
Global Invariant
+
Global Default
+
Local Refinement
↓
Effective Governance
↓
Runtime Decision
```

专利明确要求 Global 与 Local 治理最终合并形成 Effective Governance，并作用于 Skill Retrieval、Routing、Planning、Execution 等过程。

---

# 第二部分：完整系统状态模型

# 5. 系统全局业务状态机

整个系统不是若干页面，而是一条状态链：

```text
Runtime
↓
Evidence Detection
↓
Local Resolution
↓
Evidence Upload
↓
Evidence Aggregation
↓
Promotion Evaluation
↓
Global Candidate
↓
Developer Decision
↓
Global Change
↓
Dependency Analysis
↓
Local Invalidity Propagation
↓
Revalidation
↓
Resolution
↓
Effective Governance
↓
New Runtime
```

这条链必须贯穿所有 UI。

---

# 6. Runtime 状态

```text
IDLE
↓
TASK_RECEIVED
↓
PLANNING
↓
SKILL_MATCHING
↓
ROUTING
↓
EXECUTING
↓
RESULT_EVALUATION
```

随后：

```text
SUCCEEDED
```

或者：

```text
ANOMALY_DETECTED
```

---

# 7. Evidence 状态

```text
DETECTED
↓
CAPTURING
↓
STRUCTURED
↓
LOCAL
↓
CLUSTERED
↓
PROMOTION_EVALUATING
```

随后：

```text
PROMOTION_READY
```

或者：

```text
LOCAL_ONLY
```

或者：

```text
INSUFFICIENT_EVIDENCE
```

---

# 8. Candidate 状态

```text
GENERATED
↓
UNDER_REVIEW
```

可能进入：

```text
APPROVED
REJECTED
KEPT_LOCAL
NEEDS_MORE_EVIDENCE
```

APPROVED 后：

```text
GLOBAL_CONTRACT_DRAFT
↓
IMPACT_ANALYZED
↓
PUBLISHED
```

---

# 9. Local Contract 生命周期

核心状态严格保持：

```text
ACTIVE
↓
STALE
↓
REVALIDATING
```

之后三分：

```text
RETIRED

ACTIVE_REFINEMENT

CONFLICT
```

专利明确规定受影响 Local Contract 原有验证基础变化后进入 `Stale`，随后 `Revalidating`，最终根据新的 Global Governance 与 Local Context 分流。

---

# 第三部分：双端页面总架构

# 10. User Console

主导航：

```text
Agent Workspace
Runtime Center
Evidence
My Governance
Governance Updates
Skills
History
```

---

# 11. Developer Console

主导航：

```text
Governance Overview
Governance Inbox
Evidence Intelligence
Global Candidates
Global Contracts
Skills
Dependency Network
Propagation Center
Governance History
```

---

# 12. 双端页面对应关系

```text
USER                                DEVELOPER

Agent Runtime
   │
   ▼
Runtime Evidence ───────────────→ Evidence Inbox
                                     │
                                     ▼
                                 Evidence Cluster
                                     │
                                     ▼
                                 Global Candidate
                                     │
                                     ▼
Local Governance                   Review
   │                                 │
   │                                 ▼
   │                           Global Contract
   │                                 │
   │                                 ▼
Governance Update ←──────────── Propagation
   │
   ▼
Revalidation
   │
   ▼
Effective Governance
```

---

# 第四部分：User 端详细交互

# 13. U01 Agent Workspace

页面目标：

> 让 Local Governance 明确来源于真实 Runtime。

---

## 初始状态

```text
┌───────────────────────────────────────────────────────┐
│ Financial Research Agent                GC-v18       │
├────────────────────────────────┬──────────────────────┤
│ CHAT                           │ GOVERNANCE INSPECTOR │
│                                │                      │
│ User                           │ Current Context      │
│ Find NVIDIA's latest official  │ —                    │
│ quarterly filing.              │                      │
│                                │ Global Governance    │
│                                │ GC-v18               │
│                                │                      │
│                                │ Local Governance     │
│                                │ None                 │
└────────────────────────────────┴──────────────────────┘
```

---

# 14. 点击 Send 后的完整动画

## T0

聊天消息锁定。

出现：

```text
Understanding Task...
```

右侧 Context Inspector 同步开始填充：

```text
TaskType
financial_research

SourceRequirement
official

Object
quarterly_filing
```

---

## T1

状态：

```text
PLANNING
```

页面中央出现小型 Runtime Stepper：

```text
Understand
  ✓

Plan
  ●

Route
  ○

Execute
  ○
```

---

## T2

进入 Skill Matching。

右侧 Governance Inspector 自动展开：

```text
Candidate Skills
```

逐个卡片滑入：

```text
Web Search
Match 0.81

Investor Relations Search
Match 0.78
```

---

## T3

系统执行 Governance Resolution：

```text
Checking Global Governance...
```

然后：

```text
Checking Local Refinements...
```

当前无规则：

```text
No applicable routing governance found
```

于是：

```text
Default planner score used
```

---

## T4

选中：

```text
Web Search
```

Skill 卡片高亮。

右侧显示：

```text
Why selected?

Planner Match
0.81

Governance Adjustment
0

Final Score
0.81
```

---

# 15. Runtime Trace 动态展示

点击：

```text
Open Runtime Trace
```

从底部弹出 Timeline Panel，而不是离开页面。

```text
12:01:01 Task received
12:01:02 Context extracted
12:01:03 2 Skills matched
12:01:04 Governance resolved
12:01:04 WebSearch selected
12:01:05 Tool invoked
```

执行过程实时增加。

---

# 16. 异常发现过程

Web Search 返回媒体文章后：

Result Evaluator 显示：

```text
Expected Source
Official

Actual Sources
Reuters
CNBC
Yahoo Finance

Source Match
LOW
```

随后状态：

```text
Potential Governance Issue
```

右侧出现黄色 Governance Signal。

---

# 17. 用户主动纠正

用户点击：

```text
Not Official Source
```

系统不是直接弹一个普通 Dialog。

而是打开：

# Correction Studio

左侧：

```text
Current Execution
```

右侧：

```text
Correction
```

显示：

```text
Observed
Web Search

Expected
Official Source

Suggested Alternative
Investor Relations Search
```

按钮：

```text
[ Retry Current Skill ]

[ Switch Skill ]

[ Cancel ]
```

---

# 18. Switch Skill

点击：

```text
Switch Skill
```

出现转换动画：

```text
Web Search
    ↓
User Correction
    ↓
Investor Relations Search
```

新的 Skill 卡片进入执行状态。

成功后：

```text
Official Source Match
HIGH
```

---

# 19. Governance Opportunity Detection

系统将两次执行结果并排：

```text
BEFORE                     AFTER

Web Search                 IR Search
Non-official               Official
Correction required        Direct success
```

下方动态出现：

```text
Potential Local Governance Pattern Detected
```

然后形成：

```text
Skill Relation
IR Search > Web Search

Context
official_filing
```

---

# 20. Evidence 捕获动画

点击：

```text
Build Evidence
```

页面进入 Evidence Builder。

不是一次显示所有字段，而是逐步把 Runtime 信息“吸附”到 Evidence Card：

```text
Task
          ↘
Context    → Local Evidence
          ↗
Runtime Trace

Skill Relation
          ↗

Correction Result
```

最终形成完整：

```text
LE-2048
```

这一过程应清楚表现：

> Evidence 是由 Runtime 事实结构化生成，而不是人工填表。

---

# 21. Evidence Builder

分五步：

```text
1 Context
2 Skill Relation
3 Runtime Evidence
4 Resolution
5 Dependency
```

每一步都自动填充，可人工查看。

---

## Step 1 Context

```text
Task Type
official_filing

Source
official

Agent
Financial Research Agent
```

---

## Step 2 Relation

系统推荐：

```text
Observed Relation

IR Search
Priority >
Web Search
```

允许修改。

---

## Step 3 Runtime Evidence

显示：

```text
Execution A
WebSearch
→ Non-official

Correction

Execution B
IRSearch
→ Official
```

---

## Step 4 Resolution

```text
Preferred Resolution
IR Search > Web Search
```

---

## Step 5 Dependency

```text
Parent Global
GC-v18

WebSearch
3.1

IRSearch
2.4

Context Schema
official_filing
```

---

# 22. Evidence 完成

点击：

```text
Confirm Evidence
```

Evidence Card 收缩成为：

```text
LE-2048
LOCAL
```

然后产生两个视觉动作：

第一：

```text
Save to Local Domain
```

第二：

```text
Send Governance Signal
```

一个 Evidence Pulse 从 User 窗口边缘飞出。

Developer Console 同时收到。

---

# 23. 创建 Local Contract

Evidence 完成后不是强制创建治理规则。

出现：

```text
Runtime issue recorded.

Do you want this environment to
avoid the same issue next time?
```

按钮：

```text
[ Create Local Rule ]

[ Evidence Only ]
```

这是一个重要分支：

> Evidence 和 Local Contract 不应被设计成完全等价。

专利中 `LocalResolution` 和 `LocalContract` 本身允许选择性存在。

---

# 24. Local Governance Builder

采用自然语言规则构建器：

```text
WHEN

Task matches
[ Official Filing ]

AND

Source requirement
[ Official ]

THEN

Prefer
[ Investor Relations Search ]

OVER
[ Web Search ]
```

实时在右侧显示：

```text
Effective Scope Preview

12 Agents
4 Skill routes
Current Workspace
```

---

# 25. Dependency Preview

创建前必须出现：

```text
This Local Governance will depend on:
```

然后逐个建立连线：

```text
LC-DRAFT
 ├── GC-v18
 ├── WebSearch 3.1
 ├── IRSearch 2.4
 ├── Priority Relation
 └── official_filing schema
```

点击每项可以解释：

```text
Why is this dependency stored?
```

---

# 26. Local Contract 创建完成

出现短暂状态：

```text
VALIDATING
```

系统检查：

```text
Global Invariant
Local Conflict
Scope
Dependency completeness
```

全部通过：

```text
ACTIVE
```

同时加入：

```text
My Governance
```

---

# 第五部分：Developer 端 Evidence 交互

# 27. Developer 收到单条 Evidence

Developer 右上角出现：

```text
Governance Signal
+1
```

Inbox 中卡片从右侧滑入：

```text
LE-2048

User A

Official Filing Routing

Web Search
↔
IR Search
```

卡片顶部明确：

```text
LOCAL SIGNAL
```

避免让 Developer 误以为它已经是 Global 问题。

---

# 28. Evidence 聚类过程必须可见

当 User B、C、D 继续发送 Evidence 时：

Developer Evidence Center 中不要只是：

```text
Cluster count 4
```

而应该让 Evidence 卡片动态“吸附”。

例如：

```text
LE-A     LE-B

    ↘   ↙

    C-0182

    ↗   ↖

LE-C     LE-D
```

每有新 Evidence：

```text
Independent Users
3 → 4

Evidence Events
4 → 5

Resolution Agreement
88% → 91%
```

数字平滑变化。

---

# 29. Cluster 相似度解释

点击 Evidence 与 Cluster 之间的连线：

```text
Why grouped?
```

显示：

```text
Same Skill Pair
✓

Same Violation Type
✓

Similar Context
✓

Compatible Version
✓

Same Resolution
✓
```

这样可以让观众看到：

> 聚类不是随机把反馈放在一起。

---

# 30. Promotion Evaluation 动画

Cluster 达到一定规模后自动进入：

```text
Evaluating Global Significance...
```

页面展示四个动态 Gauge：

```text
Frequency
███████ 78%

Coverage
██████ 64%

Resolution Consistency
█████████ 91%

Evidence Quality
█████████ 92%
```

随后综合：

```text
Promotion Score
0.86
```

阈值线：

```text
Threshold
0.75
```

当 Score 越过线：

整个 Cluster Card 状态由：

```text
CLUSTERED
```

缓慢变为：

```text
PROMOTION READY
```

---

# 31. Promotion 不满足的动画

另一 Cluster：

```text
Private Hospital Resource Isolation
```

显示：

```text
Independent Users
1

Coverage
0.01%
```

虽然 Severity 高：

```text
Risk
HIGH
```

但：

```text
Global Significance
LOW
```

最终进入：

```text
LOCAL ONLY
```

这可以直接体现：

> 高风险不等于应该全局化。

---

# 第六部分：Global Candidate 完整流程

# 32. Candidate Creation 动画

Developer 点击：

```text
Create Global Candidate
```

Evidence Cluster Card 不消失。

而是复制一个“治理投影”：

```text
Evidence Cluster
      │
      │ derive
      ▼
Governance Candidate
```

右侧出现：

```text
GGC-102
```

两者之间保持 Lineage 连线。

---

# 33. Candidate Review 页面

页面结构：

```text
┌───────────────────┬────────────────────┐
│ Evidence          │ Governance Proposal│
├───────────────────┼────────────────────┤
│ 38 users          │ Predicate          │
│ 61 events         │ official_filing    │
│ 91% agreement     │                    │
│                   │ Relation           │
│ Runtime Samples   │ IR > Web           │
│                   │                    │
│ Context Spread    │ Scope              │
│                   │ Global Default     │
└───────────────────┴────────────────────┘
```

---

# 34. Candidate Decision 分支

Developer 有五个动作：

```text
Approve

Modify

Need More Evidence

Keep Local

Reject
```

---

## Need More Evidence

点击后：

```text
Candidate
UNDER_OBSERVATION
```

Evidence Cluster 继续接受新事件。

满足条件后再次提醒。

---

## Keep Local

Developer 必须说明原因：

```text
Context too specific

Private environment

Permission-specific

Resource-specific

Insufficient population
```

结果：

```text
LOCAL_ONLY
```

但原 Local Governance 继续有效。

---

# 第七部分：Global Contract 创建与影响预测

# 35. Global Rule Editor

规则编辑器与 Local Builder 类似，使两端形成一致的 Governance Language。

```text
WHEN
Task = official_filing

THEN
IR Search > Web Search
```

然后选择：

```text
Governance Level

Global Default

Global Invariant
```

---

# 36. Global Contract Preview

发布前显示三层：

```text
SEMANTIC CHANGE

official_filing
→ IRSearch > WebSearch


ECOSYSTEM IMPACT

Users
38

Agents
74

Local Contracts
29


DEPENDENCY TYPES

Parent Contract
18

Relationship
8

Version
2

Context Schema
1
```

---

# 37. Dependency Scan 动画

点击：

```text
Run Impact Analysis
```

进入 Full-screen Analysis Mode。

中心：

```text
GC-v18
```

新 Contract：

```text
GC-v19
```

先显示 Diff：

```text
+ official_filing
+ IRSearch > WebSearch
```

然后扫描 Dependency Graph。

扫描表现：

```text
Scanning ParentContract...
✓ 18

Scanning Relationship...
✓ 8

Scanning SkillVersion...
✓ 2

Scanning ContextSchema...
✓ 1
```

每扫一类，对应节点高亮。

---

# 38. Affected 与 Unaffected 对比

页面同时显示：

```text
4,821 Local Contracts
```

扫描过程中：

```text
Affected
0 → 5 → 17 → 24 → 29
```

最终：

```text
29 Affected

4,792 Unaffected
```

点击：

```text
Why unaffected?
```

可以随机查看某个 Contract：

```text
LC-3811

Different Skill Relationship
No dependency match
```

这非常重要，可以展示系统不是“全量重算”。

---

# 第八部分：Global Publish 的跨端高潮交互

# 39. Publish 交互不能只是按钮

点击：

```text
Publish & Propagate
```

进入三阶段动画。

---

## Phase 1：Commit Global State

```text
GC-v18
     ↓
Committing...
     ↓
GC-v19
```

Global Version 顶部数字：

```text
18
→
19
```

---

## Phase 2：Generate Governance Delta

系统生成：

```text
ΔG
```

卡片：

```text
GLOBAL CHANGE

Relationship Added

official_filing
IRSearch > WebSearch
```

---

## Phase 3：Propagate

ΔG Card 向多个 User Domain 发出波纹：

```text
                User A
                  ↑
                  │
User B ←────── ΔG ──────→ User C
                  │
                  ↓
                User D
```

如果多窗口平铺：

各 User Console 几乎同时出现 Update Pulse。

这是整个 Demo 最重要的跨端视觉瞬间之一。

---

# 40. User 端收到更新

每个 User 的顶部 Global Version：

```text
GC-v18
```

先出现：

```text
New Global Governance Available
```

随后动画：

```text
GC-v18
↓
GC-v19
```

但 Local Contract 不立即变化。

下一步：

```text
Checking local dependencies...
```

---

# 41. User 本地 Dependency Detection

User A：

```text
LC-8921

Checking:
Parent Contract ✓
Skill Version   —
Relationship    ✓
Context Schema  ✓
```

匹配完成：

```text
Affected
```

状态：

```text
ACTIVE
↓
STALE
```

---

# 42. 为什么一定先 Stale

UI 中明确展示：

```text
Rule is not deleted.

Its previous validation result
is no longer trusted.
```

然后：

```text
Queued for Revalidation
```

这能把专利中很抽象的 `Stale` 变成非常容易理解的产品概念。

---

# 第九部分：Revalidation 全过程可视化

# 43. Revalidation Center

Developer 可以看到总体队列：

```text
REVALIDATION QUEUE

29 Contracts

Waiting        29
Processing      0
Completed       0
```

启动后：

```text
Waiting        28
Processing      1
Completed       0
```

持续变化。

---

# 44. 单 Contract 重验证分四步

每一个 Contract 都使用统一 Stepper：

```text
1 Load New Global State
2 Compare Original Local Rule
3 Evaluate Current Context
4 Resolve Local State
```

---

# 45. Step 1：加载新 Global

显示：

```text
Original Basis
GC-v18

New Basis
GC-v19
```

---

# 46. Step 2：规则比较

例如 User A：

```text
LOCAL

official_filing
→ IRSearch > WebSearch


GLOBAL

official_filing
→ IRSearch > WebSearch
```

系统：

```text
Coverage
100%
```

---

# 47. Step 3：Context 检查

```text
Local-only Conditions
None
```

因此：

```text
No remaining local specificity
```

---

# 48. Step 4：结果动画

三个候选结果先出现：

```text
Retired

Active Refinement

Conflict
```

系统根据判断逐步排除：

```text
Active Refinement
× No local-specific condition

Conflict
× Compatible
```

最终只剩：

```text
RETIRED
```

然后 Badge：

```text
REVALIDATING
→
RETIRED
```

---

# 49. Active Refinement 动画

User B：

原 Local：

```text
official_filing
→ IRSearch

+

internal_resource=true
→ InternalDB
```

系统进行“规则拆分”动画：

```text
LOCAL CONTRACT
      │
      ├── Shared Portion
      │      ↓
      │   absorbed by Global
      │
      └── Local Portion
             ↓
         retained
```

最终：

```text
ACTIVE_REFINEMENT
```

并显示新 Local Contract：

```text
IF internal_resource=true
THEN InternalDB
```

---

# 50. Conflict 动画

User C：

```text
GLOBAL
IRSearch > WebSearch

LOCAL
WebSearch only
```

系统先尝试 Merge：

```text
Merging...
```

中间出现红色断裂：

```text
INCOMPATIBLE
```

随后：

```text
CONFLICT
```

并生成：

```text
Governance Resolution Required
```

---

# 第十部分：Conflict Resolver

# 51. Conflict 页面采用三列

```text
GLOBAL          CONFLICT         LOCAL

IR > Web          ⚠             Web only
```

底部：

```text
Resolution Options
```

---

# 52. 三种处理方式

## A. Retire Local

```text
Local constraint no longer required
```

---

## B. Refine Context

从：

```text
WebSearch only
```

变为：

```text
IF
IRSearch unavailable

THEN
WebSearch
```

---

## C. Rebuild Local Governance

重新进入 Local Builder。

---

# 53. Resolve 后继续闭环

例如选择：

```text
Refine Context
```

完成后：

```text
CONFLICT
↓
VALIDATING
↓
ACTIVE_REFINEMENT
```

并加入 Governance History。

---

# 第十一部分：Effective Governance 与新 Runtime

# 54. 再次运行同一任务

User A 再次输入：

```text
Find NVIDIA latest official quarterly filing.
```

这一次 Routing 阶段必须明显不同。

---

# 55. Governance Resolution 动画

系统首先匹配 Candidate：

```text
WebSearch
0.81

IRSearch
0.78
```

随后显示：

```text
Applying Governance...
```

Global Contract：

```text
IRSearch > WebSearch
```

影响评分：

```text
WebSearch
0.81
↓
0.40

IRSearch
0.78
↑
1.00
```

最终：

```text
Investor Relations Search
SELECTED
```

---

# 56. Why This Skill

点击：

```text
Why?
```

显示完整解释链：

```text
Task Context
official_filing

↓

Global Contract
GC-v19

↓

Governance Relation
IRSearch > WebSearch

↓

Local Refinement
None

↓

Effective Governance

↓

Final Skill
Investor Relations Search
```

这一步完成整个：

```text
Runtime
→ Evidence
→ Global Evolution
→ Local Revalidation
→ New Runtime
```

闭环。

---

# 第十二部分：多用户、多 Skill 场景

# 57. 多窗口总体验

Demo Launcher：

```text
Developer
User A
User B
User C
User D
User E
```

支持自动排列：

```text
[ Grid Layout ]

[ Developer Focus ]

[ User Focus ]

[ Broadcast View ]
```

---

# 58. Broadcast View

Developer 发布 Global Update 时：

系统自动把多个 User Window 同步进入：

```text
Governance Update
```

观众可以同时看到：

```text
User A
1 affected

User B
3 affected

User C
0 affected

User D
Conflict

User E
Active Refinement
```

这可以非常直观地解释：

> 同一个 Global Change 对不同 Local Context 的结果并不相同。

---

# 59. Mass Skill Update

Developer 一次更新：

```text
38 Skills
```

页面不是一下显示结果，而是：

```text
Building Change Set...

38 Skill Changes
```

然后：

```text
Calculating Dependency Impact...
```

Dependency Network 像波浪一样扩散。

最终：

```text
8,921 Local Contracts scanned

2,481 affected
```

---

# 60. 大规模 Revalidation

显示动态 Funnel：

```text
2,481
Affected
   ↓
2,481
Revalidated
   ↓
1,821
Retired

531
Active Refinement

129
Conflict
```

每一个数字都可以继续下钻。

---

# 第十三部分：页面跳转规则

# 61. User 页面主链

```text
Agent Workspace
   │
   ├── Runtime Trace Drawer
   │
   ▼
Evidence Builder
   │
   ├── Evidence Detail
   │
   ▼
Local Governance Builder
   │
   ▼
Local Contract Detail
```

Global 更新后：

```text
Notification
   │
   ▼
Governance Updates
   │
   ▼
Affected Contract
   │
   ▼
Revalidation Detail
   │
   ├── Retired
   ├── Active Refinement
   └── Conflict Resolver
```

---

# 62. Developer 页面主链

```text
Overview
   │
   ▼
Governance Inbox
   │
   ▼
Evidence Cluster
   │
   ▼
Global Candidate
   │
   ▼
Contract Editor
   │
   ▼
Impact Analysis
   │
   ▼
Publish
   │
   ▼
Propagation Monitor
   │
   ▼
Revalidation Overview
```

---

# 63. 页面跳转原则

以下动作：

```text
Inspect
Why
Trace
Diff
Dependency
History
```

优先采用：

```text
Drawer
Modal
Overlay
```

避免打断当前流程。

以下行为：

```text
Evidence Builder

Candidate Review

Global Contract Editor

Impact Analysis

Conflict Resolution
```

属于明确业务阶段，因此进入独立页面。

---

# 第十四部分：消息、通知与跨端反馈

# 64. User → Developer 事件

Developer 可感知：

```text
LOCAL_EVIDENCE_CREATED

LOCAL_CONTRACT_CREATED

LOCAL_CONTRACT_CONFLICTED

RUNTIME_ANOMALY_REPEATED
```

---

# 65. Developer → User 事件

User 可感知：

```text
GLOBAL_CONTRACT_PUBLISHED

SKILL_VERSION_UPDATED

GLOBAL_RELATIONSHIP_CHANGED

LOCAL_CONTRACT_INVALIDATED

REVALIDATION_REQUIRED
```

---

# 66. 通知不能只有 Toast

每一个重大通知必须同时存在三层：

### 第一层

即时 Toast。

### 第二层

Notification Center。

### 第三层

Governance History。

因此用户错过即时动画以后仍然可以重新追溯。

---

# 第十五部分：Governance History

# 67. 全局 Event Timeline

时间轴不只是日志。

每一项事件可以展开：

```text
12:36
GC-v19 Published

Triggered by
GGC-102

Origin
C-0182

Affected
29 Local Contracts

Result
21 Retired
6 Refinement
2 Conflict
```

---

# 68. Replay

这是很值得增加的功能。

任何 Governance Event：

```text
[ Replay Evolution ]
```

可以重新播放：

```text
Evidence
↓
Candidate
↓
Global Change
↓
Propagation
↓
Revalidation
```

这对于：

- 产品演示；
- 专利讲解；
- 用户培训；
- Debug；

都有价值。

---

# 第十六部分：Demo Scenario 设计

# 69. Scenario 01

## Local Evidence → Global Governance

展示：

```text
多个 User
↓
相同 Runtime 问题
↓
Evidence Cluster
↓
Promotion Ready
↓
Global Contract
```

---

# 70. Scenario 02

## Global Change → Three Local Outcomes

同一个 Global Change：

```text
User A
→ Retired

User B
→ Active Refinement

User C
→ Conflict
```

这是最核心 Demo。

---

# 71. Scenario 03

## Skill Version Revalidation

```text
Skill 2.3
↓
Local workaround

Skill 2.4
↓
Bug fixed

Local
ACTIVE
→ STALE
→ RETIRED
```

对应专利版本变化实施例。

---

# 72. Scenario 04

## Global Invariant

Global：

```text
PermissionRequired = 1
OverridePermission = 0
```

Local 尝试放宽。

系统：

```text
BLOCKED
```

用于说明 Global Governance Boundary。

---

# 73. Scenario 05

## Local-only Issue

某用户特殊 Private Resource。

Evidence 有效，但是：

```text
Coverage too low

Context too specific
```

结果：

```text
LOCAL_ONLY
```

对应专利关于单一用户特有环境不进入全局治理的实施方式。

---

# 74. Scenario 06

## Mass Skill Governance

展示：

```text
38 Skill updates
↓
8,921 Local Contracts
↓
2,481 affected
↓
Revalidation
↓
Three outcome groups
```

用于证明模型可以扩展到大规模生态。

---

# 第十七部分：前端实现架构

# 75. 应用结构

```text
/apps
  /developer-console
  /user-console
  /demo-launcher

/packages
  /domain
  /governance-engine
  /evidence-engine
  /dependency-engine
  /revalidation-engine
  /simulation-engine
  /event-bus
  /fixtures
  /ui
```

---

# 76. 真逻辑与模拟逻辑边界

## 可以模拟

```text
LLM Response

Skill Result

Runtime Delay

Evidence Text

Demo User Behavior
```

---

## 必须真正计算

```text
Evidence Aggregation

Independent User Count

Promotion Score

Dependency Matching

Affected Contract Set

State Transition

Global / Local Merge

Effective Governance

Governance History
```

---

# 77. 前端动画调度

所有业务动画不得直接散落在 Component 中。

建议建立：

```text
Interaction Orchestrator
```

例如：

```text
publishGlobalContract()
```

不是立即完成全部操作。

而是生成序列：

```text
GLOBAL_COMMIT_STARTED

GLOBAL_VERSION_CHANGED

GLOBAL_DELTA_CREATED

DEPENDENCY_SCAN_STARTED

DEPENDENCY_MATCH_FOUND

LOCAL_INVALIDATION_STARTED

REVALIDATION_STARTED

REVALIDATION_COMPLETED
```

UI 根据 Event Sequence 播放。

---

# 78. Event Animation Queue

每个窗口维护：

```text
Animation Queue
```

防止大量事件同时到达导致 UI 瞬间完成。

例如 29 个 Contract 变化，不应一次全部刷新。

可以采用：

```text
1
3
8
17
29
```

分批视觉更新。

而业务 State 可以已经计算完成。

即：

```text
Business State
Instant

Visual Playback
Sequenced
```

这样既保证逻辑正确，也保证演示丝滑。

---

# 第十八部分：最终核心交互闭环

# 79. 单次完整闭环

整个产品必须能无断点完成：

```text
User Task
↓
Skill Routing
↓
Runtime Failure / Correction
↓
Evidence Detection
↓
Structured Evidence
↓
Local Governance
↓
Evidence Upload
↓
Developer Aggregation
↓
Promotion Evaluation
↓
Global Candidate
↓
Developer Review
↓
Global Contract
↓
Impact Analysis
↓
Publish
↓
Dependency Propagation
↓
Local ACTIVE → STALE
↓
Revalidation
↓
Retired / Refinement / Conflict
↓
Effective Governance
↓
New User Runtime
```

专利本身将这一机制概括为：

```text
Local Runtime Evidence
→
Global Governance Evolution
→
Local Governance Revalidation
```

并形成持续的 User → Developer → User 双向状态协同。

---

# 80. 最终产品判断标准

系统是否成功，不看有多少页面，而看以下体验是否成立。

## 第一

观众能“看到” Evidence 从 Runtime 中生成。

## 第二

观众能“看到”多个独立 User Evidence 聚成共享治理信号。

## 第三

观众能“看到”为什么这个问题达到 Global Promotion 条件。

## 第四

观众能“看到” Developer 发布的不是一个普通配置，而是新的 Global Governance State。

## 第五

观众能“看到” Global Change 如何沿 Dependency Network 定位 Local Contracts。

## 第六

观众能“看到” Local Rule 并没有被简单覆盖，而是进入：

```text
Stale
→
Revalidating
```

## 第七

观众能“看到”同一个 Global Change 为什么对不同 User 产生：

```text
Retired
Active Refinement
Conflict
```

## 第八

观众能最终“看到”这些治理变化真实改变下一次 Agent Skill Routing。

---

# 81. 产品最终形成的观感

普通 Skill 系统给人的感觉是：

> **Skills 被配置和调用。**

本系统应该让人产生完全不同的感觉：

> **Skill 生态正在运行，而运行本身持续产生治理证据；治理证据反过来推动整个 Skill 生态演化。**

因此系统最重要的视觉对象不是：

```text
Skill
```

而是：

```text
Governance Evolution
```

最终整个产品应该让人非常直观地看到：

```text
真实运行
↓
发现问题
↓
形成局部经验
↓
跨用户验证
↓
沉淀全局规则
↓
全局规则反向影响局部
↓
历史规则动态消解
↓
新的真实运行
```

这就是本系统最核心、也最应当被“看见和感受到”的交互闭环。