# 智能体 Skill 双端协同治理系统
## 前端工程与交互实现规格说明书 V4.0

---

# 0. 文档定位

本阶段不再停留于产品概念或页面规划，而进入：

> **可直接指导前端工程实现的详细规格阶段。**

本说明书主要回答七类问题：

1. Developer Console 与 User Console 具体长什么样；
2. 每个页面由哪些组件构成；
3. 用户点击按钮以后系统发生什么；
4. 动画按照什么顺序播放；
5. 两个端如何通过纯前端机制实时通信；
6. 专利中的治理逻辑哪些必须真实计算；
7. 如何通过预置 Fixture 与 Scenario 实现稳定、可重复的演示。

专利技术主链保持不变：

```text
Local Runtime Evidence
→ Global Governance Evolution
→ Local Governance Revalidation
```

其核心是用户端真实运行证据推动全局治理演化，而全局治理变化再基于治理依赖反向触发受影响局部状态的重新验证。

---

# 第一篇：工程总体设计

# 1. 前端产品总体组成

整个前端 Monorepo 由三个 App 组成。

```text
/apps
  /developer-console
  /user-console
  /demo-launcher
```

以及共享 Packages：

```text
/packages
  /domain
  /ui
  /fixtures
  /event-bus
  /runtime-engine
  /evidence-engine
  /governance-engine
  /dependency-engine
  /revalidation-engine
  /simulation-engine
  /animation-orchestrator
```

---

# 2. 三个 App 的职责

## 2.1 Developer Console

URL 示例：

```text
/developer
```

职责：

- 接收多个 User Domain 的 Evidence；
- 形成 Evidence Cluster；
- 计算 Global Promotion；
- 审核 Governance Candidate；
- 创建 Global Contract；
- 执行 Impact Analysis；
- 发布 Global Governance；
- 观察 Dependency Propagation；
- 查看 Local Revalidation 总体结果。

---

## 2.2 User Console

URL 示例：

```text
/user/:userId
```

例如：

```text
/user/user-a
/user/user-b
/user/user-c
```

职责：

- 运行 Agent；
- 展示 Skill Routing；
- 捕获 Runtime Evidence；
- 创建 Local Governance；
- 接收 Global Governance Update；
- 执行 Local Dependency Check；
- 展示 Stale / Revalidating；
- 处理 Retired / ActiveRefinement / Conflict。

---

## 2.3 Demo Launcher

URL：

```text
/demo
```

仅用于：

- 初始化 Scenario；
- Reset；
- 打开多个窗口；
- 控制演示速度；
- 自动排列窗口；
- Replay；
- 控制某些步骤自动或手动触发。

它不是产品中的第三治理端。

---

# 3. 数据运行原则

第一阶段：

```text
无后端
无数据库
无持久化状态
```

标准运行机制：

```text
Fixture
↓
初始化 Memory Store
↓
处理 Governance Events
↓
更新 Memory State
↓
驱动 UI
```

刷新或 Reset：

```text
Memory State 清空
↓
重新加载 Fixture
```

从而保证：

> 每次演示都从同样状态开始。

---

# 4. 状态与动画必须分离

系统必须严格区分：

## Business State

逻辑计算结果。

例如一次 Global Publish 可以在几十毫秒内算出：

```text
Affected = 29
Retired = 21
Refinement = 6
Conflict = 2
```

## Presentation State

动画逐步展示。

例如：

```text
0
↓
5
↓
17
↓
24
↓
29 affected
```

因此：

```ts
businessState !== presentationState
```

不允许为了动画效果延迟真实数据计算。

---

# 5. 推荐技术栈

建议：

```text
React
TypeScript
Vite 或 Next.js
Zustand
React Router / Next Router
Framer Motion
React Flow
BroadcastChannel
```

其中：

- Zustand：Memory Store；
- BroadcastChannel：跨窗口事件；
- React Flow：Dependency Network；
- Framer Motion：状态与页面动画；
- Fixture：演示数据。

---

# 第二篇：统一视觉与交互设计系统

# 6. 页面基础尺寸

系统首先以桌面展示为主。

最低设计宽度：

```text
1440px
```

推荐 Demo 分辨率：

```text
1920 × 1080
```

---

# 7. Developer Console Layout

默认：

```text
┌────────┬──────────────────────────────────────────┐
│        │ Top Header 64                            │
│  Side  ├──────────────────────────────────────────┤
│  Nav   │                                          │
│ 240px  │ Main Content                             │
│        │                                          │
│        │                                          │
└────────┴──────────────────────────────────────────┘
```

规格：

```text
Sidebar: 240px
Header: 64px
Content Padding: 24px
Card Radius: 12px
Panel Gap: 16px
```

---

# 8. User Console Layout

Agent Workspace 页面采用特殊三栏布局：

```text
┌────────┬────────────────────────────┬───────────────┐
│ Side   │ Agent Workspace            │ Governance    │
│ 220px  │ Flexible                   │ 360px         │
│        │                            │ Inspector     │
└────────┴────────────────────────────┴───────────────┘
```

普通 User 页面恢复：

```text
220px Sidebar + Main Content
```

---

# 9. 核心 Motion Timing

统一动画节奏：

```text
micro interaction        120–180ms
button / hover            120ms
drawer                    240ms
modal                     220ms
card insert               280ms
state morph               450ms
event pulse               600ms
dependency propagation    900–1600ms
major governance process  2–5s
```

---

# 10. 动画速度控制

Demo Launcher 提供：

```text
Animation Speed

○ 0.5×
● 1×
○ 1.5×
○ 2×
```

真正业务逻辑不受影响，只修改：

```ts
animationDurationMultiplier
```

---

# 11. 六种统一动画组件

必须实现：

```text
<EventPulse />
<StateMorph />
<DependencyWave />
<GovernanceDiff />
<LineageTrail />
<ScoreTransition />
```

---

# 12. EventPulse

Props：

```ts
interface EventPulseProps {
  source: string
  target: string
  eventType: GovernanceEventType
  duration?: number
}
```

过程：

```text
source glow
→ pulse created
→ moving particle
→ target glow
→ notification insert
```

标准时序：

```text
0ms      source glow
120ms    particle created
180ms    particle moving
580ms    target reached
650ms    target counter updated
780ms    card inserted
```

---

# 13. StateMorph

示例：

```text
ACTIVE
→
STALE
```

时序：

```text
0–150ms
ACTIVE badge pulse

150–300ms
badge border change

300–450ms
ACTIVE text fade out

450ms
STALE fade in
```

同时禁止直接：

```tsx
setState("STALE")
```

后让视觉瞬间变黄。

应通过：

```text
business state updated
↓
animation orchestrator
↓
presentation badge morph
```

---

# 14. DependencyWave

用于：

```text
Global Change
→ Dependency Graph
→ Local Contracts
```

动画阶段：

```text
1 Changed global node pulse
2 Relationship edges activate
3 Matching local nodes illuminate
4 Unrelated nodes fade
5 Counters update
6 Result group appears
```

---

# 第三篇：前端领域对象

# 15. Skill

```ts
export interface Skill {
  id: string
  name: string
  description: string

  version: string
  category: string

  capabilities: string[]

  status:
    | "ACTIVE"
    | "DEPRECATED"
    | "DISABLED"

  provider: string
}
```

---

# 16. RuntimeContext

```ts
export interface RuntimeContext {
  taskType?: string
  sourceRequirement?: string

  permission?: string[]
  resources?: string[]
  environment?: string[]

  sessionId?: string
  agentId?: string

  attributes: Record<string, string | number | boolean>
}
```

这对应专利中 Task、Permission、Resource、Environment、Session 等用户运行上下文。

---

# 17. RuntimeExecution

```ts
export interface RuntimeExecution {
  id: string

  userId: string
  agentId: string

  input: string

  context: RuntimeContext

  candidateSkills: SkillCandidate[]

  selectedSkillId?: string

  steps: RuntimeStep[]

  status: RuntimeStatus

  startedAt: number
  completedAt?: number
}
```

---

# 18. RuntimeStep

```ts
export interface RuntimeStep {
  id: string

  type:
    | "TASK_RECEIVED"
    | "CONTEXT_EXTRACTED"
    | "SKILL_MATCHED"
    | "GOVERNANCE_RESOLVED"
    | "SKILL_SELECTED"
    | "SKILL_EXECUTED"
    | "RESULT_EVALUATED"
    | "USER_CORRECTION"

  timestamp: number

  payload: Record<string, unknown>
}
```

---

# 19. LocalEvidence

```ts
export interface LocalEvidence {
  id: string

  userId: string
  agentId: string

  skillRelation: SkillRelation

  violationType: string

  context: RuntimeContext

  runtimeExecutionId: string

  runtimeEvidence: RuntimeEvidenceItem[]

  localResolution?: GovernanceResolution

  localContractId?: string

  parentGlobalVersion: string

  skillVersions: Record<string, string>

  state:
    | "DETECTED"
    | "STRUCTURED"
    | "LOCAL"
    | "CLUSTERED"
    | "PROMOTION_READY"
    | "LOCAL_ONLY"

  qualityScore: number

  createdAt: number
}
```

该结构直接对应专利中的：

```text
SkillRelation
ViolationType
Context
RuntimeEvidence
LocalResolution
LocalContract
ParentVersion
```

并且 `LocalResolution` 与 `LocalContract` 可以选择性存在。

---

# 20. SkillRelation

```ts
export interface SkillRelation {
  type:
    | "PRIORITY"
    | "ORDER"
    | "EXCLUSION"
    | "FALLBACK"
    | "ISOLATION"
    | "PERMISSION"

  sourceSkillId: string
  targetSkillId?: string

  predicate?: GovernancePredicate
}
```

---

# 21. GovernanceDependency

```ts
export interface GovernanceDependency {
  parentContractId: string

  skillVersions: Record<string, string>

  relationships: SkillRelation[]

  contextSchemas: string[]
}
```

对应专利：

```text
ParentContract
SkillVersion
Relationship
ContextSchema
```



---

# 22. GovernanceContract

```ts
export interface GovernanceContract {
  id: string

  domain:
    | "GLOBAL"
    | "LOCAL"

  ownerId?: string

  contractType:
    | "INVARIANT"
    | "DEFAULT"
    | "REFINEMENT"

  state:
    | "ACTIVE"
    | "STALE"
    | "REVALIDATING"
    | "RETIRED"
    | "ACTIVE_REFINEMENT"
    | "CONFLICT"

  predicate: GovernancePredicate

  relations: SkillRelation[]

  scope: GovernanceScope

  overridePermission: boolean

  dependencies?: GovernanceDependency

  originEvidenceIds: string[]

  parentVersion?: string

  createdAt: number
  updatedAt: number
}
```

---

# 23. EvidenceCluster

```ts
export interface EvidenceCluster {
  id: string

  evidenceIds: string[]

  skillRelation: SkillRelation

  contextSignature: string

  independentUserCount: number

  totalEvidenceCount: number

  frequencyScore: number
  coverageScore: number
  resolutionAgreement: number
  evidenceQuality: number

  promotionScore: number

  state:
    | "CLUSTERED"
    | "EVALUATING"
    | "PROMOTION_READY"
    | "LOCAL_ONLY"
    | "CANDIDATE_CREATED"
}
```

---

# 24. GlobalGovernanceCandidate

```ts
export interface GlobalGovernanceCandidate {
  id: string

  clusterId: string

  proposedPredicate: GovernancePredicate

  proposedRelation: SkillRelation

  proposedType:
    | "DEFAULT"
    | "INVARIANT"

  state:
    | "GENERATED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "KEPT_LOCAL"
    | "NEEDS_MORE_EVIDENCE"
    | "PUBLISHED"
}
```

---

# 25. GlobalChangeSet

```ts
export interface GlobalChangeSet {
  id: string

  fromVersion: string
  toVersion: string

  changedContracts: string[]
  changedSkills: string[]
  changedRelationships: SkillRelation[]
  changedContextSchemas: string[]

  createdAt: number
}
```

---

# 26. RevalidationResult

```ts
export interface RevalidationResult {
  localContractId: string

  globalVersion: string

  coverage:
    | "FULL"
    | "PARTIAL"
    | "NONE"

  compatible: boolean

  localSpecificConditions: GovernancePredicate[]

  result:
    | "RETIRED"
    | "ACTIVE_REFINEMENT"
    | "CONFLICT"

  explanation: string[]
}
```

---

# 第四篇：跨窗口 Governance Event Protocol

# 27. Event 基础结构

```ts
export interface GovernanceEvent<T = unknown> {
  eventId: string

  eventType: GovernanceEventType

  timestamp: number

  sourceDomain:
    | "USER"
    | "DEVELOPER"
    | "SYSTEM"

  sourceId: string

  targetDomain:
    | "USER"
    | "DEVELOPER"
    | "ALL"

  targetIds?: string[]

  correlationId: string

  globalVersion: string

  payload: T
}
```

---

# 28. Event Types

```ts
export type GovernanceEventType =
  | "WINDOW_JOINED"
  | "STATE_SNAPSHOT_REQUESTED"
  | "STATE_SNAPSHOT_RECEIVED"

  | "USER_TASK_STARTED"
  | "SKILL_ROUTING_STARTED"
  | "SKILL_EXECUTED"
  | "RUNTIME_ANOMALY_DETECTED"
  | "USER_CORRECTION_SUBMITTED"

  | "LOCAL_EVIDENCE_CREATED"
  | "LOCAL_CONTRACT_CREATED"

  | "EVIDENCE_CLUSTER_CREATED"
  | "EVIDENCE_CLUSTER_UPDATED"
  | "PROMOTION_THRESHOLD_REACHED"

  | "GLOBAL_CANDIDATE_CREATED"
  | "GLOBAL_CANDIDATE_APPROVED"
  | "GLOBAL_CANDIDATE_REJECTED"

  | "GLOBAL_CONTRACT_PUBLISHED"
  | "GLOBAL_CHANGESET_CREATED"

  | "DEPENDENCY_SCAN_STARTED"
  | "LOCAL_CONTRACT_AFFECTED"
  | "LOCAL_CONTRACT_MARKED_STALE"

  | "REVALIDATION_STARTED"
  | "LOCAL_CONTRACT_RETIRED"
  | "LOCAL_CONTRACT_REFINED"
  | "LOCAL_CONTRACT_CONFLICTED"

  | "DEMO_RESET"
```

---

# 29. BroadcastChannel

所有窗口加入：

```ts
new BroadcastChannel("skill-governance-demo")
```

发送：

```ts
channel.postMessage(event)
```

接收：

```ts
channel.onmessage = handleGovernanceEvent
```

---

# 30. User → Developer 示例

```ts
{
  eventType: "LOCAL_EVIDENCE_CREATED",

  sourceDomain: "USER",
  sourceId: "user-a",

  targetDomain: "DEVELOPER",

  globalVersion: "v18",

  payload: {
    evidenceId: "LE-2048"
  }
}
```

---

# 31. Developer → Users 示例

```ts
{
  eventType: "GLOBAL_CONTRACT_PUBLISHED",

  sourceDomain: "DEVELOPER",
  sourceId: "developer-main",

  targetDomain: "ALL",

  globalVersion: "v19",

  payload: {
    changeSetId: "DELTA-19"
  }
}
```

---

# 第五篇：User Console 页面详细工程规格

# 32. U01 Agent Workspace

Route：

```text
/user/:userId/agent/:agentId
```

---

## 32.1 Component Tree

```text
<UserShell>
  <UserSidebar />

  <AgentWorkspace>
    <WorkspaceHeader />

    <ChatPanel>
      <ConversationList />
      <RuntimeMessage />
      <RuntimeStepper />
      <SkillCandidatePanel />
    </ChatPanel>

    <GovernanceInspector>
      <ContextCard />
      <GlobalGovernanceCard />
      <LocalGovernanceCard />
      <EffectiveGovernanceCard />
    </GovernanceInspector>

    <RuntimeTraceDrawer />
    <CorrectionStudio />
    <GovernanceOpportunityPanel />
  </AgentWorkspace>
</UserShell>
```

---

# 33. 输入任务

固定 Demo 输入提供快捷按钮：

```text
Suggested Demo Prompt

Find NVIDIA's latest official quarterly filing.
```

用户也可手动输入。

点击：

```text
Send
```

事件：

```text
USER_TASK_STARTED
```

---

# 34. Agent Runtime 动画阶段

## 34.1 Task Received

```text
0–300ms
User Message insert
```

---

## 34.2 Context Extraction

```text
300–900ms
```

Governance Inspector：

```text
TaskType
financial_research
```

逐项出现：

```text
Task Type
Source Requirement
Entity Type
```

---

## 34.3 Skill Matching

```text
900–1500ms
```

Skill cards：

```text
Web Search
Investor Relations Search
```

从底部进入。

---

## 34.4 Governance Check

```text
1500–2300ms
```

右侧依次显示：

```text
Checking Global Governance
✓

Checking Local Governance
✓

No applicable routing rule
```

---

## 34.5 Skill Selection

```text
2300–2700ms
```

Web Search Score：

```text
0 → 0.81
```

IR Search：

```text
0 → 0.78
```

Web Search 高亮。

---

# 35. Runtime Trace Drawer

打开方式：

```text
View Runtime Trace
```

不跳页面。

Drawer Width：

```text
520px
```

右侧进入。

组件：

```text
<RuntimeTimeline />
<StepDetail />
<RawPayloadToggle />
```

---

# 36. Result Evaluation

Web Search 模拟返回：

```text
Reuters
CNBC
Yahoo Finance
```

Evaluator：

```text
Required Source
Official

Actual
Mixed / Media

Match
LOW
```

状态：

```text
ANOMALY_DETECTED
```

---

# 37. Governance Signal

右侧 Governance Inspector Header 出现：

```text
⚠ Potential Governance Issue
```

轻微 Pulse 三次。

禁止无限闪动。

---

# 38. Correction Studio

触发：

```text
Not Official Source
```

Overlay：

```text
720 × 560
```

左右两栏：

```text
Current Runtime       Suggested Correction
```

---

# 39. Correction 动作

选择：

```text
Investor Relations Search
```

点击：

```text
Apply Correction
```

系统执行：

```text
USER_CORRECTION_SUBMITTED
↓
SKILL_EXECUTED
```

---

# 40. Before / After 比较动画

执行成功以后：

```text
BEFORE
Web Search
Non-official

AFTER
IR Search
Official
```

中间出现：

```text
Correction improved outcome
```

然后：

```text
Governance Opportunity Detected
```

---

# 41. U02 Evidence Builder

Route：

```text
/user/:userId/evidence/new/:runtimeId
```

---

## 41.1 Component Tree

```text
<EvidenceBuilderPage>
  <EvidenceStepper />

  <EvidenceWorkspace>
    <EvidenceSourcePanel />
    <EvidenceFormPanel />
    <EvidencePreview />
  </EvidenceWorkspace>

  <BuilderFooter />
</EvidenceBuilderPage>
```

---

# 42. Evidence 五步骤

```text
01 Context
02 Skill Relation
03 Runtime Evidence
04 Resolution
05 Dependency
```

顶部 Stepper 固定。

---

# 43. 自动采集动画

进入页面后：

```text
RuntimeExecution
```

左侧显示。

系统逐项提取：

```text
Context
Skill Pair
Violation
Correction
Version
```

每项使用：

```text
source item highlight
↓
animated connector
↓
target field populated
```

---

# 44. Evidence Preview

右侧始终显示最终结构：

```text
LE-DRAFT

SkillRelation
...

ViolationType
...

Context
...

RuntimeEvidence
...

LocalResolution
...

ParentVersion
...
```

随着步骤不断完善。

---

# 45. Confirm Evidence

按钮状态：

```text
Disabled
```

直到：

```text
Context complete
SkillRelation complete
RuntimeEvidence ≥ 1
ParentVersion available
```

点击：

```text
Confirm Evidence
```

执行：

```text
evidenceEngine.createEvidence()
```

然后 Event：

```text
LOCAL_EVIDENCE_CREATED
```

---

# 46. Evidence 发送动画

User 端：

```text
LE-2048
LOCAL
```

Card 缩小到右上角。

随后：

```text
Sending Governance Signal
```

Event Pulse 飞出。

同时 Developer 接收。

---

# 47. Evidence-only 分支

Evidence 完成后：

```text
Create Local Governance?
```

按钮：

```text
Create Local Rule

Evidence Only
```

Evidence Only：

```text
navigate back Agent Workspace
```

不创建 Local Contract。

这一点符合专利允许 Evidence 存在而 Local Contract 选择性生成的设计。

---

# 48. U03 Local Governance Builder

Route：

```text
/user/:userId/governance/new?evidence=LE-2048
```

---

## Component Tree

```text
<LocalGovernanceBuilder>
  <OriginEvidenceBanner />

  <RuleBuilder>
    <PredicateBuilder />
    <RelationshipBuilder />
    <ScopeSelector />
  </RuleBuilder>

  <DependencyPreview />

  <EffectiveImpactPreview />

  <ValidationPanel />
</LocalGovernanceBuilder>
```

---

# 49. Rule Builder 行为

用户选择：

```text
WHEN
Task Type = Official Filing

AND
Source Requirement = Official

THEN
Priority

IRSearch
>
WebSearch
```

每一次修改：

```text
governanceEngine.previewLocalRule()
```

实时更新右侧：

```text
Matched Agents
12

Matched Tasks
4

Blocked By Global Invariant
No
```

---

# 50. Dependency Preview

创建前自动计算：

```text
Parent Global: GC-v18

Skill Version:
WebSearch 3.1
IRSearch 2.4

Relationship:
PRIORITY

Context Schema:
official_filing
```

点击依赖项：

```text
Explain
```

Drawer 展示：

```text
This dependency allows future global changes
to determine whether the local rule
must be revalidated.
```

这对应专利将依赖信息用于后续确定受影响局部治理状态。

---

# 51. Create Local Contract

点击后先：

```text
VALIDATING
```

真实检查：

```text
validateAgainstInvariant()
validateScope()
validateDependency()
detectLocalConflict()
```

成功：

```text
ACTIVE
```

失败：

```text
Validation Error
```

---

# 52. U04 My Governance

Route：

```text
/user/:userId/governance
```

---

## 页面结构

顶部：

```text
Active
Stale
Revalidating
Active Refinement
Conflict
Retired
```

下方：

```text
GovernanceTable
```

---

# 53. Table Columns

```text
Contract
Rule
Scope
Parent
State
Updated
```

点击 State：

```text
<StateExplanationPopover />
```

---

# 54. Contract Detail Drawer

不离开页面。

Drawer：

```text
600px
```

Tabs：

```text
Overview
Dependency
Origin
History
```

---

# 55. U05 Governance Updates

Route：

```text
/user/:userId/updates
```

收到：

```text
GLOBAL_CONTRACT_PUBLISHED
```

以后自动生成 Update。

---

# 56. Update Card

```text
GC-v18 → GC-v19

Relationship Added
official_filing
IRSearch > WebSearch

Your Impact
1 Local Contract
```

按钮：

```text
Review Impact
```

---

# 57. User Dependency Check 动画

点击 Review：

系统逐项检查：

```text
ParentContract
SkillVersion
Relationship
ContextSchema
```

UI：

```text
Checking Parent Contract...
✓

Checking Skill Relationship...
✓ MATCH

Checking Skill Version...
—

Checking Context Schema...
✓
```

匹配后：

```text
AFFECTED
```

---

# 58. 状态迁移

Local Contract：

```text
ACTIVE
```

旁边出现：

```text
Validation basis changed
```

随后：

```text
ACTIVE
→ STALE
```

约 450ms。

再过 600ms：

```text
Queued for Revalidation
```

---

# 59. U06 Revalidation Detail

Route：

```text
/user/:userId/revalidation/:contractId
```

---

## Component Tree

```text
<RevalidationPage>
  <RevalidationHeader />

  <RevalidationStepper />

  <GlobalDiffPanel />

  <LocalContractPanel />

  <ContextEvaluationPanel />

  <ResolutionPanel />
</RevalidationPage>
```

---

# 60. 四个 Revalidation Step

```text
1 Load New Global State

2 Compare Governance

3 Evaluate Local Context

4 Resolve State
```

---

# 61. Case A：Retired

Step 2：

```text
Local Coverage by Global
100%
```

Step 3：

```text
Local-specific Context
None
```

Step 4：

三种候选同时显示：

```text
Retired
Active Refinement
Conflict
```

逐个排除：

```text
Conflict
× compatible

Active Refinement
× no local-specific conditions
```

最后：

```text
Retired
✓
```

---

# 62. Case B：Active Refinement

Rule Split：

```text
Local Rule

Shared Part
official_filing → IRSearch

Local-specific Part
internal_resource → InternalDB
```

动画：

```text
Shared Part
→ absorbed by Global

Local Part
→ retained
```

最后自动生成：

```text
ACTIVE_REFINEMENT
```

---

# 63. Case C：Conflict

Merge Preview：

```text
Global
IRSearch > WebSearch

Local
WebSearch Only
```

中央：

```text
Attempting Merge
```

动画失败：

```text
INCOMPATIBLE
```

进入：

```text
CONFLICT
```

---

# 64. U07 Conflict Resolver

Route：

```text
/user/:userId/conflicts/:contractId
```

---

## 三列布局

```text
GLOBAL       CONFLICT       LOCAL
```

下方：

```text
Resolution Strategy
```

---

# 65. Resolution Strategies

```text
Retire Local Rule

Refine Context

Rebuild Local Governance
```

---

# 66. Refine Context

例如从：

```text
Web Search Only
```

变成：

```text
IF IRSearchUnavailable = true
THEN WebSearch
```

提交后：

```text
CONFLICT
↓
VALIDATING
↓
ACTIVE_REFINEMENT
```

---

# 第六篇：Developer Console 页面详细规格

# 67. D01 Governance Overview

Route：

```text
/developer
```

---

## Component Tree

```text
<DeveloperDashboard>
  <GlobalStateHeader />

  <MetricGrid />

  <GovernanceSignalPanel />

  <EvidenceActivity />

  <RecentGlobalChanges />

  <GovernanceHealth />
</DeveloperDashboard>
```

---

# 68. 顶部状态

```text
Global Governance
v18

Skills
1,024

Global Contracts
248

Local Contracts Observed
38,125
```

---

# 69. Governance Signal Panel

实时：

```text
New Evidence
61

Evidence Clusters
8

Promotion Ready
1

Conflicts
2
```

如果 User 新建 Evidence：

```text
New Evidence
61 → 62
```

数字滚动。

---

# 70. Developer 实时提示

User A 产生 Evidence：

Header Notification：

```text
New Governance Signal
```

Inbox badge：

```text
12 → 13
```

Activity Timeline：

```text
LE-2048 received
User A
```

三处同步。

---

# 71. D02 Governance Inbox

Route：

```text
/developer/inbox
```

Tabs：

```text
All
Evidence
Clusters
Candidates
Conflicts
```

---

# 72. Inbox Card

Evidence：

```text
LOCAL SIGNAL

LE-2048

Official Filing Routing

User A

WebSearch ↔ IRSearch
```

Cluster：

```text
PROMOTION READY

C-0182

38 Users
61 Evidence
```

---

# 73. D03 Evidence Intelligence

Route：

```text
/developer/evidence
```

采用：

```text
Macro Overview
+
Cluster Canvas
```

---

# 74. Evidence Cluster Canvas

React Flow 实现。

初始：

```text
LE-A   LE-B   LE-C
```

相似 Evidence 自动向 Cluster 中心靠拢。

形成：

```text
C-0182
```

---

# 75. Cluster 吸附动画

每条新 Evidence：

```text
0ms
Evidence enters

200ms
similarity scan

400ms
connector appears

650ms
card moves toward cluster

900ms
cluster count updates
```

---

# 76. Why Grouped

点击 Edge：

Drawer：

```text
Similarity Analysis

Skill Pair
Match

Violation
Match

Context
93%

Version
Compatible

Resolution
Match
```

---

# 77. Promotion Score

真实计算示例：

```ts
promotionScore =
  frequency * 0.25 +
  coverage * 0.25 +
  resolutionAgreement * 0.30 +
  evidenceQuality * 0.20
```

专利对具体评分公式不限定，但文本示例也是组合重复频率、覆盖范围、治理结果一致性和证据质量形成升级评分。

---

# 78. Promotion Threshold Animation

```text
Score
0.72
```

新增 Evidence 后：

```text
0.72
→
0.77
```

阈值：

```text
0.75
```

越过时：

```text
PROMOTION READY
```

Cluster Outer Ring 点亮一次。

---

# 79. D04 Candidate Review

Route：

```text
/developer/candidates/:candidateId
```

---

## Layout

```text
45% Evidence
55% Governance Proposal
```

底部固定 Decision Bar。

---

# 80. Decision Buttons

```text
Need More Evidence

Keep Local

Reject

Modify

Approve
```

Approve 为主按钮。

---

# 81. Need More Evidence

执行：

```text
candidate.state =
NEEDS_MORE_EVIDENCE
```

同时 Cluster：

```text
continue collecting
```

达到更高阈值再次提醒。

---

# 82. Keep Local

原因必填：

```text
Private Resource
User-specific Permission
Organization-specific Context
Insufficient Coverage
Other
```

状态：

```text
LOCAL_ONLY
```

专利明确避免单一用户特殊资源环境被错误提升为共享全局约束。

---

# 83. D05 Global Contract Editor

Route：

```text
/developer/contracts/new?candidate=GGC-102
```

---

## Component Tree

```text
<GlobalContractEditor>
  <CandidateOrigin />

  <GovernanceRuleBuilder />

  <ContractClassSelector />

  <LocalOverridePolicy />

  <VersionPreview />

  <ImpactSummary />
</GlobalContractEditor>
```

---

# 84. Rule Class

```text
Global Default

Global Invariant
```

选择 Global Invariant 后自动展开：

```text
Local Override

Forbidden
Allowed With Conditions
```

对应专利中 `OverridePermission=0` 时局部规则不能放宽全局约束。

---

# 85. D06 Impact Analysis

Route：

```text
/developer/impact/:draftId
```

这是整个 Developer Console 的核心展示页之一。

---

## Component Tree

```text
<ImpactAnalysisPage>
  <VersionDiff />

  <ImpactMetrics />

  <DependencyScanPanel />

  <DependencyGraph />

  <AffectedContractDrawer />

  <PublishBar />
</ImpactAnalysisPage>
```

---

# 86. Version Diff

顶部：

```text
GC-v18
→
GC-v19
```

新增规则：

```text
+ Predicate
  official_filing

+ Priority
  IRSearch > WebSearch
```

---

# 87. Run Impact Analysis

按钮：

```text
Run Impact Analysis
```

执行：

```ts
dependencyEngine.findAffectedContracts(
  changeSet,
  allLocalContracts
)
```

---

# 88. Dependency Matching

逻辑：

```ts
affected =
  parentContractChanged ||
  skillVersionChanged ||
  relationshipChanged ||
  contextSchemaChanged
```

这正对应专利列出的受影响条件。

---

# 89. 扫描 UI

```text
Parent Contract
Scanning...
→ 18

Skill Version
Scanning...
→ 2

Relationship
Scanning...
→ 8

Context Schema
Scanning...
→ 1
```

---

# 90. 图节点颜色状态

不要只用颜色，同时带 Symbol：

```text
Changed
◆

Affected
●

Unaffected
○

Conflict Potential
!
```

---

# 91. Affected Counter

动画：

```text
0
5
17
24
29
```

最终：

```text
Affected 29

Unaffected 4,792
```

---

# 92. D07 Propagation Monitor

Route：

```text
/developer/propagation/:changeSetId
```

发布以后自动进入。

---

## Phase Header

```text
GLOBAL PROPAGATION

Phase 1
Commit

Phase 2
Dependency

Phase 3
Invalidation

Phase 4
Revalidation
```

当前 Phase 高亮。

---

# 93. Phase 1 Commit

```text
GC-v18
↓
GC-v19
```

成功：

```text
COMMITTED
```

---

# 94. Phase 2 Propagation

中央：

```text
ΔG-19
```

向多个 User Domain 发射 Event Pulse。

---

# 95. Phase 3 Invalidation

统计：

```text
29 Local Contracts

ACTIVE
↓
STALE
```

每次迁移：

```text
Affected 29
Stale 0 → 7 → 18 → 29
```

---

# 96. Phase 4 Revalidation

结果：

```text
Retired
21

Active Refinement
6

Conflict
2
```

动态 Funnel。

---

# 97. D08 Dependency Network

Route：

```text
/developer/dependencies
```

支持：

```text
Search Skill
Search Contract
Search User
```

Filter：

```text
ParentContract
Version
Relationship
Context
```

---

# 98. Graph 层级

默认：

```text
Global Contract
↓
Skill / Relationship
↓
Local Contract
↓
User / Agent
```

点击 Local Contract：

```text
Detail Drawer
```

---

# 99. D09 Global Contract Detail

Route：

```text
/developer/contracts/:contractId
```

Tabs：

```text
Rule

Origin

Impact

Dependency

History
```

---

# 100. Origin Lineage

```text
Runtime Evidence
61
↓
Evidence Cluster
C-0182
↓
Candidate
GGC-102
↓
Global Contract
GC-1001
```

每个节点可点击。

---

# 101. Impact

```text
Affected Local Contracts
29

Retired
21

Active Refinement
6

Conflict
2
```

---

# 102. D10 Governance History

Route：

```text
/developer/history
```

使用：

```text
Event Timeline
```

而非普通 Table。

---

# 103. Timeline Item

```text
12:36:11

GC-v19 Published

Origin
GGC-102

Affected
29 Local Contracts

[ Replay Evolution ]
```

---

# 第七篇：Demo Launcher

# 104. M01 Demo Launcher

Route：

```text
/demo
```

---

## 页面布局

```text
Scenario

Window Setup

Animation

Dataset

Controls
```

---

# 105. Scenario Selector

```text
01 Evidence to Global

02 Three Local Outcomes

03 Skill Version Update

04 Global Invariant

05 Local-only Governance

06 Mass Skill Update
```

---

# 106. Window Setup

```text
Developer
1

Users
[ 3 ]

User Profiles

✓ User A
✓ User B
✓ User C
```

---

# 107. Launch

点击：

```text
Launch Demo
```

执行：

```text
reset all
↓
load fixture
↓
open developer
↓
open users
↓
broadcast scenario initialized
```

---

# 108. Reset All

广播：

```text
DEMO_RESET
```

所有 Store：

```text
clear()
loadFixture()
```

页面状态返回初始。

---

# 第八篇：四个真实 Governance Engine

# 109. Evidence Engine

职责：

```text
Runtime
→ Structured Evidence
```

---

# 110. Evidence Detection

输入：

```text
RuntimeExecution
Correction
ResultEvaluation
```

规则示例：

```ts
if (
  correctionOccurred &&
  alternateSkillSucceeded &&
  originalSkillResultQuality < threshold
) {
  detectGovernanceOpportunity()
}
```

---

# 111. Evidence Aggregation

Cluster Key 示例：

```ts
skillPair +
violationType +
contextSignature +
compatibleVersions
```

然后计算：

```text
Independent Users
Evidence Count
Agreement
Coverage
Quality
```

---

# 112. Governance Engine

职责：

```text
Evidence Cluster
→ Candidate
→ Contract
```

以及：

```text
Global + Local + Context
→ Effective Governance
```

---

# 113. Effective Governance

专利中：

```text
Global Invariant
AND
Resolve(
  Global Default,
  Local Refinement
)
```



前端逻辑可简化为：

```ts
function resolveGovernance(
  globalInvariant,
  globalDefaults,
  localRefinements,
  context
) {
  enforce(globalInvariant)

  return resolveBySpecificity(
    globalDefaults,
    localRefinements,
    context
  )
}
```

---

# 114. Dependency Engine

输入：

```text
GlobalChangeSet
Local Contracts
```

输出：

```text
Affected Local Contracts
```

---

# 115. Dependency 判断

```ts
function isAffected(
  contract: GovernanceContract,
  delta: GlobalChangeSet
) {
  return (
    parentAffected(contract, delta) ||
    skillVersionAffected(contract, delta) ||
    relationshipAffected(contract, delta) ||
    contextSchemaAffected(contract, delta)
  )
}
```

---

# 116. Revalidation Engine

输入：

```text
New Global Governance
Local Contract
Current Local Context
Original Evidence
```

专利要求重验证至少考虑新的 Global Governance、Skill Version、当前 Context、原 Skill Relationship、原 Runtime Evidence 与 Local Resolution。

---

# 117. Revalidation 决策

```ts
if (globalFullyCoversLocal) {
  return "RETIRED"
}

if (
  compatible &&
  hasLocalSpecificConditions
) {
  return "ACTIVE_REFINEMENT"
}

return "CONFLICT"
```

---

# 第九篇：Fixture 设计

# 118. Dataset 目录

```text
/fixtures/base

skills.json
users.json
agents.json

global-contracts.json
local-contracts.json

evidence.json
clusters.json

runtime-scenarios.json
```

---

# 119. Demo Skill

至少真实建模：

```text
skill-web-search
skill-ir-search
skill-pdf-extraction
skill-ocr
skill-internal-finance
```

其余 Skill 批量生成。

---

# 120. Web Search

```json
{
  "id": "skill-web-search",
  "name": "Web Search",
  "version": "3.1",
  "category": "Search"
}
```

---

# 121. IR Search

```json
{
  "id": "skill-ir-search",
  "name": "Investor Relations Search",
  "version": "2.4",
  "category": "Financial Search"
}
```

---

# 122. Initial Global State

```text
Version
v18

No official_filing priority rule
```

---

# 123. User A Initial Local State

```text
No relevant Local Contract
```

首次运行后生成：

```text
LC-A
official_filing
IRSearch > WebSearch
```

---

# 124. User B Local Rule

为了后续演示 ActiveRefinement：

```text
official_filing
→ IRSearch

IF
internal_resource=true
→ InternalFinancialDB
```

---

# 125. User C Local Rule

用于 Conflict：

```text
official_filing
→ WebSearch only
```

---

# 第十篇：核心 Scenario 的精确编排

# 126. Scenario 01

## Evidence → Global

初始：

```text
Global v18
No routing governance
```

---

# 127. User A

执行任务。

结果：

```text
WebSearch selected
↓
non-official result
↓
user correction
↓
IRSearch succeeds
↓
LE-A
↓
LC-A
```

---

# 128. User B

相同过程。

生成：

```text
LE-B
```

---

# 129. User C

生成：

```text
LE-C
```

---

# 130. Developer

Cluster：

```text
Independent users
3

Agreement
100%
```

达到 Demo Threshold：

```text
Promotion Ready
```

---

# 131. Candidate

```text
official_filing
→ IRSearch > WebSearch
```

---

# 132. Publish

```text
v18
→
v19
```

随后进入 Scenario 02。

---

# 133. Scenario 02

## Three Local Outcomes

Global：

```text
official_filing
IRSearch > WebSearch
```

---

# 134. User A

Local 完全相同：

```text
RETIRED
```

---

# 135. User B

Local 包含内部资源：

```text
ACTIVE_REFINEMENT
```

---

# 136. User C

Local 强制 WebSearch：

```text
CONFLICT
```

---

# 137. Scenario 03

## Skill Version

Initial：

```text
PDF Extraction
v2.3
```

Local workaround：

```text
scanned_pdf
→ OCR
→ PDF Extraction
```

更新：

```text
2.3 → 2.4
```

v2.4 原生支持扫描 PDF。

Dependency Match：

```text
SkillVersion
```

结果：

```text
RETIRED
```

与专利实施例二保持一致。

---

# 第十一篇：页面过渡设计

# 138. 页面跳转三层原则

## Layer 1

小型解释：

```text
Tooltip
Popover
```

---

## Layer 2

深入但不离开当前任务：

```text
Drawer
Modal
Overlay
```

---

## Layer 3

业务阶段变化：

```text
Full Page Navigation
```

---

# 139. 不应该跳页的行为

```text
Why?
Runtime Trace
Dependency Detail
Evidence Origin
Version Diff
Contract Detail
```

使用 Drawer。

---

# 140. 应该跳页的行为

```text
Build Evidence
Create Contract
Review Candidate
Impact Analysis
Conflict Resolution
```

属于新业务阶段。

---

# 141. 页面返回策略

每一个 Full Page 都保存：

```text
originRoute
```

例如：

```text
Evidence Builder
```

完成后返回：

```text
Agent Workspace
```

而不是固定 Dashboard。

---

# 第十二篇：动画与业务事件映射

# 142. USER_TASK_STARTED

视觉：

```text
Chat insert
Runtime Stepper starts
```

---

# 143. LOCAL_EVIDENCE_CREATED

视觉：

```text
Evidence Card finalized
↓
Pulse leaves User Window
↓
Developer Inbox +1
```

---

# 144. PROMOTION_THRESHOLD_REACHED

视觉：

```text
Cluster Score crosses threshold
↓
Ring pulse
↓
PROMOTION READY
↓
Developer notification
```

---

# 145. GLOBAL_CONTRACT_PUBLISHED

视觉：

```text
Version commit
↓
ΔG created
↓
Propagation Wave
↓
User update notification
```

---

# 146. LOCAL_CONTRACT_MARKED_STALE

视觉：

```text
Dependency matched
↓
Validation basis explanation
↓
ACTIVE → STALE
```

---

# 147. REVALIDATION_STARTED

视觉：

```text
STALE
↓
Queued
↓
REVALIDATING spinner
```

---

# 148. LOCAL_CONTRACT_RETIRED

视觉：

```text
Global coverage = 100%
↓
Local-specific = none
↓
RETIRED
```

---

# 第十三篇：异常与边界交互

# 149. Evidence 不足

Cluster：

```text
Evidence 2
```

阈值不足。

显示：

```text
INSUFFICIENT EVIDENCE
```

不是 Error。

---

# 150. Context 不一致

例如：

```text
User A
official filing

User B
general company news
```

不能同 Cluster。

UI：

```text
Evidence not grouped
Reason:
Context mismatch
```

---

# 151. Version 不兼容

```text
WebSearch 3.1
vs
WebSearch 5.0
```

可以建立：

```text
Separate Version Cluster
```

或者：

```text
Version compatibility score LOW
```

---

# 152. Global Invariant 冲突

User 创建 Local Rule 时立即：

```text
BLOCKED BY GLOBAL INVARIANT
```

不允许先 Active 再 Conflict。

因为这是创建时已经能够判断的边界。

---

# 153. Global Publish 无受影响 Local

Impact：

```text
Affected
0
```

Publish 仍然允许。

Propagation：

```text
No local governance invalidated
```

---

# 第十四篇：大量数据场景

# 154. 大数据 Fixture

模拟：

```text
Skills
1,024

Users
10,000

Agents
24,000

Local Contracts
38,125

Evidence
121,893
```

实际上只存必要 Sample。

其余通过 Seeder 生成。

---

# 155. Seeder

```ts
generateSkills(1024)

generateUsers(10000)

generateContracts({
  count: 38125
})
```

使用固定 Seed：

```text
42
```

确保每次生成一致。

---

# 156. 虚拟列表

大规模 Table 必须：

```text
Virtualized List
```

避免真实渲染数万 DOM。

---

# 157. Mass Propagation

业务可以一次计算 2,481 个 Affected。

动画只选择：

```text
30 Representative Nodes
```

其余使用 Counter 表示。

不能真的给 2,481 个节点全部做 DOM 动画。

---

# 第十五篇：Governance Explanation System

# 158. 所有重大对象都有 Explain

统一组件：

```text
<ExplainButton />
```

文案：

```text
Why?
```

或：

```text
Explain
```

---

# 159. Contract State Explain

```text
Current State
STALE

Because
Global Relationship changed

Dependency
official_filing routing

Original Basis
GC-v18

New Basis
GC-v19
```

---

# 160. Skill Routing Explain

```text
Why IR Search?

Planner
0.78

Global Governance
+0.22

Local Refinement
0

Final
1.00
```

---

# 161. Promotion Explain

```text
Why Global?

Independent Users
38

Coverage
17%

Agreement
91%

Evidence Quality
92%

Score
0.86 > 0.75
```

---

# 第十六篇：Governance Replay

# 162. Replay Architecture

任何关键实体都有：

```text
Replay
```

系统从 Event Log 中读取：

```text
correlationId
```

形成一条完整 Chain。

---

# 163. Replay 示例

```text
LE-2048 Created
↓
Cluster C-0182
↓
Promotion Ready
↓
GGC-102
↓
GC-v19
↓
LC-A Stale
↓
LC-A Retired
```

---

# 164. Replay Controls

```text
Play

Pause

Previous

Next

0.5×

1×

2×
```

---

# 第十七篇：完整路由表

# 165. User

```text
/user/:userId

/user/:userId/agent/:agentId

/user/:userId/evidence

/user/:userId/evidence/:evidenceId

/user/:userId/evidence/new/:runtimeId

/user/:userId/governance

/user/:userId/governance/new

/user/:userId/updates

/user/:userId/revalidation/:contractId

/user/:userId/conflicts/:contractId

/user/:userId/history
```

---

# 166. Developer

```text
/developer

/developer/inbox

/developer/evidence

/developer/evidence/:clusterId

/developer/candidates

/developer/candidates/:candidateId

/developer/contracts

/developer/contracts/new

/developer/contracts/:contractId

/developer/impact/:draftId

/developer/propagation/:changeSetId

/developer/dependencies

/developer/skills

/developer/history
```

---

# 167. Demo

```text
/demo
```

---

# 第十八篇：状态 Store 结构

# 168. Global Store

```ts
interface GovernanceStore {
  globalVersion: string

  skills: Record<string, Skill>

  users: Record<string, User>

  agents: Record<string, Agent>

  runtimes: Record<string, RuntimeExecution>

  evidence: Record<string, LocalEvidence>

  clusters: Record<string, EvidenceCluster>

  candidates: Record<string, GlobalGovernanceCandidate>

  globalContracts: Record<string, GovernanceContract>

  localContracts: Record<string, GovernanceContract>

  changeSets: Record<string, GlobalChangeSet>

  events: GovernanceEvent[]
}
```

---

# 169. Presentation Store

单独：

```ts
interface PresentationStore {
  activeAnimations: AnimationTask[]

  notifications: NotificationItem[]

  focusedEntity?: EntityReference

  playbackSpeed: number

  replayMode: boolean
}
```

---

# 第十九篇：Animation Orchestrator

# 170. Orchestrator API

```ts
interface AnimationOrchestrator {
  play(event: GovernanceEvent): void

  enqueue(task: AnimationTask): void

  pause(): void

  resume(): void

  setSpeed(speed: number): void
}
```

---

# 171. Global Publish Sequence

```ts
sequence([
  "commit-version",
  "show-global-delta",
  "dependency-scan",
  "show-affected-contracts",
  "broadcast-user-update",
  "state-active-to-stale",
  "start-revalidation",
  "show-revalidation-results"
])
```

---

# 172. 为什么需要 Orchestrator

否则 Component 中会出现：

```ts
setTimeout(...)
setTimeout(...)
setTimeout(...)
```

最后动画顺序很难维护。

应当：

```text
业务产生 Event
↓
Orchestrator 映射到 Animation Sequence
↓
组件只负责播放当前动画
```

---

# 第二十篇：开发阶段拆分

# 173. Sprint 1

完成：

```text
Monorepo
Domain Model
Fixture
Stores
Event Bus
Demo Launcher
```

暂时不追求完整动画。

---

# 174. Sprint 2

User：

```text
Agent Workspace
Runtime Simulation
Correction
Evidence Builder
Local Builder
```

完成：

```text
User → Evidence
```

---

# 175. Sprint 3

Developer：

```text
Inbox
Evidence Cluster
Promotion
Candidate
```

完成：

```text
Evidence → Candidate
```

---

# 176. Sprint 4

完成：

```text
Global Contract
Impact Analysis
Dependency Engine
Publish
```

---

# 177. Sprint 5

完成：

```text
User Governance Update
Stale
Revalidation
Retired
Refinement
Conflict
```

---

# 178. Sprint 6

完成：

```text
Effective Governance
Second Runtime
Why This Skill
```

至此完整专利闭环成立。

---

# 179. Sprint 7

增加：

```text
Mass Skill Demo
Replay
Animation Polish
Large Dataset
```

---

# 第二十一篇：核心验收用例

# 180. TC-01 单用户不能自动 Global

Given：

```text
User A
1 Evidence
```

Then：

```text
Global Contract unchanged
```

Developer 只看到：

```text
Local Signal
```

---

# 181. TC-02 多用户达到 Threshold

Given：

```text
User A/B/C
same issue
```

When：

```text
Promotion Score > Threshold
```

Then：

```text
PROMOTION_READY
```

---

# 182. TC-03 Global Publish 定位正确 Local

Given：

```text
4,821 Local Contracts
```

When：

```text
Relationship changes
```

Then：

```text
only matching dependency contracts affected
```

专利明确要求不是对全部 Local Governance 无差别重新处理。

---

# 183. TC-04 Full Coverage

Global 完整覆盖 Local：

```text
RETIRED
```

---

# 184. TC-05 Partial Coverage

仍存在 Local-specific Context：

```text
ACTIVE_REFINEMENT
```

---

# 185. TC-06 Incompatible

Global 与 Local 无法兼容：

```text
CONFLICT
```

---

# 186. TC-07 Global Invariant

Local 尝试放宽：

```text
BLOCKED
```

---

# 187. TC-08 Effective Governance

Global v19 发布后重新运行：

```text
IRSearch selected
```

点击：

```text
Why?
```

能追溯到：

```text
GC-v19
```

---

# 第二十二篇：最终 5 分钟 Demo 的精确演出顺序

# 188. 屏幕布局

推荐：

```text
Developer 60%

User A 20%
User B 20%
```

第二屏：

```text
Developer
User A
User B
User C
```

---

# 189. 第 1 分钟

User A：

```text
Run
↓
WebSearch
↓
Wrong result
↓
Correction
↓
Evidence
```

Developer：

```text
Inbox +1
```

---

# 190. 第 2 分钟

User B、C：

```text
Evidence arrives
```

Developer Cluster：

```text
1
↓
2
↓
3 users
```

Score：

```text
0.48
↓
0.63
↓
0.81
```

越阈值：

```text
PROMOTION READY
```

---

# 191. 第 3 分钟

Developer：

```text
Candidate
↓
Approve
↓
Impact Analysis
```

展示：

```text
4,821 scanned
29 affected
```

然后：

```text
Publish
```

---

# 192. 第 4 分钟

多 User 同时：

```text
Global Update
```

User A：

```text
ACTIVE
→ STALE
→ RETIRED
```

User B：

```text
ACTIVE
→ STALE
→ ACTIVE_REFINEMENT
```

User C：

```text
ACTIVE
→ STALE
→ CONFLICT
```

---

# 193. 第 5 分钟

User A 再运行。

原：

```text
WebSearch 0.81
IRSearch 0.78
```

Global Governance 生效：

```text
WebSearch
0.81 → 0.40

IRSearch
0.78 → 1.00
```

最后：

```text
IR Search Selected
```

点击：

```text
Why?
```

完成整个专利闭环。

---

# 第二十三篇：最终工程设计原则总结

系统必须始终满足以下六项设计纪律。

## 一、Runtime 可观察

治理必须可以追溯到真实运行。

## 二、Evidence 结构化

不能退化成普通用户反馈或 Error Log。

## 三、Global 升级有条件

不能单一 Local Evidence 直接影响全局。

## 四、Local Contract 有依赖

必须知道其依赖的 Global、Skill Version、Relationship 和 Context。

## 五、Global Change 主动传播

不依赖用户再次出错才发现旧 Local Rule 失效。

## 六、Local Governance 有生命周期

不能无限累积。

必须经历：

```text
Active
→ Stale
→ Revalidating
→ Retired / ActiveRefinement / Conflict
```

这六项共同对应当前专利提出的双端治理核心。专利最终概括的三项主要机制正是：证据升级、依赖传播以及局部状态消解。

---

# 第二十四篇：V4.0 后的直接开发目标

完成本规格以后，下一步不应该继续大范围讨论产品概念。

可以正式进入：

```text
UI Component Implementation
+
Fixture Implementation
+
Governance Engine Implementation
+
Interactive Demo Implementation
```

第一版开发目标不是“拥有所有产品能力”。

而是确保以下链条已经真实可运行：

```text
Runtime
→
Evidence
→
Local Governance
→
Cross-user Aggregation
→
Global Candidate
→
Global Contract
→
Dependency Analysis
→
Local Stale
→
Revalidation
→
Retired / Refinement / Conflict
→
Effective Governance
→
New Runtime
```

一旦这一闭环能够在 Developer Console 与多个 User Console 之间连续、可解释、可重放地运行，系统就已经不再只是专利概念展示，而是一套具有明确产品形态的 **Skill Governance Control Plane 原型**。