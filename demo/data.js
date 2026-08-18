/* ============================================================
   SkillOS · 数据层（技能、场景、治理约束、证据、关系）
   ============================================================ */

/* 治理约束类型（对应专利行为矩阵） */
const CONSTRAINT_META = {
    Priority:    { label:'优先级路由', desc:'多技能同时命中时确定优先顺序', color:'#6366f1', icon:'▸' },
    Predicate:   { label:'适用条件',   desc:'限定技能的适用/触发范围',     color:'#64748b', icon:'◂' },
    Order:       { label:'执行顺序',   desc:'建立技能先后执行关系',       color:'#0ea5e9', icon:'→' },
    Exclusion:   { label:'条件互斥',   desc:'禁止特定条件共同执行',       color:'#ef4444', icon:'⊥' },
    Isolation:   { label:'资源隔离',   desc:'隔离共享资源的读写',         color:'#f97316', icon:'◫' },
    Fallback:    { label:'失败回退',   desc:'主技能失败后替代执行',       color:'#f59e0b', icon:'↘' },
    Adapter:     { label:'I/O 适配',   desc:'转换上下游输入输出',         color:'#a855f7', icon:'⇄' },
    Permission:  { label:'权限约束',   desc:'权限前置校验与阻断',         color:'#f43f5e', icon:'🔒' },
    Version:     { label:'版本约束',   desc:'绑定技能/依赖版本',          color:'#14b8a6', icon:'#v' },
};

/* 共享技能库 */
const SKILLS = [
    { id:'web-search',        name:'web-search',         cn:'通用 Web 搜索',    ver:'v2.1', tag:'搜索', desc:'通用网页搜索，覆盖公开信息与新闻' },
    { id:'ir-search',         name:'ir-search',          cn:'投资者关系搜索',   ver:'v2.3', tag:'金融', desc:'检索上市公司财报、公告与投资者关系文档' },
    { id:'internal-filing',   name:'internal-filing',    cn:'内部财报数据源',   ver:'v1.4', tag:'私有', desc:'企业内部财报与合规数据，只读' },
    { id:'internal-knowledge',name:'internal-knowledge', cn:'内部知识库检索',   ver:'v1.5', tag:'私有', desc:'企业内部知识库全文检索' },
    { id:'doc-reader',        name:'doc-reader',         cn:'文档解析',         ver:'v1.8', tag:'文档', desc:'解析文档结构与正文' },
    { id:'ocr-skill',         name:'ocr-skill',          cn:'OCR 文字识别',     ver:'v2.0', tag:'文档', desc:'扫描件/图片文字识别，输出文本' },
    { id:'pdf-analyzer',      name:'pdf-analyzer',       cn:'PDF 条款分析',     ver:'v1.6', tag:'文档', desc:'分析 PDF 合同条款，依赖 OCR 前置输出' },
    { id:'bank-account-sync', name:'bank-account-sync',  cn:'网银账单同步',     ver:'v1.2', tag:'金融', desc:'同步银行账户流水，写入账户数据库' },
    { id:'portfolio-analyzer',name:'portfolio-analyzer', cn:'投资组合分析',     ver:'v3.1', tag:'金融', desc:'组合收益/风险分析，读写财务数据库' },
    { id:'stock-price-query', name:'stock-price-query',  cn:'实时股价查询',     ver:'v1.9', tag:'金融', desc:'实时行情查询，输出结构化行情数据' },
    { id:'report-exporter',   name:'report-exporter',    cn:'报告导出',         ver:'v1.3', tag:'输出', desc:'将结构化数据导出为报告文档' },
    { id:'crm-writer',        name:'crm-writer',         cn:'CRM 记录写入',     ver:'v1.1', tag:'业务', desc:'写入客户跟进记录，需写入权限' },
    { id:'cache-market',      name:'cache-market',       cn:'缓存行情查询',     ver:'v1.0', tag:'金融', desc:'延迟 15 分钟的缓存行情，作回退源' },
    { id:'service-restart',   name:'service-restart',    cn:'服务重启',         ver:'v1.0', tag:'运维', desc:'重启运行中的服务，修改服务状态' },
    { id:'config-hot-reload', name:'config-hot-reload',  cn:'配置热更新',       ver:'v1.1', tag:'运维', desc:'热更新服务配置，修改服务状态' },
];

/* 用户已加载技能 */
const MY_SKILL_IDS = ['web-search','ir-search','internal-filing','internal-knowledge','doc-reader','ocr-skill','pdf-analyzer','bank-account-sync','portfolio-analyzer','stock-price-query','report-exporter','crm-writer','cache-market','service-restart','config-hot-reload'];

/* 技能关系（用于关系图） */
const RELATIONS = [
    { from:'web-search', to:'ir-search', type:'overlap', label:'能力重叠/路由竞争' },
    { from:'ir-search', to:'internal-filing', type:'refine', label:'专门化/细化' },
    { from:'ocr-skill', to:'pdf-analyzer', type:'order', label:'顺序依赖' },
    { from:'bank-account-sync', to:'portfolio-analyzer', type:'resource', label:'资源冲突' },
    { from:'stock-price-query', to:'report-exporter', type:'io', label:'I/O 适配' },
    { from:'stock-price-query', to:'cache-market', type:'fallback', label:'失败回退' },
    { from:'service-restart', to:'config-hot-reload', type:'state', label:'状态互斥' },
    { from:'web-search', to:'internal-knowledge', type:'predicate', label:'适用条件' },
];
const REL_TYPE_META = {
    overlap:   { color:'#f59e0b', label:'能力重叠' },
    refine:    { color:'#6366f1', label:'专门化' },
    order:     { color:'#0ea5e9', label:'顺序依赖' },
    resource:  { color:'#f97316', label:'资源冲突' },
    io:        { color:'#a855f7', label:'I/O 适配' },
    fallback:  { color:'#14b8a6', label:'失败回退' },
    state:     { color:'#ef4444', label:'状态互斥' },
    predicate: { color:'#64748b', label:'适用条件' },
};

/* 预置任务场景（覆盖行为矩阵） */
const SCENARIOS = [
    { id:'filing', label:'官方财报查询', keywords:['财报','季度财报','上市公司','财报查询'], type:'Priority', crossEnd:true, stages:[
        { step:'检索', tone:'n', text:'命中候选技能：web-search、ir-search' },
        { step:'路由', tone:'w', text:'检测到路由不稳定 —— 两技能均满足「官方财报查询」触发条件', flicker:true },
        { step:'治理', tone:'g', text:'自动应用局部治理：official_filing ⇒ ir-search（Priority）' },
        { step:'执行', tone:'o', text:'ir-search 返回目标公司官方季度财报数据' },
        { step:'证据', tone:'u', text:'运行证据 LE_i 已上报治理中心（parent=GC_G^1）' },
    ]},
    { id:'scan-contract', label:'扫描合同并分析条款', keywords:['合同','扫描','条款','PDF'], type:'Order', stages:[
        { step:'检索', tone:'n', text:'命中候选技能：ocr-skill、pdf-analyzer' },
        { step:'规划', tone:'w', text:'检测到顺序失效：pdf-analyzer 依赖 ocr-skill 前置输出' },
        { step:'治理', tone:'g', text:'自动应用：ocr-skill → pdf-analyzer（Order）' },
        { step:'执行', tone:'o', text:'OCR 识别完成 → 条款分析完成' },
    ]},
    { id:'sync-bank', label:'同步网银账单并生成月报', keywords:['网银','账单','月报'], type:'Isolation', stages:[
        { step:'检索', tone:'n', text:'命中候选技能：bank-account-sync、portfolio-analyzer' },
        { step:'执行', tone:'w', text:'检测到资源冲突 —— 两技能均写入 Bank_Account_DB' },
        { step:'治理', tone:'g', text:'自动应用：资源隔离（Isolation），写入独立快照' },
        { step:'执行', tone:'o', text:'账单同步完成 → 组合月报生成完成' },
    ]},
    { id:'invest-report', label:'拉取行情并生成投资报告', keywords:['投资','报告','行情'], type:'Adapter', stages:[
        { step:'检索', tone:'n', text:'命中候选技能：stock-price-query、report-exporter' },
        { step:'规划', tone:'w', text:'检测到 I/O 契约失效 —— 上游输出不满足报告 Schema' },
        { step:'治理', tone:'g', text:'自动应用：I/O 适配器（Adapter）+ 顺序约束' },
        { step:'执行', tone:'o', text:'行情数据适配转换 → 报告导出完成' },
    ]},
    { id:'price-fallback', label:'获取实时股价（失败回退）', keywords:['股价','实时','行情'], type:'Fallback', stages:[
        { step:'检索', tone:'n', text:'命中候选技能：stock-price-query、cache-market' },
        { step:'执行', tone:'w', text:'实时行情接口超时（Rate Limit）' },
        { step:'治理', tone:'g', text:'自动应用：回退（Fallback）至 cache-market' },
        { step:'执行', tone:'o', text:'返回缓存行情数据（延迟 15 分钟）' },
    ]},
    { id:'crm-write', label:'写入客户跟进记录', keywords:['客户','CRM','记录','写入'], type:'Permission', stages:[
        { step:'检索', tone:'n', text:'命中候选技能：crm-writer' },
        { step:'路由', tone:'w', text:'检测到权限缺失 —— 无 CRM 写入权限' },
        { step:'治理', tone:'g', text:'全局不变量（PermissionRequired=1）不可放宽，已阻断' },
        { step:'结果', tone:'r', text:'任务被权限守卫拦截，需申请写入权限' },
    ]},
    { id:'data-version', label:'运行数据分析流水线', keywords:['数据分析','流水线','依赖'], type:'Version', stages:[
        { step:'检索', tone:'n', text:'命中候选技能：portfolio-analyzer' },
        { step:'执行', tone:'w', text:'检测到依赖版本不兼容 —— pandas 不满足要求' },
        { step:'治理', tone:'g', text:'自动应用：版本约束（Version）+ 环境隔离' },
        { step:'执行', tone:'o', text:'在隔离沙箱中完成分析' },
    ]},
    { id:'service-ops', label:'重启服务并热更新配置', keywords:['重启','配置','热更新','服务','运维'], type:'Exclusion', stages:[
        { step:'检索', tone:'n', text:'命中候选技能：service-restart、config-hot-reload' },
        { step:'规划', tone:'w', text:'检测到状态冲突 —— 并发执行会互相覆盖' },
        { step:'治理', tone:'g', text:'自动应用：条件互斥（Exclusion），禁止并发' },
        { step:'执行', tone:'o', text:'串行：先热更新配置 → 再重启服务' },
    ]},
    { id:'internal-doc', label:'查询内部知识库文档', keywords:['内部','知识库','文档','资料'], type:'Predicate', stages:[
        { step:'检索', tone:'n', text:'命中候选技能：web-search、internal-knowledge' },
        { step:'路由', tone:'w', text:'检测到能力边界交叉 —— web-search 适用条件过宽' },
        { step:'治理', tone:'g', text:'自动应用：收缩适用条件（Predicate），排除 web-search' },
        { step:'执行', tone:'o', text:'由 internal-knowledge 检索内部资料' },
    ]},
];

/* 证据聚类（证据看板） */
const EVIDENCE_CLUSTERS = [
    { id:'Cluster_IR', pair:'web-search × ir-search', type:'路由不稳定', F:3, C:0.60, R:1.00, Q:0.90, G:0.87, status:'pending' },
    { id:'Cluster_OCR', pair:'ocr-skill → pdf-analyzer', type:'顺序失效', F:2, C:0.35, R:1.00, Q:0.80, G:0.72, status:'local' },
    { id:'Cluster_BANK', pair:'bank-account-sync × portfolio-analyzer', type:'资源冲突', F:1, C:0.10, R:1.00, Q:0.75, G:0.41, status:'local' },
    { id:'Cluster_IO', pair:'stock-price-query → report-exporter', type:'I/O 契约', F:2, C:0.28, R:0.90, Q:0.82, G:0.66, status:'local' },
];

/* 契约生命周期状态 */
const LIFECYCLE_STATES = ['Candidate','Verified','Active','Stale','Revalidating','Retired','ActiveRefinement','Conflict'];

/* 治理历史（初始） */
const INITIAL_HISTORY = [
    { text:'初始发布 GC_G^1 · 无官方财报路由规则', t:'10:02:11' },
];
