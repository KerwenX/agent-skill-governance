# Agent Skill 双端协同治理——端到端完整实施例与演示设计

每个实施例设计为一条完整业务链。每条链至少包含：

1. 用户在真实业务任务中发起操作；
2. Agent 进行 Skill 检索、规划和执行；
3. 运行结果触发异常、用户纠正或系统阻断；
4. 系统形成结构化 Runtime Evidence；
5. 用户侧先产生 Local Contract，使问题在本地被及时解决；
6. 治理服务接收证据，执行脱敏、聚类、独立性和版本兼容性判断；
7. 开发者处理 Global Candidate，进行风险审查、影响分析和发布；
8. Global Change 根据依赖关系传播到受影响用户；
9. Local Contract 进入重验证，并产生退役、局部细化或冲突等不同结局；
10. 用户处理残余冲突，再次运行同一业务任务；
11. 系统用发布后的运行指标证明治理确实改善了 Runtime；
12. 后续 Skill、权限、资源或上下文变化再次触发治理演化。

因此，每个实施例都会组合 PRIORITY、ORDER、FALLBACK、PERMISSION、ISOLATION、EXCLUSION、Global Invariant、Local Refinement、Dependency 和 Revalidation 中的多种机制。

---

## 1. 完整实施例的统一阶段模型

~~~mermaid
flowchart LR
    P0["P0 业务准备<br/>角色、Skill、全局版本"]
    P1["P1 用户运行<br/>真实任务进入 Runtime"]
    P2["P2 异常与纠正<br/>结果、轨迹、反馈"]
    P3["P3 本地止损<br/>Evidence + Local Contract"]
    P4["P4 开发者治理<br/>聚类、候选、评审"]
    P5["P5 全局发布<br/>Global Contract + ChangeSet"]
    P6["P6 变化下行<br/>依赖扫描与重验证"]
    P7["P7 用户消解<br/>退役、细化、冲突处理"]
    P8["P8 闭环验证<br/>复跑、指标、审计"]
    P9["P9 后续演化<br/>版本、权限、资源再变化"]

    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8 --> P9
    P9 -.新证据.-> P2
~~~

### 1.1 双端交互责任

| 阶段 | 用户端责任 | 治理服务责任 | 开发者端责任 |
| --- | --- | --- | --- |
| 运行前 | 提供任务、会话身份、资源和环境上下文 | 加载有效全局规则与本地细化 | 发布可用 Skill、全局默认和不可放宽约束 |
| 异常发生 | 确认结果是否满足业务标准；必要时纠正 | 保存可审计轨迹，提取关系失效 | 无需预先知道每个用户的具体环境 |
| 本地止损 | 接受、编辑或拒绝 Local Contract | 立即使本地规则参与后续运行 | 接收脱敏 Evidence，不直接接管用户任务 |
| 全局治理 | 不因单次纠正影响其他用户 | 聚类、独立性校验、版本分层、升级评分 | 审查候选、确定 Default 或 Invariant、分析影响并发布 |
| 变化下行 | 处理本地残余条件和冲突 | 依赖扫描、状态迁移、重验证 | 观察传播结果，必要时回滚或补发规则 |
| 闭环验证 | 重跑原任务并确认业务效果 | 采集发布后指标和新 Evidence | 判断规则是否稳定、是否需要继续调整 |

---

## 2. 端到端场景矩阵

| 编号 | 完整业务主线 | 一条主线中组合的治理机制 | 最终用户结局 | 当前项目状态 |
| --- | --- | --- | --- | --- |
| E2E-01 | 证券研究官方财报来源治理 | PRIORITY、EXCLUSION、FALLBACK、Local→Global、Dependency、退役、细化、冲突 | A 退役、B 细化、C 冲突后改为条件回退 | **可直接演示主线** |
| E2E-02 | 保险理赔扫描件处理与 PDF Skill 升级 | ORDER、FALLBACK、版本兼容、分阶段全局发布、规则退役 | 标准扫描件规则退役，低质量传真保留 OCR 回退 | **核心已具备，需补剧本** |
| E2E-03 | 企业财务数据访问与临时授权 | Global Invariant、PERMISSION、局部组合、权限模型变更、重验证 | 合法委托恢复访问，未授权用户继续被阻断 | **核心已具备，需补授权链** |
| E2E-04 | 医疗私有数据隔离从 Local-only 演化为全局最小安全边界 | ISOLATION、LOCAL_ONLY、脱敏 Evidence、Global Invariant、Local Refinement、冲突 | 全局保护数据边界，各院保留自己的本地处理路径 | **需要补隔离执行器** |
| E2E-05 | 实时行情故障、缓存回退与交易台严格策略 | FALLBACK、数据新鲜度、局部严格化、冲突、供应商版本变化 | 研究用户使用带标签缓存，交易用户失败关闭或切备用源 | **已有静态契约，需补 Runtime** |
| E2E-06 | 供应商准入的标准化、制裁筛查与 ERP 写入 | ORDER、PERMISSION、Global Invariant、回滚、局部增强审查 | 标准规则全局化，高风险地区继续本地细化 | **需要新增业务 Skills** |
| E2E-07 | 客服退款的风险检查、审批权限与区域阈值 | ORDER、PERMISSION、FALLBACK、全局最小边界、区域细化 | 普通退款自动化，大额和高风险请求转人工审批 | **需要新增业务 Skills** |
| E2E-08 | 跨国营销内容在保密、法审和发布之间的治理 | ISOLATION、ORDER、PERMISSION、LOCAL_ONLY→Global、Fallback | 标准发布规则全局化，各地区保留模型和法审差异 | **需要新增业务 Skills** |

---

# 3. 完整实施例一：证券研究官方财报来源治理

## 3.1 实施目标

该实施例不是简单展示“IRSearch 优先于 WebSearch”，而是展示一条本地经验如何被多个用户重复验证，如何经过开发者评审成为全局规则，以及全局规则如何分别导致本地规则退役、保留和冲突。

## 3.2 角色、环境与初始状态

| 对象 | 初始设定 |
| --- | --- |
| User A | 券商研究员林某，普通公开信息研究环境 |
| User B | 买方投研助理陈某，会话可能附带 internal_resource=true |
| User C | 交易员周某，交易终端网络白名单屏蔽部分上市公司 IR 域名 |
| Developer | Skill 平台治理工程师，负责候选审查、影响分析与发布 |
| Skills | Web Search 3.1；Investor Relations Search 2.4；Internal Financial DB 4.2 |
| 初始全局状态 | v18，没有 official_filing 场景的明确优先关系 |
| 初始局部状态 | B 有内部资源条件；C 有排除 IRSearch 的终端适配规则；A 无本地规则 |

## 3.3 端到端操作链

| 步骤 | 参与方 | 真实操作与系统处理 | 形成的对象或状态 |
| --- | --- | --- | --- |
| 1 | User A | 输入“查一下英伟达最新的官方季度财报（10-Q）”。 | RuntimeExecution A-01 |
| 2 | Agent A | 提取 taskType=official_filing、sourceRequirement=official。规划器给 WebSearch 0.81、IRSearch 0.78，选择 WebSearch。 | Skill routing trace |
| 3 | Agent A | 返回 Reuters、CNBC 等报道。内容相关，但来源不是上市公司官方披露。结果评估器标记 non-official。 | ANOMALY_DETECTED |
| 4 | User A | 点击“修正”，将 Skill 改为 IRSearch；获得 investor.nvidia.com 的官方 10-Q。 | USER_CORRECTION |
| 5 | 用户端治理 | 把输入上下文、原始候选分、非官方结果、纠正 Skill、成功结果、Skill 版本和父全局版本结构化。 | Local Evidence LE-A |
| 6 | User A | 确认创建本地规则：官方披露任务中 IRSearch 优先于 WebSearch。下一次同类任务立即受保护。 | Local Contract LC-A ACTIVE |
| 7 | User B | 发起相同业务任务并经历相同纠正，但其 Evidence 还包含 internal_resource=true。 | LE-B + LC-B |
| 8 | User C | 发起相同任务；因终端不能访问 IR 站点，其现有规则强制 WebSearch。用户仍报告“官方来源无法满足”。 | LE-C + LC-C EXCLUSION |
| 9 | 治理服务 | 接收三份脱敏 Evidence，按 Skill Relation、Violation、Context Signature 和 SkillVersion 聚类；校验三名用户相互独立。 | EvidenceCluster IR |
| 10 | 治理服务 | 计算 independentUserCount=3、resolutionAgreement=100%、promotionScore=0.78，超过 0.75。 | PROMOTION_READY |
| 11 | Developer | 打开 Global Candidate，检查证据片段、用户覆盖、版本兼容性和误伤范围；将其定为 Global DEFAULT，而非不可放宽 Invariant。 | GGC UNDER_REVIEW |
| 12 | Developer | 运行影响分析，预览 LC-A、LC-B、LC-C 会受到关系或上下文模式变化影响；确认没有高风险阻断后批准。 | APPROVED + impact report |
| 13 | Developer | 发布全局 v19：WHEN official_filing AND official，THEN IRSearch PRIORITY OVER WebSearch。 | Global Contract + DELTA-19 |
| 14 | 治理服务 | 通过 ParentContract、Relationship 和 ContextSchema 扫描受影响本地规则，先将其标为 STALE，再进入 REVALIDATING。 | affectedContractIds |
| 15 | User A | 系统判定 LC-A 被 v19 完全覆盖，且不存在用户特有条件。 | LC-A RETIRED |
| 16 | User B | 系统判定共享优先关系被全局覆盖，但 internal_resource=true 仍是本地特有条件。 | LC-B ACTIVE_REFINEMENT |
| 17 | User C | 系统发现本地 EXCLUSION 排除的正是全局优先 Skill，自动合并失败。 | LC-C CONFLICT |
| 18 | User C | 在冲突解决器中选择“Refine Context”：仅当 irSearchUnavailable=true 时才使用 WebSearch 作为 Fallback；不再无条件排除 IRSearch。 | LC-C ACTIVE_REFINEMENT |
| 19 | User A | 再次运行原输入。v19 使 IRSearch 得分升至 1.00、WebSearch 降至 0.61，Agent 直接返回官方来源。 | SUCCEEDED + global rule hit |
| 20 | Developer | 观察发布后非官方来源异常率、用户纠正率和冲突处理率；若异常反升，可根据 ChangeSet 回滚。 | post-release metrics |

## 3.4 对象演化链

~~~mermaid
sequenceDiagram
    participant U as 用户 A/B/C
    participant R as Agent Runtime
    participant G as Governance Service
    participant D as Developer

    U->>R: 查询官方 10-Q
    R-->>U: WebSearch 返回非官方来源
    U->>R: 修正为 IRSearch
    R->>G: Evidence + Local Contract
    G->>G: 三用户聚类与升级评分
    G->>D: Global Candidate
    D->>D: 审查、影响分析、批准
    D->>G: 发布 v19
    G-->>U: 依赖命中与重验证
    Note over U,G: A=RETIRED，B=ACTIVE_REFINEMENT，C=CONFLICT
    U->>G: C 将冲突细化为条件 Fallback
    U->>R: 重跑原任务
    R-->>U: 直接返回官方披露
    R->>D: 发布后效果指标
~~~

## 3.5 演示与实现判断

- **当前项目可以完整展示步骤 1—20 的主干。**
- User C 的冲突解决器可以把规则改为带 irSearchUnavailable 的 Fallback。
- User B 可展示 ACTIVE_REFINEMENT 状态；但真正追加 Internal Financial DB 的复合执行仍需补充。
- 这是 10—15 分钟主线演示的首选实施例。

---

# 4. 完整实施例二：保险理赔扫描件治理与 Skill 版本升级

## 4.1 实施目标

展示一个局部 ORDER 修复如何先被提升为全局临时规则，又如何在基础 Skill 升级后继续发生第二次治理变化。该实施例包含两次 Global Change，而不是在“创建 OCR 顺序规则”时结束。

## 4.2 角色、环境与初始状态

| 对象 | 初始设定 |
| --- | --- |
| 用户 | 华东、华南和车险三个理赔团队的审核员 |
| Developer | 文档 Skill 团队和保险业务治理管理员 |
| Skills | PDF Extraction 2.3；OCR 1.7；Claim Field Validator 1.2 |
| 初始问题 | PDF Extraction 2.3 不能稳定处理无文本层扫描件 |
| 质量门槛 | 发票号、诊断、日期、金额四类字段召回率不低于 95% |

## 4.3 端到端操作链

| 步骤 | 参与方 | 真实操作与系统处理 | 形成的对象或状态 |
| --- | --- | --- | --- |
| 1 | 理赔审核员 | 上传医院扫描版诊断证明和费用发票，要求提取理赔字段。 | RuntimeExecution C-01 |
| 2 | Agent | 直接调用 PDF Extraction 2.3，得到空文本或金额字段缺失。Validator 给出字段召回率 41%。 | ANOMALY_DETECTED |
| 3 | 审核员 | 选择“先进行 OCR”，再运行 PDF Extraction 和字段校验。字段召回率提高到 97%。 | successful correction |
| 4 | 用户端治理 | 生成包含文件类型、图像质量、执行顺序、字段指标和版本的 Evidence。 | LE-CLAIM-A |
| 5 | 审核员 | 接受 Local Contract：scanned_pdf 时 OCR BEFORE PDF Extraction；低于 OCR 置信度阈值时转人工。 | ORDER + FALLBACK Local Contract |
| 6 | 其他团队 | 华南和车险团队分别出现相同问题，但车险传真件的图像质量更低，需要二次增强。 | LE-CLAIM-B/C |
| 7 | 治理服务 | 按 PDF 2.3/OCR 1.7 版本聚类，排除使用其他 PDF 引擎的证据，确认该问题具有跨团队共性。 | PROMOTION_READY |
| 8 | Developer | 审查候选后发布 v31 临时 Global DEFAULT：对 PDF Extraction 2.3 的 scanned_pdf 输入执行 OCR → PDF Extraction。 | GC-v31 ORDER |
| 9 | 治理服务 | v31 下行。普通团队的同类 Local Contract 被全局完全覆盖而 RETIRED；传真件团队保留 image_quality=low 的增强步骤。 | RETIRED + ACTIVE_REFINEMENT |
| 10 | Skill Developer | 发布 PDF Extraction 2.4，新增原生图像识别，声明标准扫描件无需外部 OCR。 | SkillVersion 2.3→2.4 |
| 11 | Developer | 先在影子流量中回放原 Evidence，确认标准扫描件召回率 97.5%，但低质量传真件只有 88%。决定不直接删除所有 OCR 规则。 | version validation report |
| 12 | Developer | 发布 v32：标准扫描件优先直接使用 PDF Extraction 2.4；若 native_confidence<0.92，则 Fallback 到 OCR → PDF Extraction。 | Global ChangeSet v32 |
| 13 | 治理服务 | changedSkills=pdf-extraction@2.4 命中所有相关 Local Contract；执行第二轮重验证。 | STALE → REVALIDATING |
| 14 | 普通理赔团队 | 旧 ORDER 规则被新 Skill 能力和 v32 完全覆盖，保持 RETIRED。 | no redundant OCR |
| 15 | 传真件团队 | image_quality=low 仍是本地特有条件，但与 v32 兼容，保留更严格 OCR 参数。 | ACTIVE_REFINEMENT |
| 16 | 某旧插件用户 | 其本地规则强制调用已停用的 OCR 1.5，与 v32 允许的版本范围冲突。用户需升级插件或转人工。 | CONFLICT |
| 17 | 用户 | 重跑历史样本，比较升级前后延迟、成本和字段准确率；确认标准扫描件从三步缩短为两步。 | closure evidence |
| 18 | Developer | 观察 7 天指标后正式退役 v31 临时规则，并保留 ChangeSet、回放样本和回滚点。 | governance cleanup |

## 4.4 两次全局变化

~~~mermaid
flowchart TD
    L["局部修复<br/>OCR → PDF 2.3"]
    G31["v31 临时全局 ORDER<br/>先 OCR 再抽取"]
    U24["PDF Extraction 2.4<br/>原生扫描识别"]
    G32["v32 新全局策略<br/>2.4 直读，低置信度回退 OCR"]
    R1["普通规则退役"]
    R2["低质量传真保留细化"]
    R3["旧 OCR 插件产生冲突"]

    L --> G31 --> U24 --> G32
    G32 --> R1
    G32 --> R2
    G32 --> R3
~~~

## 4.5 演示与实现判断

仓库已有 LC-B-PDF、扫描件 Evidence 检测、SkillVersion 依赖和 PDF 2.4 触发退役的核心分支。需要补充：

1. PDF/OCR 的真实候选与可视化执行链；
2. v31、v32 两次发布剧情；
3. 低置信度 Fallback；
4. 历史样本回放和前后指标。

---

# 5. 完整实施例三：企业财务数据访问与临时授权

## 5.1 实施目标

展示 Global Invariant 并不意味着“用户永远只能看到阻断”。完整流程应包括越权阻断、合法业务诉求上报、开发者修正权限模型、变化下行、用户重新认证和成功执行，同时保证未授权用户仍被阻断。

## 5.2 端到端操作链

| 步骤 | 参与方 | 真实操作与系统处理 | 形成的对象或状态 |
| --- | --- | --- | --- |
| 1 | 区域财务经理 | 输入“读取华东区本月实际费用与预算，分析偏差最大的五个成本中心”。 | finance_analysis task |
| 2 | Agent | Internal Financial DB 相关性最高，但当前会话 permission=[]。 | candidate score high |
| 3 | Governance Resolver | 先执行 GC-1000 Global Invariant：访问内部财务库必须有 finance:read。Skill 在调用前被置为不可用。 | PERMISSION_BLOCK |
| 4 | 用户 | 尝试创建“月末关账期间允许我的 Agent 访问内部库”的本地规则。 | local override request |
| 5 | Local Builder | 检测 overridePermission=false，拒绝保存能够放宽权限的 Local Contract；同时提供“申请临时授权”入口。 | BLOCKED BY GLOBAL INVARIANT |
| 6 | 用户 | 提交由集团财务负责人签发的 24 小时委托授权。身份系统返回 delegated_finance_read，但旧治理 Schema 只识别 finance:read。 | legitimate false denial |
| 7 | 用户端治理 | 形成不含敏感财务数据的 Evidence：主体、委托声明类型、阻断规则、授权有效期和失败原因。 | LE-PERM-A |
| 8 | 其他区域 | 多个具有合法委托的区域经理出现同类误阻断，形成一致 Evidence；普通未授权访问仍被正确阻断。 | evidence cluster |
| 9 | 治理服务 | 将“权限缺失”与“权限声明未映射”分为两个 Cluster，避免把越权请求混入候选。 | permission taxonomy |
| 10 | Developer + 安全管理员 | 审查委托签发者、有效期、撤销机制和审计要求，生成候选：delegated_finance_read 在有效委托期内映射为 finance:read。原 Invariant 不被放宽。 | Global Candidate |
| 11 | Developer | 运行影响分析，发现依赖 permission Schema 的 Local Contract 和 Agent；先灰度给财务沙箱，再发布 v21。 | Permission Model Change |
| 12 | 治理服务 | ContextSchema 和 Permission Model 变化下行；相关 Local Contract 进入 STALE/REVALIDATING。 | affected permission rules |
| 13 | 合法用户 | 重新认证后，会话获得有效 delegated_finance_read；Invariant 通过，内部库被调用。 | access allowed |
| 14 | 未授权用户 | 仍然没有任何可映射声明，继续被阻断。 | invariant preserved |
| 15 | 合法用户 | 创建允许的 Local Refinement：月末关账任务先查内部库，再调用 Report Exporter；导出前做部门级脱敏。该规则不能改变权限要求。 | ORDER + local refinement |
| 16 | Agent | 完成偏差分析并输出带权限来源、查询范围和脱敏级别的报告。 | successful runtime |
| 17 | 授权到期 | 身份系统撤销临时声明；Permission dependency 触发局部规则重验证。规则可保留，但在无权限会话中不再生效。 | permission-aware revalidation |
| 18 | Developer | 对比误阻断率、越权阻断率和临时授权审计完整率，确认调整没有降低安全边界。 | closure metrics |

## 5.3 必须强调的技术结论

- 开发者处理的不是“把权限放开”，而是修正权限声明的可信映射。
- Local Contract 可以细化有权限后的执行顺序，不能创造权限。
- Evidence 记录授权判定，不携带内部财务数据。
- 发布后必须同时验证“合法用户恢复”和“非法用户仍被拒绝”。

## 5.4 当前实现差距

当前仓库已有 GC-1000、PERMISSION 关系、finance:read 检查和不可放宽提示。还需增加临时委托声明、授权申请、身份重新认证、权限 Schema ChangeSet 和内部库候选执行链。

---

# 6. 完整实施例四：医疗数据隔离从 Local-only 演化为全局安全边界

## 6.1 实施目标

展示一个问题最初为什么只能留在本地，以及当更多用户出现相似证据后，开发者如何只提炼“共同安全边界”，而不是把某家医院的具体网络和 Skill 名称直接提升为全局规则。

## 6.2 端到端操作链

| 步骤 | 参与方 | 真实操作与系统处理 | 形成的对象或状态 |
| --- | --- | --- | --- |
| 1 | 医院科研医生 | 输入“汇总本院过去两年某类术后并发症，并与公开指南比较”。 | clinical research task |
| 2 | Agent | 计划从 Private EHR Search 取病例，再把原始片段发送给 Cloud Summarizer。 | cross-boundary plan |
| 3 | 数据出口代理 | 检测 resource.classification=clinical_private 且 target.trust_zone=external，阻断发送。 | ISOLATION violation |
| 4 | 用户 | 改用院内部署的 Local Summarizer，任务成功。 | corrected execution |
| 5 | 用户端治理 | Evidence 只保存分类标签、源/目标信任域、阻断原因和替代 Skill，不上传病历正文。 | redacted Evidence |
| 6 | 医院数据保护官 | 批准 Local Contract：clinical_private 不得流向 external；Private EHR 只能连接 Local Summarizer。 | Local ISOLATION Contract |
| 7 | 治理服务 | 发现该 Evidence 只有一个组织，Context Signature 包含 hospital-A-private-network，标记 LOCAL_ONLY。 | no global candidate |
| 8 | Developer | 在控制台看到 Local-only 原因，但不修改其他客户的全局治理。 | local issue retained |
| 9 | 后续用户 | 数月内，另外三家医疗机构出现“受限数据流向外部 Skill”的相似问题，但它们使用不同 EHR、不同院内模型和不同网络区域。 | cross-tenant evidence |
| 10 | 治理服务 | 抽象共同关系：受限数据不能离开 trusted_zone；把具体 Skill 名称、医院网络和本地模型留在各自 Context 中。 | generalized cluster |
| 11 | Developer + 合规团队 | 审查后创建 Global Invariant：classification IN clinical_restricted 时，目标 Skill 的 trust_zone 必须等于会话允许区域。 | minimal Global Invariant |
| 12 | Developer | 影响分析显示多个医院本地隔离规则会被命中，但具体 Local Summarizer 路由不应被删除。发布 v27。 | Global ChangeSet |
| 13 | 医院 A | 全局规则覆盖“不得出域”，本地的 PrivateEHR→LocalSummarizer 映射仍是特有资源条件。 | ACTIVE_REFINEMENT |
| 14 | 医院 B | 原本只写“不得出域”的本地规则被完全覆盖。 | RETIRED |
| 15 | 医院 C | 本地规则允许一个外部匿名化服务，但该服务的 trust_zone 声明不可信，合并失败。 | CONFLICT |
| 16 | 医院 C 数据保护官 | 选择暂停该路径并发起供应商认证；认证前 Fallback 到院内人工摘要。 | conflict resolution |
| 17 | 用户 | 重跑原任务。Agent 在规划阶段即排除不合规数据流，只向院内总结器发送病例片段；公开指南仍可从 Web Search 获取。 | compliant mixed-source result |
| 18 | Developer | 监控出域阻断率、误阻断率、敏感内容进入 Evidence 的比例，并验证后者始终为零。 | security closure |

## 6.3 演化图

~~~mermaid
flowchart LR
    A["医院 A 特有问题"] --> LA["LOCAL_ONLY<br/>具体 EHR 与院内模型"]
    B["医院 B/C/D 相似证据"] --> CL["抽象共同安全语义"]
    LA --> CL
    CL --> GI["Global Invariant<br/>受限数据不得离开可信域"]
    GI --> RA["A：保留本地路由细化"]
    GI --> RB["B：重复隔离规则退役"]
    GI --> RC["C：外部服务信任声明冲突"]
~~~

## 6.4 当前实现差距

需要增加 ISOLATION 执行语义、资源分类与 trust_zone、脱敏 Evidence、LOCAL_ONLY 原因码、跨租户抽象和供应商信任声明。该实施例适合专利和技术答辩，但当前不应作为“已完整实现”展示。

---

# 7. 完整实施例五：实时行情故障、缓存回退与交易台严格策略

## 7.1 端到端操作链

| 步骤 | 参与方 | 真实操作与系统处理 | 形成的对象或状态 |
| --- | --- | --- | --- |
| 1 | 研究员 | 输入“给出组合前十大持仓的当前价格和当日涨跌幅”。 | market_quote task |
| 2 | Agent | 首先调用 Realtime Stock Query，服务超过 2 秒未响应。 | timeout |
| 3 | 用户 | 手动改用 Cached Market Quote，得到 15 分钟延迟行情；确认该结果只用于研究，不用于下单。 | corrected fallback |
| 4 | 用户端治理 | 形成 Local Evidence：主服务耗时、错误码、缓存时间戳、用途和用户接受结果。 | LE-MARKET-A |
| 5 | 用户 | 创建 Local Contract：研究任务实时源失败时可回退缓存，但必须显示数据时间戳和“不可下单”标签。 | FALLBACK Local Contract |
| 6 | 其他用户 | 多个地区出现相同供应商故障；交易台用户也上报，但明确拒绝 15 分钟缓存。 | heterogeneous evidence |
| 7 | 治理服务 | 按 task purpose 分层聚类：research 用户对缓存结果一致接受；trading 用户要求失败关闭。 | two context clusters |
| 8 | Developer | 为 research 生成 Global DEFAULT 候选：实时源超时后回退缓存，freshness≤15m，强制风险标签；不把该规则用于 trading。 | scoped candidate |
| 9 | Developer | 影响分析检查现有 GC-1014、本地 SLA 和下单 Agent；经过市场数据负责人审批后发布 v16。 | Global FALLBACK Contract |
| 10 | 普通研究用户 | 原本同义的 Local Contract 被全局完全覆盖。 | RETIRED |
| 11 | 高频研究团队 | 本地 freshness≤2m 比全局更严格，且兼容。 | ACTIVE_REFINEMENT |
| 12 | 交易台 | 某旧本地规则允许缓存，但新的全局 scope 明确 trading 不适用；系统标记潜在风险并要求人工确认。 | CONFLICT / fail closed |
| 13 | 交易台管理员 | 选择备用实时供应商作为第一 Fallback；所有实时源失败时只返回“行情不可用”，不使用缓存。 | refined fallback chain |
| 14 | 用户 | 重跑同一任务。研究 Agent 自动回退并显著标注时效；交易 Agent 则切换备用实时源。 | context-specific success |
| 15 | 供应商升级 | Realtime Stock Query 2.1 修改超时语义和健康状态字段，Dependency Scan 命中所有依赖 SLA Schema 的规则。 | version revalidation |
| 16 | Developer | 回放故障样本后更新超时判断；观察任务完成率、缓存误用率和故障切换延迟。 | closure metrics |

## 7.2 当前实现差距

当前已有 Realtime Stock Query、Cached Market Quote、FALLBACK 类型和 GC-1014 静态契约，但 resolveGovernance 尚未真正执行 Fallback，工作台也没有超时注入、数据新鲜度和用途标签。应把这些补齐后再演示完整链。

---

# 8. 完整实施例六：供应商准入的顺序、权限与合规治理

## 8.1 端到端操作链

| 步骤 | 参与方 | 真实操作与系统处理 | 形成的对象或状态 |
| --- | --- | --- | --- |
| 1 | 采购专员 | 上传 28 家新供应商，要求“完成准入检查并写入 ERP”。 | vendor_onboarding task |
| 2 | Agent | 为追求完成速度，先调用 ERP Vendor Writer，随后才运行 Sanctions Screening；供应商别名尚未标准化。 | wrong execution order |
| 3 | 事务监控 | 发现 WRITE 事件早于 SCREEN_PASS，立即回滚本批写入并锁定任务。 | ORDER violation + rollback |
| 4 | 采购专员 + 合规官 | 纠正执行链为 Entity Normalizer → Sanctions Screening → ERP Writer；Writer 使用有 vendor:write 的审批会话。 | corrected chain |
| 5 | 用户端治理 | 形成包含步骤时间、回滚结果、别名命中、筛查结论和权限主体的 Evidence。 | LE-VENDOR-A |
| 6 | 用户 | 建立 Local Contract：Normalizer BEFORE Screening BEFORE Writer；Writer requires SCREEN_PASS and vendor:write。 | ORDER + PERMISSION |
| 7 | 其他业务单元 | 欧洲和东南亚采购团队出现同类问题；欧洲团队还需要受益所有人增强审查。 | cross-unit evidence |
| 8 | 治理服务 | 聚类确认“先筛查后写入”具有全局共性；把欧洲受益所有人规则保留为地区特有条件。 | PROMOTION_READY |
| 9 | Developer + 合规官 | 把候选拆成两层：Global Invariant 禁止无 SCREEN_PASS 的写入；Global Default 规定 Normalize→Screen→Write。 | two global contracts |
| 10 | Developer | 运行影响分析，检查所有调用 ERP Writer 的 Agent、现有本地顺序和权限 Schema；完成双人审批。 | impact + approval |
| 11 | Developer | 发布 v40，并向受影响用户发送变化说明和预计状态。 | Global ChangeSet |
| 12 | 标准采购团队 | 同义 Local Contract 被完全覆盖并退役。 | RETIRED |
| 13 | 欧洲团队 | 受益所有人检查属于更严格的地区条件，与全局兼容。 | ACTIVE_REFINEMENT |
| 14 | 应急采购团队 | 旧规则允许“紧急订单先建档后补筛查”，与 Global Invariant 冲突。 | CONFLICT |
| 15 | 应急采购用户 | 不能通过 Local Contract 放宽 Invariant；改为创建不落 ERP 的临时草稿，并 Fallback 到人工合规审批。 | safe conflict resolution |
| 16 | 用户 | 重跑 28 家供应商。系统先标准化，制裁命中实体被隔离，只有通过者由授权会话写入 ERP。 | successful controlled write |
| 17 | Developer | 监控未筛查写入数必须为零、回滚次数、误报率和人工处理时长；必要时调整 Default，不放宽 Invariant。 | closure metrics |

## 8.2 该实施例的说服力

它能够清楚说明：

- ORDER 控制的是实际调用序列，不是 UI 上的排序文字；
- PERMISSION 控制谁能执行写操作；
- Global Invariant 决定任何 Local Contract 都不能“先写后审”；
- Local Refinement 仍可增加地区性增强审查；
- 冲突处理可以提供安全替代路径，而不是简单报错。

---

# 9. 完整实施例七：客服退款的风险检查、审批权限与区域阈值

## 9.1 端到端操作链

| 步骤 | 参与方 | 真实操作与系统处理 | 形成的对象或状态 |
| --- | --- | --- | --- |
| 1 | 客服坐席 | 输入“客户称包裹未收到，退还本单全部 2,800 元”。 | refund task |
| 2 | Agent | 直接调用 Refund Executor，未先检查物流签收、历史退款和账户风险；当前坐席只有 refund:propose。 | unsafe plan |
| 3 | 权限与风控服务 | 因缺少 refund:approve 阻断资金操作；风险检查器同时发现客户近 30 天有三次类似申请。 | PERMISSION_BLOCK + risk anomaly |
| 4 | 坐席 | 纠正流程：先查物流和账户风险，再把大额退款提交主管审批；没有直接执行退款。 | safe correction |
| 5 | 用户端治理 | 形成 Evidence：金额、币种、地区、风险信号、原调用顺序、阻断原因和审批结果。 | LE-REFUND-A |
| 6 | 坐席团队 | 创建 Local Contract：Risk Check BEFORE Refund；金额超过本地阈值时 Fallback 到 Supervisor Approval。 | ORDER + FALLBACK |
| 7 | 多地区用户 | 中国、欧盟和美国团队产生相似 Evidence，但法定退款窗口、币种和金额阈值不同。 | multi-context cluster |
| 8 | 治理服务 | 提炼共同最小边界：资金执行必须有 refund:approve，且任何高风险账户必须先完成 Risk Check；不把具体金额提升为统一阈值。 | generalized candidate |
| 9 | Developer + 支付风控 | 审查误阻断、法规差异和审批 SLA，发布 Global Invariant（权限与高风险检查）及区域可细化 Default。 | global release |
| 10 | 治理服务 | Permission、ORDER 和 region/currency ContextSchema 变化传播到各地区 Local Contract。 | dependency scan |
| 11 | 标准团队 | 与全局完全相同的检查规则退役。 | RETIRED |
| 12 | 欧盟团队 | 保留欧盟退款窗口和欧元金额阈值。 | ACTIVE_REFINEMENT |
| 13 | 某团队 | 旧规则以人民币固定值处理美元订单，换算后可能错误自动退款，重验证发现 ContextSchema 不兼容。 | CONFLICT |
| 14 | 团队管理员 | 改用 base_currency_amount 和实时汇率版本；汇率不可用时不自动退款，Fallback 到主管。 | conflict resolved |
| 15 | 坐席 | 重跑原请求。Agent 先完成风险检查，再生成审批包；主管批准后，授权服务签发一次性 refund:approve 并执行退款。 | successful governed runtime |
| 16 | Developer | 观察越权执行数、风险漏检率、自动处理率和主管 SLA，持续调整 Default，而不降低资金权限 Invariant。 | closure metrics |

## 9.2 当前实现建议

可复用现有 Runtime Trace、Evidence Builder、Candidate、Impact Analysis、Revalidation 和 Conflict Resolver 页面；需新增 Risk Check、Refund Executor、Supervisor Approval、一次性权限和地区金额 Schema。

---

# 10. 完整实施例八：跨国营销内容的保密、法审与发布治理

## 10.1 端到端操作链

| 步骤 | 参与方 | 真实操作与系统处理 | 形成的对象或状态 |
| --- | --- | --- | --- |
| 1 | 中国区营销经理 | 输入“把未发布产品说明翻译成英文并发布到合作伙伴门户”。 | embargoed_content task |
| 2 | Agent | 计划把原文发送给公共 Cloud Translator，随后直接调用 CMS Publisher。 | isolation + order risk |
| 3 | DLP 与 CMS | DLP 因 embargoed 标签阻止内容出域；CMS 因缺少 legal_review_pass 和 cms:publish 拒绝发布。 | ISOLATION + PERMISSION block |
| 4 | 用户 | 改用企业内部 Translator，提交 Legal Review，审核通过后由具备发布权限的会话执行。 | corrected workflow |
| 5 | 用户端治理 | 形成不含原始保密文案的 Evidence：内容分类、目标域、阻断点、正确执行顺序和审批凭据。 | LE-CONTENT-CN |
| 6 | 中国区管理员 | 创建 Local Contract：embargoed 内容只用 Internal Translator；Translate BEFORE Legal Review BEFORE Publish。 | ISOLATION + ORDER Local Contract |
| 7 | 治理服务 | 初期只有中国区使用该门户和内部翻译器，Evidence 标记 LOCAL_ONLY，不影响普通公开内容发布。 | LOCAL_ONLY |
| 8 | 后续用户 | 欧洲和北美产品发布也出现保密内容被外部模型处理、未法审即发布的问题，但使用不同翻译器和 CMS。 | cross-region evidence |
| 9 | 治理服务 | 抽象共同规则：embargoed 内容不得进入未认证外部处理器；发布必须有 legal_review_pass 和 cms:publish。具体翻译器留给地区规则。 | generalized candidate |
| 10 | Developer + 法务 + 安全 | 将隔离和发布权限设为 Global Invariant，将 Translate→Review→Publish 设为 Global Default；完成影响分析。 | approved contracts |
| 11 | Developer | 发布 v52，并向各地区传播内容分类 Schema、处理器认证状态和审批要求。 | Global ChangeSet |
| 12 | 北美团队 | 与新全局完全相同的本地发布规则退役。 | RETIRED |
| 13 | 中国区 | 保留“必须使用境内部署 Translator”和本地广告法审节点。 | ACTIVE_REFINEMENT |
| 14 | 合作伙伴门户团队 | 门户 API 没有 legal_review_pass 字段，无法满足新全局规则。 | CONFLICT |
| 15 | 门户团队 | 在 API 升级前，选择 Fallback：只生成草稿包，不自动发布，由人工在受控后台完成法审和发布。 | safe fallback |
| 16 | 用户 | 重跑原任务。保密内容始终留在受信区域，法审通过后才由授权主体发布；审计链包含内容哈希而非正文。 | compliant result |
| 17 | Developer | 监控外部泄露阻断、未审发布数、地区细化数量和人工 Fallback 比例；门户升级后再次触发重验证。 | continued evolution |

---

# 11. 一条完整实施例应展示的对象链

无论选择哪个行业，演示和专利说明都应让观众看到下列对象如何连续演化，而不是只展示最终规则。

| 顺序 | 治理对象 | 必须回答的问题 |
| --- | --- | --- |
| 1 | RuntimeExecution | 用户具体输入了什么？Agent 为什么选择了这个 Skill？ |
| 2 | Runtime Evidence Items | 哪个结果、轨迹、指标或权限判定证明出现问题？ |
| 3 | LocalEvidence | Evidence 的业务上下文、Skill 版本和父全局版本是什么？ |
| 4 | LocalContract | 用户端如何立即止损？作用域是否只限当前用户/Agent？ |
| 5 | EvidenceCluster | 证据是否来自独立用户？是否属于同一上下文和版本？ |
| 6 | GlobalCandidate | 哪些共性被提炼，哪些用户特有条件被排除？ |
| 7 | DeveloperDecision | 为什么批准、拒绝、保留本地或要求更多证据？ |
| 8 | GlobalContract | 它是 Default 还是不可放宽的 Invariant？ |
| 9 | GlobalChangeSet | 哪些契约、Skill、关系和 ContextSchema 发生变化？ |
| 10 | AffectedLocalContracts | 为什么这些本地规则会被命中？ |
| 11 | RevalidationResult | 覆盖率、兼容性和本地特有条件分别是什么？ |
| 12 | ConflictResolution | 用户能够选择什么？哪些安全边界不能选择绕过？ |
| 13 | ClosureRuntime | 同一任务复跑后，行为、质量、时延和风险如何改变？ |
| 14 | Post-release Evidence | 新规则是否有效？是否需要补丁、回滚或下一次演化？ |



# 15. 结论

有说服力的 Agent Skill 双端协同治理实施例，不是“展示一条规则”，而是展示一个业务问题如何在多个治理周期中被发现、局部解决、全局吸收、向下传播、产生差异化影响，再由用户处理并回到真实 Runtime。

本文件的八个实施例均以这条长链为主体。PRIORITY、ORDER、FALLBACK、PERMISSION、ISOLATION、退役、细化和冲突不再被当作彼此割裂的场景，而是作为同一业务流程中在不同阶段共同发挥作用的治理机制。

