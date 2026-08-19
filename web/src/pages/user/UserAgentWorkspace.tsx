import React from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { orchestrator } from "../../app/animations";
import { eventBus, nextId } from "../../app/eventBus";
import type {
  GovernanceEvent, RuntimeExecution, RuntimeStatus, RuntimeStep, SkillCandidate,
} from "../../domain/types";
import { resolveGovernance } from "../../engines/governance";
import { DEMO_PROMPTS } from "../../fixtures/base";
import { Button, Card, Drawer, Modal, SectionTitle, StateBadge, ExplainBtn } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { ScoreTransition } from "../../components/animations/Animations";

type Phase =
  | "IDLE" | "TASK_RECEIVED" | "CONTEXT_EXTRACTED"
  | "SKILL_MATCHED" | "GOVERNANCE_RESOLVED"
  | "SKILL_SELECTED" | "SKILL_EXECUTED" | "RESULT_EVALUATED"
  | "ANOMALY" | "CORRECTION" | "CORRECTED" | "OPPORTUNITY";

interface Message { id: string; role: "user" | "agent" | "system"; text: string; ts: number; }
interface ShellCtx { collapsed: boolean; }

const PROMPTS = [
  { label: "查一下英伟达最新的官方季度财报（10-Q）", taskType: "official_filing", sourceRequirement: "official" },
  { label: "找苹果投资者关系页面最新的 10-Q 公告",       taskType: "official_filing", sourceRequirement: "official" },
  { label: "把这份扫描版 Q2 财报 PDF 解析出来",         taskType: "scanned_pdf",     sourceRequirement: "any" },
];

export default function UserAgentWorkspace() {
  const { userId, agentId } = useParams();
  const navigate = useNavigate();
  const user = useGovernance(s => s.users[userId!]);
  const skills = useGovernance(s => s.skills);
  const globalContracts = useGovernance(s => s.globalContracts);
  const localContracts  = useGovernance(s => s.localContracts);
  const addRuntime = useGovernance(s => s.addRuntime);
  const updateRuntime = useGovernance(s => s.updateRuntime);
  const emit = useGovernance(s => s.emit);
  const globalVersion = useGovernance(s => s.globalVersion);
  const { collapsed } = useOutletContext<ShellCtx>();

  const [input, setInput] = React.useState(PROMPTS[0].label);
  const [phase, setPhase] = React.useState<Phase>("IDLE");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [candidates, setCandidates] = React.useState<SkillCandidate[]>([]);
  const [selectedSkill, setSelectedSkill] = React.useState<string>();
  const [runtime, setRuntime] = React.useState<RuntimeExecution>();
  const [traceOpen, setTraceOpen] = React.useState(false);
  const [correctionOpen, setCorrectionOpen] = React.useState(false);
  const [explainSkill, setExplainSkill] = React.useState<string>();
  const [context, setContext] = React.useState<Record<string, unknown>>({});
  const [governanceChecks, setGovernanceChecks] = React.useState<{ label: string; ok?: boolean; note?: string }[]>([]);
  const [inspectorOpen, set查看orOpen] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  const userLocal契约s = React.useMemo(
    () => Object.values(localContracts).filter(
      c => c.ownerId === userId && (c.state === "ACTIVE" || c.state === "ACTIVE_REFINEMENT")
    ),
    [localContracts, userId]
  );

  // After global v19, IRSearch gets +0.22 and wins → effective governance demo (TC-08)
  const hasGlobalFiling规则 = Object.values(globalContracts).some(
    g => g.state === "ACTIVE" && g.relations.some(r => r.type === "PRIORITY" && r.sourceSkillId === "skill-ir-search")
  );

  const skillName = (id?: string) => id ? (skills[id]?.name ?? id) : "—";

  const addStep = (rt: RuntimeExecution, type: RuntimeStep["type"], payload: RuntimeStep["payload"]) => {
    const step: RuntimeStep = { id: nextId("step"), type, timestamp: Date.now(), payload };
    const updated = { ...rt, steps: [...rt.steps, step] };
    setRuntime(updated); updateRuntime(rt.id, updated);
    return updated;
  };

  const addMessage = (role: Message["role"], text: string) =>
    setMessages(m => [...m, { id: nextId("m"), role, text, ts: Date.now() }]);

  const run = React.useCallback(async (promptText?: string) => {
    if (running) return;
    const text = (promptText ?? input).trim();
    if (!text) return;
    setRunning(true);
    const isFiling = /filing|10-Q|10-K|官方|财报|季报|投资者|investor/i.test(text);
    const taskType = isFiling ? "official_filing" : text.includes("扫描") || /scan|ocr/i.test(text) ? "scanned_pdf" : "general";
    const sourceRequirement = /official|官方/i.test(text) || isFiling ? "official" : "any";

    const rt: RuntimeExecution = {
      id: nextId("rt"), userId: userId!, agentId: agentId!, input: text,
      context: { taskType, sourceRequirement, agentId, attributes: {} },
      candidateSkills: [], steps: [], status: "RUNNING", startedAt: Date.now(),
    };
    setRuntime(rt); addRuntime(rt);
    setSelectedSkill(undefined); setGovernanceChecks([]); setCandidates([]);
    setInput(text);

    addMessage("user", text);
    setPhase("TASK_RECEIVED");
    emit({
      eventId: nextId("evt"), eventType: "USER_TASK_STARTED",
      timestamp: Date.now(), sourceDomain: "USER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"), globalVersion,
      payload: { runtimeId: rt.id, userId },
    });

    await orchestrator.wait(280);
    let rt2 = addStep(rt, "TASK_RECEIVED", { input: text });

    setPhase("CONTEXT_EXTRACTED");
    setContext({ taskType, sourceRequirement, agentId, userId });
    addMessage("system", `已提取上下文：任务类型=${taskType}，来源要求=${sourceRequirement}`);
    await orchestrator.wait(500);
    rt2 = addStep(rt2, "CONTEXT_EXTRACTED", { taskType, sourceRequirement });

    setPhase("SKILL_MATCHED");
    let initialCandidates: SkillCandidate[] = taskType === "official_filing" ? [
      { skillId: "skill-web-search", plannerScore: 0.81, governanceBonus: 0, finalScore: 0.81, reason: ["关键词命中度高，覆盖公开网页"] },
      { skillId: "skill-ir-search",  plannerScore: 0.78, governanceBonus: 0, finalScore: 0.78, reason: ["匹配投资者关系领域，返回官方公告"] },
    ] : [
      { skillId: "skill-web-search", plannerScore: 0.72, governanceBonus: 0, finalScore: 0.72, reason: ["通用网页查询"] },
    ];
    setCandidates(initialCandidates);
    await orchestrator.wait(450);
    rt2 = addStep(rt2, "SKILL_MATCHED", { candidates: initialCandidates.map(c => c.skillId) });

    setPhase("GOVERNANCE_RESOLVED");
    setGovernanceChecks([{ label: "检查全局治理规则…" }]);
    await orchestrator.wait(380);
    setGovernanceChecks(c => [{ ...c[0], ok: true }, { label: "检查本地治理规则…" }]);
    await orchestrator.wait(380);

    const effective = resolveGovernance(
      Object.values(globalContracts).filter(g => g.contractType === "INVARIANT"),
      Object.values(globalContracts).filter(g => g.contractType === "DEFAULT" && g.state === "ACTIVE"),
      userLocal契约s,
      { taskType, sourceRequirement, permission: [] },
      initialCandidates,
    );
    const applied规则 = effective.some(c => c.governanceBonus !== 0);
    setGovernanceChecks(c => [
      c[0], c[1],
      { label: applied规则 ? "命中全局优先规则：IRSearch > WebSearch" : "暂无适用的路由规则，按规划器原始评分选择", ok: applied规则 },
    ]);
    setCandidates(effective);
    rt2 = addStep(rt2, "GOVERNANCE_RESOLVED", { scores: effective });
    await orchestrator.wait(450);

    setPhase("SKILL_SELECTED");
    const winner = [...effective].sort((a,b) => b.finalScore - a.finalScore)[0];
    setSelectedSkill(winner.skillId);
    const rt3: RuntimeExecution = { ...rt2, candidateSkills: effective, selectedSkillId: winner.skillId };
    setRuntime(rt3); updateRuntime(rt.id, rt3);
    addStep(rt3, "SKILL_SELECTED", { selected: winner.skillId, finalScore: winner.finalScore });
    addMessage("agent", `选中技能：${skillName(winner.skillId)}（综合得分 ${winner.finalScore.toFixed(2)}）`);
    await orchestrator.wait(380);

    setPhase("SKILL_EXECUTED");
    addMessage("agent", `正在执行 ${skillName(winner.skillId)}…`);
    await orchestrator.wait(700);

    // If global rule now applies → IRSearch wins → official results → no anomaly (TC-08 closure)
    const officialWin = winner.skillId === "skill-ir-search";
    const snippets = officialWin ? [
      { title: "NVIDIA Q3 FY2025 季度财报（10-Q）", source: "investor.nvidia.com", official: true },
      { title: "NVIDIA 投资者关系 - 财务文档", source: "investor.nvidia.com", official: true },
    ] : [
      { title: "NVIDIA Q3 财报：营收同比增 262% — Reuters", source: "reuters.com", official: false },
      { title: "NVIDIA 股价盘后波动 — CNBC",       source: "cnbc.com",    official: false },
      { title: "NVIDIA 财报预览 — Yahoo Finance",  source: "finance.yahoo.com", official: false },
    ];
    const anomaly = taskType === "official_filing"
      && sourceRequirement === "official"
      && winner.skillId === "skill-web-search";

    setPhase(anomaly ? "ANOMALY" : "RESULT_EVALUATED");
    const updated: RuntimeExecution = {
      ...rt3,
      status: (anomaly ? "ANOMALY_DETECTED" : "SUCCEEDED") as RuntimeStatus,
      resultSnippets: snippets,
      anomalyReason: anomaly ? "来源要求=官方，实际返回=综合媒体（匹配度 LOW）" : undefined,
      completedAt: Date.now(),
    };
    setRuntime(updated); updateRuntime(rt.id, updated);
    addStep(updated, "RESULT_EVALUATED", {
      requiredSource: sourceRequirement, actual: officialWin ? "Official" : "Mixed/Media",
      match: anomaly ? "LOW" : "HIGH",
    });

    if (anomaly) {
      addMessage("system", "⚠ 结果来源为非官方媒体，与来源要求不符，发现治理机会。");
      emit({
        eventId: nextId("evt"), eventType: "RUNTIME_ANOMALY_DETECTED",
        timestamp: Date.now(), sourceDomain: "USER", sourceId: eventBus.id,
        targetDomain: "ALL", correlationId: nextId("corr"), globalVersion,
        payload: { runtimeId: rt.id, reason: "OfficialSourceRoutingMismatch" },
      });
      // Auto-open correction after a beat (keeps demo flowing)
      await orchestrator.wait(700);
      setCorrectionOpen(true);
    } else {
      addMessage("agent", `✓ 已返回官方来源：${snippets[0].source}。`);
      setRunning(false);
    }
  }, [running, input, userId, agentId, globalVersion, globalContracts, userLocal契约s, emit, addRuntime, updateRuntime]);

  const applyCorrection = React.useCallback(async () => {
    if (!runtime) return;
    setPhase("CORRECTION"); setCorrectionOpen(false);
    const rt: RuntimeExecution = { ...runtime, correctionSkillId: "skill-ir-search", status: "CORRECTED" };
    setRuntime(rt); updateRuntime(runtime.id, rt);
    addStep(rt, "USER_CORRECTION", { from: runtime.selectedSkillId, to: "skill-ir-search" });
    addMessage("user", "这些不是官方来源，改用投资者关系搜索（IR Search）。");
    emit({
      eventId: nextId("evt"), eventType: "USER_CORRECTION_SUBMITTED",
      timestamp: Date.now(), sourceDomain: "USER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"), globalVersion,
      payload: { runtimeId: runtime.id, alternateSkillId: "skill-ir-search" },
    });
    await orchestrator.wait(500);
    setSelectedSkill("skill-ir-search");
    setCandidates(cs => cs.map(c => c.skillId === "skill-ir-search" ? { ...c, finalScore: 1.0, governanceBonus: +(1 - c.plannerScore).toFixed(2), reason: [...c.reason, "用户修正：强制选择 IR Search"] } : c));
    addMessage("agent", "IR Search → NVIDIA Q3 FY2025 季度财报（investor.nvidia.com）");
    setPhase("CORRECTED");
    await orchestrator.wait(600);
    setPhase("OPPORTUNITY");
    addMessage("system", "已识别治理机会：可将该修正结构化为证据，参与跨用户聚合。");
    setRunning(false);
  }, [runtime, emit, globalVersion, updateRuntime]);

  const goBuild证据 = () => runtime && navigate(`/user/${userId}/证据/new/${runtime.id}`);

  // Demo command listener — launcher drives this window automatically
  React.useEffect(() => {
    return eventBus.subscribe(async (event) => {
      if (event.eventType === "DEMO_RESET") {
        setPhase("IDLE"); setMessages([]); setCandidates([]); setRuntime(undefined);
        setSelectedSkill(undefined); setContext({}); setGovernanceChecks([]);
        return;
      }
      if (event.eventType !== "DEMO_COMMAND") return;
      const { action, userId: target, prompt } = event.payload as { action: string; userId?: string; prompt?: string };
      if (target && target !== userId) return;
      if (action === "run")           { await run(prompt); }
      else if (action === "correct")  { await applyCorrection(); }
      else if (action === "buildEvidence") { setTimeout(goBuild证据, 800); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, applyCorrection, userId]);

  const narrow = collapsed; // sidebar collapsed signals narrow window
  const show查看orInline = !narrow;

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 bg-white border-b border-ink-200 flex items-center px-5 gap-3 shrink-0">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink-900 leading-tight">智能体工作台 · {agentId}</p>
          <p className="text-[11px] text-ink-500">模型 fabric-model-4 · 全局基准 <span className="mono text-brand-700">{globalVersion}</span>{hasGlobalFiling规则 && <span className="ml-2 chip chip-emerald">全局优先规则已生效</span>}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {narrow && (
            <Button variant="outline" size="sm" icon="Pulse" onClick={() => set查看orOpen(true)}>治理检查器</Button>
          )}
          <Button variant="outline" size="sm" icon="FileCode" onClick={() => setTraceOpen(true)}>运行轨迹</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: show查看orInline ? "1fr 360px" : "1fr" }}>
        <div className="flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto scroll-thin p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <motion.div key={m.id} layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : m.role === "system" ? "justify-center" : "justify-start"}`}>
                  {m.role === "system" ? (
                    <div className="max-w-[90%] text-[12px] text-ink-500 bg-ink-100/70 rounded-full px-3 py-1.5">{m.text}</div>
                  ) : (
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap
                      ${m.role === "user"
                        ? "bg-brand-600 text-white rounded-br-sm"
                        : "bg-white border border-ink-200 text-ink-800 rounded-bl-sm"}`}>
                      {m.text}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {phase !== "IDLE" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 space-y-3">
                {Object.keys(context).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
                    <Icon name="Spark" size={13} className="text-brand-600" />
                    <span className="font-medium text-ink-700">上下文：</span>
                    {Object.entries(context).map(([k,v]) => (
                      <span key={k} className="chip">{k}=<span className="mono ml-1">{String(v)}</span></span>
                    ))}
                  </div>
                )}

                {candidates.length > 0 && (
                  <div>
                    <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">候选技能</p>
                    <div className="space-y-2">
                      {candidates.map(c => {
                        const sel = selectedSkill === c.skillId;
                        return (
                          <motion.div key={c.skillId} layout
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.32 }}
                            className={`p-3 rounded-xl border-2 transition-colors
                              ${sel ? "border-brand-400 bg-brand-50/70 shadow-ring" : "border-ink-200 bg-white"}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center text-ink-700">
                                <Icon name="Cog" size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-ink-900">{skillName(c.skillId)}</p>
                                <p className="text-[11.5px] text-ink-500 truncate">{c.reason[0]}</p>
                              </div>
                              <div className="text-right">
                                <ScoreTransition value={c.finalScore} threshold={0} digits={2} />
                                <p className="text-[10.5px] text-ink-400 mono">
                                  规划 {c.plannerScore.toFixed(2)}
                                  {c.governanceBonus !== 0 && (
                                    <span className={c.governanceBonus > 0 ? "text-emerald-600" : "text-rose-600"}>
                                      {" "}{c.governanceBonus > 0 ? "+" : ""}{c.governanceBonus.toFixed(2)}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <ExplainBtn onClick={() => setExplainSkill(c.skillId)} label="为何？" />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {governanceChecks.length > 0 && (
                  <div className="rounded-lg bg-ink-50 border border-ink-100 p-3 space-y-1.5">
                    {governanceChecks.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12.5px]">
                        {g.ok === undefined ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
                        ) : g.ok ? <Icon name="Check" size={14} className="text-emerald-600" />
                          : <span className="w-3.5 h-3.5 rounded-full bg-amber-400" />}
                        <span className="text-ink-700">{g.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {runtime?.resultSnippets && (phase === "ANOMALY" || phase === "RESULT_EVALUATED" || phase === "CORRECTED" || phase === "OPPORTUNITY") && (
                  <div>
                    <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">结果来源</p>
                    <div className="grid gap-1.5">
                      {runtime.resultSnippets.map((s, i) => (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border
                            ${s.official ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.official ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span className="text-[12.5px] text-ink-800 flex-1 truncate">{s.title}</span>
                          <span className="text-[11px] mono text-ink-500">{s.source}</span>
                          <span className={`chip ${s.official ? "chip-emerald" : "chip-amber"}`}>{s.official ? "官方" : "媒体"}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {phase === "ANOMALY" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Icon name="Warn" size={16} />
                      </span>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-amber-900">发现治理问题</p>
                        <p className="text-[11.5px] text-amber-800">来源要求为官方，但所选技能返回了综合媒体来源。</p>
                      </div>
                      <Button variant="primary" size="sm" icon="Spark" onClick={() => setCorrectionOpen(true)}>修正</Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {phase === "OPPORTUNITY" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-brand-300 bg-gradient-to-br from-brand-50 to-violet-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center"><Icon name="Bolt" size={14} /></span>
                        <p className="text-[13.5px] font-bold text-brand-900">识别到治理机会</p>
                      </div>
                      <p className="text-[12.5px] text-brand-900/80 mb-3">
                        本次运行暴露了一个路由错配。结构化证据可以保留在本地，也可以在其他用户遇到同类问题后聚合升级为全局规则。
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="primary" size="sm" icon="ArrowR" onClick={goBuild证据}>结构化证据</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPhase("CORRECTED")}>暂不处理</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          <div className="border-t border-ink-200 bg-white p-3">
            <div className="flex items-end gap-2 card !rounded-xl !shadow-none p-2">
              <textarea
                value={input} onChange={e => setInput(e.target.value)} rows={1}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
                placeholder="向智能体提问…"
                className="flex-1 resize-none bg-transparent outline-none text-[13px] leading-6 px-2 py-1.5 max-h-32"
              />
              <Button variant="primary" size="sm" icon="Send" onClick={() => run()} disabled={running}>
                {running ? "运行中…" : "发送"}
              </Button>
            </div>
            <div className="flex items-center gap-1.5 mt-2 px-1 overflow-x-auto scroll-thin">
              {PROMPTS.map(p => (
                <button key={p.label} onClick={() => { setInput(p.label); }}
                  className="chip hover:border-brand-300 hover:text-brand-700 whitespace-nowrap cursor-pointer">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inline inspector (wide) */}
        {show查看orInline && <查看orPane />}
      </div>

      {/* 查看or drawer (narrow) */}
      <Drawer open={inspectorOpen} onClose={() => set查看orOpen(false)} title="治理检查器" subtitle="Effective = 全局 ∧ 本地细化" width={380}>
        <查看orPane />
      </Drawer>

      <Drawer open={traceOpen} onClose={() => setTraceOpen(false)} title="运行轨迹" subtitle={runtime?.id} width={560}>
        {runtime ? (
          <div className="space-y-3">
            {runtime.steps.map((s, i) => (
              <div key={s.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center text-[11px] font-bold shrink-0">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink-800">{stepLabel(s.type)}</p>
                  <pre className="mt-1 text-[11px] mono bg-ink-50 border border-ink-100 rounded-lg p-2 overflow-x-auto">{JSON.stringify(s.payload, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-[12.5px] text-ink-500">暂无运行记录。</p>}
      </Drawer>

      <Modal open={correctionOpen} onClose={() => setCorrectionOpen(false)} title="修正工作室" width={760}
        footer={<>
          <Button variant="ghost" onClick={() => setCorrectionOpen(false)}>取消</Button>
          <Button variant="primary" icon="Check" onClick={applyCorrection}>应用修正</Button>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">当前运行</p>
            <Card className="!shadow-none border-rose-200 bg-rose-50/40">
              <p className="text-[12.5px] text-ink-700">所选技能</p>
              <p className="text-[15px] font-bold text-rose-700">Web Search</p>
              <p className="text-[11.5px] text-ink-500 mt-2">结果：reuters.com、cnbc.com（非官方）</p>
              <p className="text-[11.5px] text-rose-700 mt-1">匹配度：LOW</p>
            </Card>
          </div>
          <div>
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">建议修正</p>
            <Card className="!shadow-none border-emerald-200 bg-emerald-50/40">
              <p className="text-[12.5px] text-ink-700">替代技能</p>
              <p className="text-[15px] font-bold text-emerald-700">Investor Relations Search</p>
              <p className="text-[11.5px] text-ink-500 mt-2">返回投资者关系官网的 10-Q / 10-K 公告</p>
              <p className="text-[11.5px] text-emerald-700 mt-1">匹配度：HIGH</p>
            </Card>
          </div>
        </div>
      </Modal>

      <Modal open={!!explainSkill} onClose={() => setExplainSkill(undefined)} title={`为何选择 ${explainSkill ? skillName(explainSkill) : ""}？`} width={520}>
        {explainSkill && (() => {
          const c = candidates.find(x => x.skillId === explainSkill); if (!c) return null;
          return (
            <div className="space-y-3">
              <ScoreRow label="规划器评分" value={c.plannerScore} />
              <ScoreRow label="全局治理加权" value={c.governanceBonus} tone={c.governanceBonus >= 0 ? "emerald" : "rose"} />
              <ScoreRow label="本地细化" value={0} />
              <div className="border-t border-ink-100 pt-3 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink-800">最终得分</span>
                <span className="mono text-[20px] font-bold text-brand-700">{c.finalScore.toFixed(2)}</span>
              </div>
              {c.reason.length > 0 && (
                <ul className="text-[12px] text-ink-600 list-disc pl-4 space-y-0.5">
                  {c.reason.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );

  function 查看orPane() {
    return (
      <aside className="border-l border-ink-200 bg-white overflow-y-auto scroll-thin h-full">
        <div className="p-4 space-y-4">
          <SectionTitle icon="Pulse" title="治理检查器" subtitle="Effective = 全局 ∧ 本地细化" />
          <Card className="!shadow-none">
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">上下文</p>
            <div className="space-y-1.5 text-[12.5px]">
              <Row k="任务类型" v={String(context.taskType ?? "—")} mono />
              <Row k="来源要求" v={String(context.sourceRequirement ?? "—")} mono />
              <Row k="智能体"   v={String(context.agentId ?? "—")} mono />
            </div>
          </Card>
          <Card className="!shadow-none">
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">全局治理</p>
            {Object.values(globalContracts).filter(g => g.state === "ACTIVE").slice(0, 4).map(g => (
              <div key={g.id} className="flex items-start gap-2 py-1.5 border-b border-ink-100 last:border-b-0">
                <span className={`chip ${g.contractType === "INVARIANT" ? "chip-rose" : "chip-brand"} mt-0.5`}>
                  {g.contractType === "INVARIANT" ? "不变量" : "默认规则"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink-800 leading-snug">{g.title}</p>
                  <p className="text-[11px] text-ink-500 mono">{g.id} · {g.parentVersion}</p>
                </div>
              </div>
            ))}
          </Card>
          <Card className="!shadow-none">
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
              本地治理
              <span className="ml-2 normal-case text-ink-400">（{userLocal契约s.length}）</span>
            </p>
            {userLocal契约s.length === 0 && (
              <p className="text-[12px] text-ink-500 italic">暂无本地规则，运行证据将沉淀为本地规则。</p>
            )}
            {userLocal契约s.map(l => (
              <div key={l.id} className="flex items-start gap-2 py-1.5 border-b border-ink-100 last:border-b-0">
                <StateBadge state={l.state} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink-800 leading-snug">{l.title}</p>
                  <p className="text-[11px] text-ink-500 mono">{l.id}</p>
                </div>
              </div>
            ))}
          </Card>
          <Card className="!shadow-none">
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">生效结果</p>
            {candidates.length === 0 ? (
              <p className="text-[12px] text-ink-500 italic">运行任务后计算生效得分。</p>
            ) : (
              <div className="space-y-1.5">
                {[...candidates].sort((a,b) => b.finalScore - a.finalScore).map(c => (
                  <div key={c.skillId} className="flex items-center gap-2">
                    <span className="text-[12px] text-ink-700 flex-1 truncate">{skillName(c.skillId)}</span>
                    <span className="mono text-[12px] font-semibold text-ink-900">{c.finalScore.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </aside>
    );
  }
}

const Row: React.FC<{ k: string; v: string; mono?: boolean }> = ({ k, v, mono }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-ink-500">{k}</span>
    <span className={`text-ink-800 ${mono ? "mono" : ""}`}>{v}</span>
  </div>
);

const ScoreRow: React.FC<{ label: string; value: number; tone?: "brand" | "emerald" | "rose" }> = ({ label, value, tone = "brand" }) => {
  const colors = { brand: "text-brand-700", emerald: "text-emerald-700", rose: "text-rose-700" };
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] text-ink-600">{label}</span>
      <span className={`mono text-[15px] font-semibold ${colors[tone]}`}>{value >= 0 ? "+" : ""}{value.toFixed(2)}</span>
    </div>
  );
};

function stepLabel(t: string) {
  return ({
    TASK_RECEIVED: "接收任务",
    CONTEXT_EXTRACTED: "提取上下文",
    SKILL_MATCHED: "匹配技能",
    GOVERNANCE_RESOLVED: "治理裁决",
    SKILL_SELECTED: "选择技能",
    SKILL_EXECUTED: "执行技能",
    RESULT_EVALUATED: "结果评估",
    USER_CORRECTION: "用户修正",
  } as Record<string, string>)[t] ?? t;
}
