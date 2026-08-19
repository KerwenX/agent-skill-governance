# Agent Skill 双端协同治理——具体实施例与演示场景矩阵

> 面向专利说明、产品演示与技术答辩的场景化实施例文档  
> 项目基线：[KerwenX/agent-skill-governance](https://github.com/KerwenX/agent-skill-governance)，提交 [5349bac](https://github.com/KerwenX/agent-skill-governance/commit/5349bac5c5231dc857e1cff7da85adbd386d35fe)（2026-08-19）  
> 文档版本：V1.0，2026-08-19

---

## 0. 文档目的与边界

本文件将“运行证据上行、全局治理演化、治理变化下行、局部重验证”转换为可讲述、可操作、可观察的企业业务场景。文中的企业、人员和业务数据均为拟真示例，不对应特定真实客户；其目的不是宣称生产部署，而是说明技术机制如何解决真实业务中会发生的问题。

应特别区分以下三种“支持”：

| 标识 | 含义 | 演示口径 |
| --- | --- | --- |
| **A｜可直接演示** | 当前仓库已有页面、数据、状态流和自动剧本，基本不改代码即可展示 | 可以在正式演示中承诺“当前 Demo 已覆盖” |
| **B｜核心已具备** | 类型、样例数据或治理引擎已有实现，但缺少独立剧情、完整输入或端到端页面串联 | 可以展示原理；应说明还需补少量交互或剧本 |
| **C｜需要补功能** | 目前主要停留在类型定义、规则展示或方案层，缺少真实运行执行器、证据闭环或专用页面 | 适合作为后续实施例和产品路线，不宜声称当前已完整实现 |

当前仓库是 React/TypeScript 前端演示系统。它可以验证治理对象、状态变化和交互逻辑，但不等同于生产环境中的身份鉴权、跨租户隔离、持久化审计或真实 Skill 调度平台。

---

## 1. 核心场景矩阵

| 编号 | 企业业务问题 | 治理方向 | 关系/约束 | 关键状态与结局 | 当前项目可演示性 | 建议演示入口 |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | 证券研究团队查询上市公司官方 10-Q，Agent 错选通用搜索并返回媒体转载 | Local → Global | PRIORITY | Evidence → Cluster → Candidate → Global v19 | **A** | 当前 25 步自动演示主线 |
| S02 | 全局“官方公告优先 IR”发布后，三类用户本地规则被批量重新判断 | Global → Local | Dependency + Revalidation | STALE → RETIRED / ACTIVE_REFINEMENT / CONFLICT | **A** | 影响分析、传播监控、A/B/C 用户端 |
| S03 | 保险理赔扫描件先 OCR 再抽取；PDF Extraction 2.4 升级后原补丁失去必要性 | 版本升级重验证 | ORDER + SkillVersion | ACTIVE → STALE → REVALIDATING → RETIRED | **B** | 已有 LC-B-PDF、检测和重验证分支；需补独立剧本 |
| S04 | 企业财务 Agent 试图读取内部财务库，但会话没有 finance:read 权限 | Global Invariant | PERMISSION | 本地放宽请求被阻止，Skill 不得执行 | **B** | 已有 GC-1000 和权限解析逻辑；需补运行候选与授权交互 |
| S05 | 医疗机构私有病历只能在院内处理，不能送入外部云端总结 Skill | Local-only 不升级 | ISOLATION | LOCAL_ONLY / ACTIVE_REFINEMENT | **C** | 需补隔离执行器、Local-only 判定与租户资源模型 |
| S06 | 交易终端网络策略屏蔽 IR 站点，但新全局规则要求优先访问 IR | Global → Local 冲突 | PRIORITY vs EXCLUSION | CONFLICT → RETIRE / REFINE / REBUILD | **A** | User C 冲突解决器 |
| S07 | 买方研究团队在通用官方财报规则上，还需追加内部投研资源条件 | 局部细化 | REFINE / PRIORITY | ACTIVE_REFINEMENT | **A（状态）/C（组合执行）** | User B 重验证结局；真实 Internal DB 组合执行需补 |
| S08 | 某用户的“官方财报优先 IR”本地规则已被新全局规则完全吸收 | 规则退役 | Coverage=FULL | RETIRED | **A** | User A 治理页与闭环复跑 |
| S09 | 实时行情服务超时后，应切换到 15 分钟延迟行情并显著标注时效性 | 运行时回退 | FALLBACK | Primary failed → Fallback used → Evidence | **C（已有静态契约）** | 已有 GC-1014 与 Skill 数据；需补超时、回退执行和证据 |
| S10 | 供应商准入时，必须先标准化主体，再做制裁筛查，最后才允许写入采购系统 | 组合顺序治理 | ORDER + PERMISSION | 顺序违规 → 修正 → Local/Global Contract | **C** | 需新增 Skills、运行链追踪、顺序校验与演示页面 |

### 1.1 覆盖检查

| 要求项 | 对应场景 |
| --- | --- |
| Local → Global | S01 |
| Global → Local | S02、S06 |
| 版本升级重验证 | S03 |
| Global Invariant | S04 |
| Local-only 不升级 | S05 |
| 冲突 | S06 |
| 局部细化 | S07 |
| 规则退役 | S08 |
| Fallback | S09 |
| Order | S03、S10 |
| Permission | S04、S10 |
| Isolation | S05 |

---

## 2. 双端治理的可视化总览

### 2.1 从真实运行问题到持续治理闭环

~~~mermaid
flowchart LR
    subgraph U["用户端局部治理域"]
        T["真实业务任务"]
        R["Agent Runtime"]
        A["异常或用户纠正"]
        E["结构化 Local Evidence"]
        L["Local Contract"]
        V["局部重验证"]
    end

    subgraph G["治理协调层"]
        C["跨用户证据聚类"]
        P["升级评分与版本兼容性"]
        D["依赖扫描"]
    end

    subgraph DEV["开发者端全局治理域"]
        CA["Global Candidate"]
        RV["开发者评审"]
        GC["Global Contract / Global Change"]
    end

    T --> R --> A --> E
    E --> L
    E --> C --> P
    P -->|"达到升级条件"| CA --> RV --> GC
    P -->|"用户特有或覆盖不足"| L
    GC --> D --> V
    L --> V
    V -->|"退役"| RT["RETIRED"]
    V -->|"保留特有条件"| RF["ACTIVE_REFINEMENT"]
    V -->|"方向不兼容"| CF["CONFLICT"]
    RT --> R
    RF --> R
    CF --> RS["冲突消解"] --> R
~~~

### 2.2 主线时序

~~~mermaid
sequenceDiagram
    participant UA as User A Runtime
    participant UB as User B Runtime
    participant UC as User C Runtime
    participant GS as Governance Service
    participant DC as Developer Console

    UA->>UA: 查询官方 10-Q，误选 WebSearch
    UA->>GS: 修正为 IRSearch，提交 Evidence A
    UB->>GS: 相同问题，提交 Evidence B
    UC->>GS: 相同问题，提交 Evidence C
    GS->>GS: 聚类、独立用户计数、结果一致性评分
    GS->>DC: 生成 Global Candidate
    DC->>GS: 审批并发布 v19
    GS-->>UA: 依赖命中，重验证
    GS-->>UB: 依赖命中，重验证
    GS-->>UC: 依赖命中，重验证
    UA->>UA: 完全覆盖，Local Contract 退役
    UB->>UB: 保留 internal_resource 条件
    UC->>UC: 与全局方向冲突，进入 Resolver
~~~

### 2.3 依赖传播与重验证

~~~mermaid
flowchart TD
    CH["Global ChangeSet"]
    CH --> P["Parent Contract changed"]
    CH --> S["Skill Version changed"]
    CH --> R["Skill Relationship changed"]
    CH --> X["Context Schema changed"]
    P --> HIT["Affected Local Contracts"]
    S --> HIT
    R --> HIT
    X --> HIT
    HIT --> ST["ACTIVE → STALE"]
    ST --> RE["REVALIDATING"]
    RE --> Q1{"新全局是否完全覆盖？"}
    Q1 -->|"是"| RET["RETIRED"]
    Q1 -->|"否"| Q2{"关系是否兼容？"}
    Q2 -->|"兼容且有本地特有条件"| REF["ACTIVE_REFINEMENT"]
    Q2 -->|"不兼容"| CON["CONFLICT"]
~~~

### 2.4 Local Contract 生命周期

~~~mermaid
stateDiagram-v2
    [*] --> ACTIVE
    ACTIVE --> STALE: 全局契约、Skill 版本、关系或上下文模式变化
    STALE --> REVALIDATING: 自动或人工启动重验证
    REVALIDATING --> RETIRED: 新全局完全覆盖
    REVALIDATING --> ACTIVE_REFINEMENT: 兼容且仍有本地特有条件
    REVALIDATING --> CONFLICT: 与新全局关系不兼容
    CONFLICT --> RETIRED: 接受全局规则
    CONFLICT --> ACTIVE_REFINEMENT: 缩小作用域或改为 Fallback
    CONFLICT --> ACTIVE: 重建本地规则
    RETIRED --> [*]
~~~

---

## 3. 具体实施例

## 3.1 实施例一：证券研究中的“官方财报来源”从局部纠正升级为全局规则

**治理主题：Local → Global；PRIORITY；当前项目可直接演示。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | 林某，券商研究所股票分析师；陈某，买方投研助理；周某，交易台交易员；Skill 平台治理工程师 |
| 业务背景 | 三个独立团队都使用研究 Agent 查询上市公司最新季度报告。报告必须来自上市公司 Investor Relations 页面或监管披露页面，媒体转述不能作为正式底稿来源。 |
| 初始 Skill / 规则 | Web Search 3.1 与 Investor Relations Search 2.4 均可命中“10-Q”；全局版本 v18 尚无 official_filing 场景的明确优先规则。规划器给 Web Search 0.81、IR Search 0.78。 |
| 用户输入 | “查一下英伟达最新的官方季度财报（10-Q）。” |
| Agent 初始行为 | 因通用关键词覆盖更广，Agent 选择 Web Search，返回 Reuters、CNBC 等二手报道。 |
| 异常 | 结果内容可能正确，但来源不是官方披露，违反研究底稿的来源要求。异常类型为 OfficialSourceRoutingMismatch。 |
| 用户纠正或系统检测 | 用户点击“修正”，选择 Investor Relations Search；系统获得 investor.nvidia.com 的官方公告，并识别出成功纠正。 |
| Evidence | 记录任务类型 official_filing、来源要求 official、初选 Skill、纠正 Skill、非官方结果片段、用户纠正、Skill 版本、父全局版本和质量分。 |
| Local Contract | 当 taskType=official_filing 且 sourceRequirement=official 时，IRSearch 的优先级高于 WebSearch。规则先只对当前用户生效。 |
| Global Candidate / Change | 三个独立用户证据被聚为同一关系问题；当前 Demo 展示 independentUserCount=3、resolutionAgreement=100%、promotionScore=0.78，高于阈值 0.75。系统生成 GGC，开发者审批后发布全局 v19。 |
| Dependency | 每个 Local Contract 保存 Parent Contract、IRSearch/WebSearch 版本、PRIORITY 关系和 official_filing 上下文模式。 |
| Revalidation | v19 发布后，依赖扫描定位 A/B/C 的相关本地规则，并依次进入 STALE 与 REVALIDATING。 |
| 最终效果 | 此后相同任务中 IRSearch 获得全局治理加权并胜出，直接返回官方来源；局部经验转化为共享能力。 |
| Demo 看点 | “结果不算错但来源不合规”是企业真实问题；观众能看到原始评分、用户修正、结构化证据、聚类阈值、候选审批、版本升级和复跑前后差异。 |

**适用说明。** 该实施例同时适合专利说明中的“运行证据驱动升级”、产品演示中的主剧情，以及技术答辩中的“为什么不是人工配置一条静态规则”。

---

## 3.2 实施例二：全局 v19 下发后，对三类本地规则产生三种结局

**治理主题：Global → Local；Dependency；RETIRED / ACTIVE_REFINEMENT / CONFLICT；当前项目可直接演示。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | Skill 平台治理工程师；User A 普通研究员；User B 使用内部投研资源的买方团队；User C 受交易终端网络白名单约束的交易员 |
| 业务背景 | 开发者刚发布“官方财报优先 IRSearch”的全局规则。平台不能简单覆盖所有用户规则，因为三名用户的本地上下文并不相同。 |
| 初始 Skill / 规则 | A 的本地规则与新全局规则完全相同；B 的规则额外包含 internal_resource=true；C 的规则因终端屏蔽 IR 站点而排除 IRSearch。 |
| 用户输入 | 无需用户再次输入；触发源是 Global ChangeSet v18 → v19。 |
| Agent 初始行为 | 变更发布前，三份 Local Contract 均处于 ACTIVE，并参与各自 Agent 的路由。 |
| 异常 | 如果全局发布后仍让旧本地规则无条件生效，会出现重复规则、过期补丁或方向冲突。 |
| 用户纠正或系统检测 | 系统根据 Parent Contract、SkillVersion、Relationship 和 ContextSchema 自动执行依赖扫描。 |
| Evidence | 使用原 Local Evidence、原 Local Contract、当前用户上下文和新全局契约作为重验证输入。 |
| Local Contract | LC-A：共享条件；LC-B：共享条件 + internal_resource；LC-C：EXCLUSION WebSearch/IRSearch 的相反方向关系。 |
| Global Candidate / Change | v19 ChangeSet 包含新增 Global Contract、PRIORITY 关系和 official_filing 上下文变化。 |
| Dependency | A/B/C 都命中变化的关系或上下文模式，因此进入 affectedContractIds。 |
| Revalidation | A 完全覆盖 → RETIRED；B 部分覆盖且兼容 → ACTIVE_REFINEMENT；C 方向不兼容 → CONFLICT。 |
| 最终效果 | 全局治理获得一致性，本地差异没有被粗暴抹除，真正实现“共享默认 + 用户细化 + 冲突显式化”。 |
| Demo 看点 | 在同一次全局发布后连续切换三个用户窗口，展示三个不同结局；这是双端协同治理区别于普通远程配置下发的核心画面。 |

---

## 3.3 实施例三：保险理赔扫描件处理规则因 Skill 升级而退役

**治理主题：版本升级重验证；ORDER；当前项目核心逻辑已具备。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | 保险理赔审核员；文档智能平台开发者；理赔 Agent |
| 业务背景 | 理赔材料包含医院盖章的扫描版诊断证明、发票和费用清单。旧版 PDF Extraction 只能解析带文本层的 PDF，直接处理扫描件会得到空文本。 |
| 初始 Skill / 规则 | OCR 1.7、PDF Extraction 2.3；本地规则 LC-B-PDF 规定 scanned_pdf 场景必须执行 OCR → PDF Extraction。 |
| 用户输入 | “解析这份住院理赔扫描件，提取住院日期、诊断、总费用和发票号。” |
| Agent 初始行为 | Agent 先调用 PDF Extraction 2.3，返回空字段或低文本覆盖率。 |
| 异常 | 扫描件缺少文本层，关键字段提取率低于业务阈值；异常类型 ScannedPDFMissingPreprocess。 |
| 用户纠正或系统检测 | 审核员选择“先 OCR”，随后再做 PDF 结构化抽取；系统确认关键字段恢复。 |
| Evidence | 保存文件类型 scanned_pdf、原执行链、空文本比例、纠正后的 OCR 置信度、字段召回率、OCR/PDF Skill 版本和父全局版本。 |
| Local Contract | WHEN taskType=scanned_pdf，THEN OCR BEFORE PDF Extraction；依赖 PDF Extraction 2.3 与 OCR 1.7。 |
| Global Candidate / Change | 此问题可先保留本地。之后开发者发布 PDF Extraction 2.4，声明原生支持扫描 PDF，并形成包含 changedSkills=skill-pdf-extraction@2.4 的 ChangeSet。 |
| Dependency | SkillVersion 从 2.3 变为 2.4，直接命中 Local Contract 的版本依赖。 |
| Revalidation | ACTIVE → STALE → REVALIDATING；回归测试确认 2.4 单独执行已能达到字段质量阈值，原 ORDER 补丁被完全覆盖，规则转为 RETIRED。 |
| 最终效果 | 避免每份材料重复 OCR，降低延迟和调用成本，同时保留可审计的退役原因。 |
| Demo 看点 | 同一输入在升级前后执行链从“两步”缩为“一步”；能直观解释为什么 Local Contract 必须记录 Skill 版本。 |

**当前实现差距。** 仓库已有 LC-B-PDF 样例、扫描件证据检测分支、SkillVersion 依赖扫描和 2.4 退役判断，但当前自动剧本没有串联该路径，扫描件工作台也未完整提供 PDF/OCR 候选及执行结果。补一条专用剧本和运行输入即可形成完整演示。

---

## 3.4 实施例四：企业财务数据访问不能被本地规则绕过

**治理主题：Global Invariant；PERMISSION；当前项目核心规则已具备。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | 区域财务经理；财务分析 Agent；企业数据安全管理员 |
| 业务背景 | Internal Financial DB 包含未公开预算、费用和利润数据，只允许持有 finance:read 权限的会话访问。业务部门希望 Agent 自动生成月度偏差分析。 |
| 初始 Skill / 规则 | 全局 GC-1000 为 INVARIANT：Internal Financial DB requires finance:read，overridePermission=false。 |
| 用户输入 | “读取华东区本月实际费用与预算，分析偏差最大的五个成本中心。” |
| Agent 初始行为 | 规划器因数据相关性高而把 Internal Financial DB 排在首位，但当前会话 permission=[]。 |
| 异常 | 如果按规划器结果直接执行，会发生越权读取；这不是普通质量问题，而是必须先于局部规则处理的安全边界。 |
| 用户纠正或系统检测 | Governance Resolver 检测到缺少 finance:read，将该 Skill 的有效分降为 0，并要求申请权限或改用已授权的汇总数据。 |
| Evidence | 保存会话主体、缺失权限、候选 Skill、阻断决策、未发起真实数据调用的审计轨迹。敏感数据本身不进入 Evidence。 |
| Local Contract | 某用户即使创建“月末关账任务允许直接访问内部库”的更具体规则，也不能放宽 Global Invariant。Local Builder 应返回 BLOCKED BY GLOBAL INVARIANT。 |
| Global Candidate / Change | 不产生放宽权限的候选；如果大量合法用户被误阻断，只能形成“权限模型需调整”的开发者待办，仍须由安全管理员发布新的全局权限规则。 |
| Dependency | 依赖 Permission Model、主体角色、Skill 身份和 GC-1000 版本。 |
| Revalidation | 权限模型或角色映射变化时重新验证；只有会话实际获得 finance:read 后，本地细化规则才有资格参与后续路由。 |
| 最终效果 | 业务效率优化不能突破企业访问控制；阻断发生在 Skill 调用之前，且可审计。 |
| Demo 看点 | 先展示高 plannerScore，再展示治理不变量把候选置零；随后尝试创建本地放宽规则并被拒绝。 |

**当前实现差距。** 仓库已有 GC-1000、PERMISSION 关系、finance:read 检查和 Local Builder 的不变量阻断提示，但工作台当前没有把 Internal Financial DB 放入该任务的真实候选链，也没有授权申请/重试剧情。因此适合做规则原理展示，补少量 UI 和剧本后可成为完整短演示。

---

## 3.5 实施例五：医院私有病历与外部云端 Skill 的隔离规则只保留在本地

**治理主题：Local-only；ISOLATION；当前项目需要补功能。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | 三甲医院科研医生；院内医疗 Agent；医院数据保护官；公共 Skill 平台开发者 |
| 业务背景 | 医生需要结合院内去标识化病历与公开指南做回顾性研究。医院合同规定：即使数据已去标识化，原始病历片段仍不得发送到外部云端总结服务。其他客户没有相同网络与合规条件。 |
| 初始 Skill / 规则 | Private EHR Search 仅院内可用；Cloud Summarizer 为共享外部服务；全局治理没有禁止所有客户组合这两个 Skill。 |
| 用户输入 | “汇总本院过去两年某类术后并发症，并与公开指南建议比较。” |
| Agent 初始行为 | Agent 计划先检索院内病例，再把原始片段交给 Cloud Summarizer。 |
| 异常 | 数据流越过医院信任边界；问题只与该院资源拓扑、合同和网络边界有关，不应成为全平台默认规则。 |
| 用户纠正或系统检测 | 数据出口代理检测目标为 external_cloud 且输入标签为 clinical_private，阻断传输；用户选择院内部署的 Local Summarizer。 |
| Evidence | 仅记录数据分类标签、源/目标信任域、阻断原因、替代 Skill 成功结果和策略版本，不上传病历正文。 |
| Local Contract | WHEN resource.classification=clinical_private，ISOLATE PrivateEHR from CloudSummarizer；允许 PrivateEHR → LocalSummarizer。 |
| Global Candidate / Change | 聚类只覆盖一个组织，且上下文签名包含 hospital_private_network。升级评分不足，标记 LOCAL_ONLY，不生成全局候选。 |
| Dependency | 依赖本院 Resource Topology、Data Classification Schema、Local Summarizer 版本和数据出口策略。 |
| Revalidation | 当医院更换院内总结器或数据分类标准更新时重验证；只影响该医院租户。 |
| 最终效果 | 满足本地合规要求，同时避免把一家医院的隔离政策错误施加给所有客户。 |
| Demo 看点 | 突出“Evidence 可以上报，但敏感内容不上报”；开发者端看到 LOCAL_ONLY 的理由，而不是只看到“未达阈值”。 |

**建议补充。** 增加 ISOLATION 运行执行器、资源信任域标签、脱敏 Evidence、LOCAL_ONLY 决策理由和租户级数据流视图。

---

## 3.6 实施例六：交易终端网络限制与新全局规则发生显式冲突

**治理主题：冲突；PRIORITY vs EXCLUSION；当前项目可直接演示。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | 交易员周某；交易终端 Agent；Skill 平台治理工程师 |
| 业务背景 | 交易终端只允许访问白名单域名，上市公司 IR 站点未被放行。User C 曾建立“官方财报任务只走 Web Search”的本地规则，以确保任务至少能够完成。 |
| 初始 Skill / 规则 | Local LC-C-01：official_filing 场景排除 IRSearch；Global v18 没有相反规则。 |
| 用户输入 | “查一下英伟达最新的官方季度财报（10-Q）。” |
| Agent 初始行为 | v18 下依照本地 EXCLUSION，只调用 WebSearch。 |
| 异常 | v19 新增 Global PRIORITY：IRSearch > WebSearch；本地规则排除的恰好是全局优先 Skill，二者方向不兼容。 |
| 用户纠正或系统检测 | v19 下行后，关系依赖命中；Merge 判定为 INCOMPATIBLE，Local Contract 进入 CONFLICT。 |
| Evidence | 原网络限制、原运行结果、本地排除关系、新全局关系及合并失败说明共同构成冲突证据。 |
| Local Contract | 冲突前为 EXCLUSION；用户可选择退役、缩小作用域或重建。 |
| Global Candidate / Change | 已发布的 v19 不因单个终端限制而回滚。该限制属于局部部署环境问题。 |
| Dependency | Relationship 与 official_filing ContextSchema 均命中。 |
| Revalidation | compatible=false、coverage=PARTIAL、result=CONFLICT。若选择 REFINE，则增加 irSearchUnavailable=true，并把本地关系改为 WebSearch fallback。 |
| 最终效果 | 全局默认保持正确；受限终端通过显式守卫条件保留可运行路径，冲突不再被静默覆盖。 |
| Demo 看点 | 冲突解决器并排显示 Global、Merge、Local；可现场选择 RETIRE、REFINE 或 REBUILD，解释治理系统不会替用户擅自做高风险决策。 |

---

## 3.7 实施例七：买方投研的内部资源条件作为局部细化继续保留

**治理主题：局部细化；ACTIVE_REFINEMENT；当前项目可展示状态结局。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | 买方基金投研助理陈某；研究 Agent；内部数据平台管理员 |
| 业务背景 | 所有研究员都应从上市公司官网获取官方财报，但该基金还购买了内部标准化财务数据库，需要在特定会话中追加内部历史口径和一致预期数据。 |
| 初始 Skill / 规则 | LC-B-01 同时含共享条件 official_filing/official 和本地条件 internal_resource=true。 |
| 用户输入 | “拉取苹果最新 10-Q，并用内部一致预期口径计算收入超预期幅度。” |
| Agent 初始行为 | 先按本地规则选择 IRSearch；带 internal_resource 的会话还需要内部数据。 |
| 异常 | 如果 v19 发布后直接退役整个本地规则，内部资源条件会丢失；如果完全保留，又会重复表达共享优先关系。 |
| 用户纠正或系统检测 | 重验证引擎比较新全局规则与本地 Predicate，识别 internal_resource 为用户特有条件。 |
| Evidence | 原官方来源纠正证据、内部资源标签、相关 Skill 版本、权限上下文和结果质量。 |
| Local Contract | 共享部分由 v19 吸收，本地仅保留 internal_resource=true 等更具体条件。 |
| Global Candidate / Change | v19 只发布跨用户一致的 IRSearch 优先关系，不吸收单个机构的内部资源拓扑。 |
| Dependency | Parent Global、IR/Web Skill 版本、internal_resource ContextSchema；若真实调用内部库，还应增加 Permission 与资源依赖。 |
| Revalidation | coverage=PARTIAL、compatible=true、localSpecificConditions 非空，因此结果为 ACTIVE_REFINEMENT。 |
| 最终效果 | 全平台获得一致的官方来源默认规则，该基金仍保留自己的数据增强流程。 |
| Demo 看点 | 对比 User A 的 RETIRED 与 User B 的 ACTIVE_REFINEMENT，解释“局部规则不是全部保留或全部删除”的细粒度消解。 |

**当前实现边界。** Demo 已能展示 internal_resource 条件被保留及 ACTIVE_REFINEMENT 状态；但“追加 Internal Financial DB 并完成复合计算”的真实执行链尚未完整编码，答辩时应将其表述为待补的组合运行能力。

---

## 3.8 实施例八：重复本地补丁被全局能力完整覆盖后自动退役

**治理主题：规则退役；Coverage=FULL；当前项目可直接演示。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | User A 研究员；Skill 平台治理工程师；研究 Agent |
| 业务背景 | User A 早期为了解决非官方来源问题，创建了个人本地规则。随后相同问题在多个用户中被证实，平台发布全局规则。 |
| 初始 Skill / 规则 | LC-A 与新全局规则具有相同 Predicate 和 PRIORITY 关系，没有额外权限、资源或环境条件。 |
| 用户输入 | 触发重验证的是 v19 发布；验证完成后再次输入同一条 10-Q 查询。 |
| Agent 初始行为 | 发布前由 LC-A 修正规划器；若 LC-A 永久存在，会造成重复治理、解释链冗余和后续维护负担。 |
| 异常 | 规则内容不再错误，但已冗余。冗余本地补丁也是治理债务。 |
| 用户纠正或系统检测 | 系统计算新全局规则对 LC-A 的覆盖率为 FULL，且没有 Local-specific Predicate。 |
| Evidence | 使用 LC-A 的来源证据、Predicate、关系、依赖和 v19 内容，无需新的用户纠正。 |
| Local Contract | 状态由 ACTIVE 经 STALE、REVALIDATING 转为 RETIRED；保留审计记录但不再参与运行。 |
| Global Candidate / Change | Global v19 已吸收原规则语义。 |
| Dependency | official_filing ContextSchema 与 IRSearch/WebSearch PRIORITY 关系命中。 |
| Revalidation | coverage=FULL、compatible=true、localSpecificConditions=[]。 |
| 最终效果 | 再次运行时只由全局规则加权，IRSearch 得分从 0.78 提升到 1.00，WebSearch 降至 0.61；结果更简洁、治理来源更统一。 |
| Demo 看点 | “退役不等于删除”：治理页仍能看到历史来源和退役原因，运行时则不再重复应用。 |

---

## 3.9 实施例九：实时行情超时后回退到延迟行情并强制提示

**治理主题：FALLBACK；当前项目已有静态契约，运行闭环需补。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | 盘中风控分析师；行情 Agent；市场数据平台运维人员 |
| 业务背景 | 风控分析师查询组合实时估值。Realtime Stock Query 偶发超时；Cached Market Quote 可返回 15 分钟延迟行情，但不能伪装成实时价格。 |
| 初始 Skill / 规则 | 全局 GC-1014：market_quote 场景下 Realtime Stock Query 为主，Cached Market Quote 仅作失败回退。 |
| 用户输入 | “给出当前组合前十大持仓的实时价格和当日涨跌幅。” |
| Agent 初始行为 | 首先调用 Realtime Stock Query。 |
| 异常 | 上游返回 503 或超过 2 秒 SLA。若直接失败，业务不可用；若静默使用缓存，则可能导致错误交易判断。 |
| 用户纠正或系统检测 | Runtime 检测 timeout/5xx，触发 FALLBACK；结果头部强制标注“15 分钟延迟，不得用于下单”。 |
| Evidence | 主 Skill 响应码、耗时、回退触发原因、缓存数据时间戳、用户是否接受、最终任务完成状态。 |
| Local Contract | 某低延迟交易团队可增加本地细化：“延迟超过 5 分钟则不允许回退，只返回失败”；普通研究团队允许 15 分钟缓存。 |
| Global Candidate / Change | 多次超时证据可形成可靠性候选，例如调整超时阈值或增加第二实时供应商；不能把一次局部网络故障直接升级为全局。 |
| Dependency | 主/备 Skill 版本、健康状态模型、SLA、数据新鲜度 Schema 和用户风险等级。 |
| Revalidation | 新实时供应商上线或缓存时效规则变化时，重新验证各团队的本地回退策略。 |
| 最终效果 | 提高可用性，同时通过显式时效标签防止“可用但误导”的结果。 |
| Demo 看点 | 同一任务先展示主服务超时，再自动切换；画面上同时出现 Fallback 原因、数据时间戳和风险提示。 |

**当前实现差距。** 仓库已定义 FALLBACK 关系、Realtime/Cached 两个 Skill 和 GC-1014，但有效治理解析器尚未执行 FALLBACK，工作台也没有行情候选、超时注入和回退证据。该场景需要新增运行执行器与专用演示剧情。

---

## 3.10 实施例十：供应商准入必须按顺序执行主体标准化、制裁筛查与写入

**治理主题：ORDER + PERMISSION；当前项目需要补功能。**

| 要素 | 具体内容 |
| --- | --- |
| 角色 | 跨国制造企业采购专员；供应商准入 Agent；合规官；ERP 管理员 |
| 业务背景 | 新供应商写入 ERP 前，必须先把中英文名称、统一社会信用代码和母子公司关系标准化，再执行制裁与关联方筛查。只有通过筛查且持有 vendor:write 权限的会话才能建档。 |
| 初始 Skill / 规则 | Entity Normalizer、Sanctions Screening、ERP Vendor Writer；初始仅有各 Skill 独立描述，没有明确组合顺序。 |
| 用户输入 | “把附件中的 28 家供应商导入采购系统，并创建准入记录。” |
| Agent 初始行为 | 规划器为了尽快完成任务，先调用 ERP Vendor Writer，再异步执行筛查；部分供应商名称未标准化。 |
| 异常 | 未筛查实体已进入 ERP；同一公司因别名未归一而漏过制裁命中；属于高风险顺序违规。 |
| 用户纠正或系统检测 | 事务监控发现 WRITE 事件早于 SCREEN_PASS，立即回滚本次写入；合规官选择正确链路 Normalize → Screen → Write。 |
| Evidence | 保存步骤时间戳、输入/输出 Schema、回滚结果、别名命中、筛查结论、操作者权限和纠正后成功链路。 |
| Local Contract | 初期在当前采购 Agent 中建立 ORDER：Normalizer BEFORE Screening BEFORE Writer；Writer 还要求 vendor:write。 |
| Global Candidate / Change | 多个业务单元出现同类问题后，形成全局 INVARIANT 候选：未经 SCREEN_PASS 不得调用 Writer；开发者和合规官联合审批。 |
| Dependency | 三个 Skill 版本、I/O Schema、ORDER 关系、Permission Model、制裁名单版本和事务回滚能力。 |
| Revalidation | Screening 输出字段或 Writer API 升级时，受影响 Local Contract 进入 STALE；回放历史安全样本后决定继续、细化或冲突。 |
| 最终效果 | 将合规要求编译成真实执行顺序和写权限门槛，而不是只在操作手册中提醒。 |
| Demo 看点 | 时间线先显示错误的 Write → Screen，再显示自动回滚与正确顺序；可直观看到 ORDER 和 PERMISSION 如何共同控制运行。 |

---

## 4. 推荐演示组合

## 4.1 10—15 分钟主线演示

推荐直接使用当前“官方财报”自动剧本，并把 25 个系统步骤压缩成六个讲述段落。目标不是逐页介绍功能，而是回答三个问题：规则从哪里来、为什么能成为全局规则、全局变化如何安全落到不同用户。

| 时间 | 操作 | 讲述重点 | 对应场景 |
| --- | --- | --- | --- |
| 0:00—1:00 | 展示 v18、Developer Console 和三个用户窗口 | 双端不是两个皮肤，而是全局治理域与局部治理域 | S01 |
| 1:00—3:30 | User A 查询 10-Q，观察 WebSearch 返回媒体来源；纠正为 IRSearch | “答案可能没错，但证据来源不满足业务标准” | S01 |
| 3:30—5:30 | 生成结构化 Evidence 与 Local Contract；快速展示 B、C 同类证据 | 先在本地解决，不因单个用户立即污染全局 | S01 |
| 5:30—8:00 | Developer 端查看聚类、0.78/0.75、候选、审批 | 独立用户数、结果一致性、质量和版本兼容性共同决定升级 | S01 |
| 8:00—10:00 | 影响分析、发布 v19、传播监控 | Global Change 不是广播文本，而是通过依赖图定位受影响规则 | S02 |
| 10:00—13:00 | 连续展示 A 退役、B 细化、C 冲突 | 同一全局变化产生三种可解释结局 | S06—S08 |
| 13:00—15:00 | User A 复跑同一任务；可选进入 User C Resolver | 证明规则真正改变 Runtime；以冲突消解或问答收尾 | S06、S08 |

### 主线演示建议旁白

1. **先讲损失。** “研究报告引用媒体转载，可能导致底稿不合规；问题不是搜索失败，而是 Skill 选择不符合业务语境。”
2. **再讲证据。** “用户纠正不是一条孤立反馈，而是带上下文、执行轨迹、Skill 版本和父全局版本的结构化证据。”
3. **强调审慎升级。** “一名用户先形成 Local Contract；多个独立用户证据一致后才产生 Global Candidate，且仍需开发者审批。”
4. **突出双向性。** “专利核心不止 User → Developer；发布后的 Developer → User 依赖传播和重验证才构成闭环。”
5. **以三种结局收束。** “覆盖则退役，兼容的特有条件继续细化，不兼容则显式冲突。”

## 4.2 3—5 分钟短演示

短演示只保留“错误选择—证据升级—三种结局”三个画面，可提前准备好聚类与发布后的状态。

| 时间 | 画面 | 一句话结论 |
| --- | --- | --- |
| 0:00—1:00 | User A 原始评分与非官方结果，随后纠正为 IRSearch | 真实运行纠正是治理证据的起点 |
| 1:00—2:00 | Developer 聚类卡：3 用户、100% 一致、0.78 ≥ 0.75 | 全局规则来自跨用户一致证据，不是单用户偏好 |
| 2:00—3:00 | v18 → v19 与依赖扫描 | 全局变化能主动找到受影响本地规则 |
| 3:00—4:30 | A/B/C 三种结果并排或快速切换 | 退役、细化、冲突是确定且可解释的重验证结局 |
| 4:30—5:00 | User A 复跑成功 | 治理最终进入真实 Runtime，而非停留在控制台 |

## 4.3 可选的第二条短演示

当完成少量补功能后，建议用 S03“保险扫描件”作为 3 分钟技术短演示：

1. PDF Extraction 2.3 直接处理扫描件失败；
2. 用户纠正为 OCR → PDF Extraction，形成 ORDER Local Contract；
3. 发布 PDF Extraction 2.4；
4. 依赖命中并重验证；
5. 旧补丁退役，执行链缩短。

该短线比主线更适合回答“为什么要记录 SkillVersion”和“规则为什么会过期”。

---

## 5. 针对当前项目的补功能优先级

| 优先级 | 建议 | 价值 | 涉及场景 |
| --- | --- | --- | --- |
| P0 | 保持并打磨现有官方财报 25 步主线，增加“一键跳到关键节点” | 当前最完整，直接服务产品演示和答辩 | S01、S02、S06—S08 |
| P1 | 补扫描 PDF 独立剧本：正确候选、OCR/PDF 执行结果、2.4 ChangeSet | 最小成本证明 SkillVersion 依赖与 ORDER 退役 | S03 |
| P1 | 补 Internal Financial DB 候选、permission 上下文和授权后重试 | 证明 Global Invariant 真正进入 Runtime | S04 |
| P1 | 在聚类引擎增加 LOCAL_ONLY 决策与原因码 | 回答“如何避免单用户特殊问题污染全局” | S05 |
| P2 | 在 resolveGovernance/Runtime 中实现 FALLBACK、ORDER、ISOLATION 的执行语义 | 从关系展示升级为真实调度约束 | S05、S09、S10 |
| P2 | 增加资源信任域、数据分类、脱敏 Evidence 与租户隔离视图 | 支撑医疗、金融等高合规场景 | S05 |
| P2 | 将 Revalidation 从当前特例判断扩展为通用 Predicate/Relation 覆盖与冲突算法 | 减少硬编码，增强技术答辩可信度 | 全部 |
| P3 | 增加后端持久化、权限服务、审计日志和真实 Skill Adapter | 从可视化 Demo 走向可验证原型或试点 | 全部 |

### 5.1 当前实现中需要谨慎表述的边界

1. 关系类型已经定义 PRIORITY、ORDER、EXCLUSION、FALLBACK、ISOLATION、PERMISSION，但当前有效运行解析主要覆盖 PRIORITY、部分 EXCLUSION 和 PERMISSION；“类型存在”不等于“端到端执行存在”。
2. LOCAL_ONLY 已存在于状态类型中，但现有聚类状态计算主要返回 EVALUATING 或 PROMOTION_READY，尚缺面向用户特有资源的完整判定策略。
3. 扫描 PDF 的 Evidence 和 Revalidation 分支已编码，仍缺完整工作台候选、结果和自动演示串联。
4. User B 的 internal_resource 能展示 ACTIVE_REFINEMENT，但实际“追加内部财务 Skill”的复合执行仍需补。
5. 当前 Demo 适合说明方法、状态与交互，不应把前端模拟的权限和隔离当成生产级安全控制。

---

## 6. 三种使用方式

## 6.1 用于专利说明

- 将 S01 作为“局部证据向全局治理升级”的主要实施例；
- 将 S02、S03 分别说明 Global Change 与 SkillVersion 两类依赖传播；
- 将 S04、S05 说明全局不可放宽约束与 Local-only 的边界；
- 将 S06—S08 说明重验证后的冲突、细化和退役；
- 将 S09、S10 证明方法不限于优先级关系，也适用于回退、顺序、权限和隔离。

专利表述应强调方法步骤、数据结构、状态转换和技术效果，避免把行业流程本身写成发明点。

## 6.2 用于产品演示

- 只选一条完整主线，不要在 15 分钟内切换多个行业；
- 每个画面都对应一个业务问题或治理决定；
- 所有评分都说明其用途，不把 0.78 当作不可解释的“AI 分数”；
- 明确指出当前可直接演示、核心已具备和未来能力的边界。

## 6.3 用于技术答辩

建议围绕以下问题准备回答：

1. 为什么单个用户纠正不能直接成为全局规则？
2. 如何保证多个证据来自独立用户，而不是重复会话？
3. Skill 版本不同的 Evidence 是否能进入同一聚类？
4. Global Invariant 与更具体的 Local Refinement 冲突时谁优先？
5. 如何证明某 Local Contract 被全局“完全覆盖”？
6. 冲突是自动裁决还是交给用户？哪些安全冲突不允许用户选择？
7. Evidence 中如何避免上传敏感业务数据？
8. Global Change 如何定位受影响 Local Contract，而不是全量重算？
9. FALLBACK、ORDER、ISOLATION 如何进入真实 Runtime，而不是只做展示？
10. 规则退役后如何保留审计与可追溯性？

---

## 7. 项目实现依据

本文件对“当前可演示性”的判断基于以下仓库内容：

| 依据 | 用途 |
| --- | --- |
| README.md 与 web/DEMO-完整演示文档.md | 确认当前自动演示主线、窗口与步骤 |
| web/src/app/demoScript.ts | 确认 25 步剧情和 A/B/C 三类结局 |
| web/src/domain/types.ts | 确认关系类型、Evidence、Contract、ChangeSet 和状态模型 |
| web/src/fixtures/base.ts | 确认 GC-1000、GC-1014、LC-B-PDF、A/B/C 用户和 Skill 样例 |
| web/src/engines/aggregation.ts | 确认升级评分和阈值逻辑 |
| web/src/engines/dependency.ts | 确认 ParentContract、SkillVersion、Relationship、ContextSchema 四类依赖 |
| web/src/engines/revalidation.ts | 确认 RETIRED、ACTIVE_REFINEMENT、CONFLICT 以及 PDF 2.4 分支 |
| web/src/engines/governance.ts | 确认优先级、不变量和权限解析的当前范围 |
| web/src/pages/user/UserGovernanceNew.tsx | 确认 Local Builder 与 Global Invariant 阻断界面 |
| web/src/pages/user/UserConflicts.tsx | 确认 RETIRE、REFINE、REBUILD 三种冲突处理策略 |

仓库在上述基线下已通过 TypeScript 与 Vite 生产构建。本文档的实施例可以作为下一阶段演示剧本、需求拆分、专利附图说明和测试用例设计的共同输入。
