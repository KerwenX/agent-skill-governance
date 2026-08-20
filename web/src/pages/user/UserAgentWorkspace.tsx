import React from "react";
import { useNavigate, useParams, useOutletContext, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { orchestrator } from "../../app/animations";
import { eventBus, nextId } from "../../app/eventBus";
import type {
  GovernanceEvent, RuntimeExecution, RuntimeStatus, RuntimeStep, SkillCandidate,
} from "../../domain/types";
import { resolveGovernance } from "../../engines/governance";
import { createEvidence, type EvidenceProfile } from "../../engines/evidence";
import { Button, Card, Drawer, Modal, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { ScoreTransition } from "../../components/animations/Animations";
import type { ScenarioTask } from "../../fixtures/scenarios/types";

type Phase =
  | "IDLE" | "TASK_RECEIVED" | "CONTEXT_EXTRACTED"
  | "SKILL_MATCHED" | "GOVERNANCE_RESOLVED"
  | "SKILL_SELECTED" | "SKILL_EXECUTED" | "RESULT_EVALUATED"
  | "ANOMALY" | "BLOCKED" | "CORRECTION" | "CORRECTED" | "OPPORTUNITY";

interface Message { id: string; role: "user" | "agent" | "system"; text: string; ts: number; }
interface ShellCtx { collapsed: boolean; }

export default function UserAgentWorkspace() {
  const { userId, agentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useGovernance(s => s.users[userId!]);
  const skills = useGovernance(s => s.skills);
  const scenario = useGovernance(s => s.scenario);
  const globalContracts = useGovernance(s => s.globalContracts);
  const localContracts  = useGovernance(s => s.localContracts);
  const sessionPermissions = useGovernance(s => s.sessionPermissions);
  const addRuntime = useGovernance(s => s.addRuntime);
  const updateRuntime = useGovernance(s => s.updateRuntime);
  const emit = useGovernance(s => s.emit);
  const grantPermissions = useGovernance(s => s.grantPermissions);
  const globalVersion = useGovernance(s => s.globalVersion);
  const { collapsed } = useOutletContext<ShellCtx>();

  const tasks = scenario.tasks;
  const [taskId, setTaskId] = React.useState(searchParams.get("task") ?? tasks[0]?.id);
  const task = tasks.find(t => t.id === taskId) ?? tasks[0];
  const [input, setInput] = React.useState(task?.prompt ?? "");
  const [phase, setPhase] = React.useState<Phase>("IDLE");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [candidates, setCandidates] = React.useState<SkillCandidate[]>([]);
  const [selectedSkill, setSelectedSkill] = React.useState<string>();
  const [runtime, setRuntime] = React.useState<RuntimeExecution>();
  const [traceOpen, setTraceOpen] = React.useState(false);
  const [correctionOpen, setCorrectionOpen] = React.useState(false);
  const [explainSkill, setExplainSkill] = React.useState<string>();
  const [context, setContext] = React.useState<Record<string, unknown>>({});
  const [checks, setChecks] = React.useState<{ label: string; ok?: boolean; note?: string }[]>([]);
  const [inspectorOpen, setInspector] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [blockedSkill, setBlockedSkill] = React.useState<string>();

  React.useEffect(() => { setInput(task?.prompt ?? ""); }, [taskId, task?.prompt]);

  const userLocalRules = React.useMemo(
    () => Object.values(localContracts).filter(
      c => c.ownerId === userId && (c.state === "ACTIVE" || c.state === "ACTIVE_REFINEMENT")
    ),
    [localContracts, userId]
  );

  const skillName = (id?: string) => id ? (skills[id]?.name ?? id) : "—";
  const skillPerms = React.useMemo(
    () => Object.fromEntries(Object.values(skills).map(s => [s.id, s.requiredPermissions ?? []])),
    [skills]
  );

  const addStep = (rt: RuntimeExecution, type: RuntimeStep["type"], payload: RuntimeStep["payload"]) => {
    const step: RuntimeStep = { id: nextId("step"), type, timestamp: Date.now(), payload };
    const updated = { ...rt, steps: [...rt.steps, step] };
    setRuntime(updated); updateRuntime(rt.id, updated);
    return updated;
  };
  const addMessage = (role: Message["role"], text: string) =>
    setMessages(m => [...m.slice(-30), { id: nextId("m"), role, text, ts: Date.now() }]);

  const buildProfile = React.useCallback((t: ScenarioTask, uid: string): EvidenceProfile => {
    const p = scenario.evidence(t, uid);
    return {
      violationType: p.violationType, relation: p.relation, resolution: p.resolution,
      items: p.items, localPredicates: p.localPredicates,
    };
  }, [scenario]);

  const run = React.useCallback(async (promptText?: string, taskIdOverride?: string) => {
    const effectiveTask = tasks.find(t => t.id === taskIdOverride) ?? task;
    if (running || !effectiveTask) return;
    if (taskIdOverride) setTaskId(taskIdOverride);
    const text = (promptText ?? effectiveTask.prompt).trim();
    if (!text) return;
    setRunning(true);
    const perms = sessionPermissions[userId!] ?? effectiveTask.permissions ?? [];
    const attributes: Record<string, string | number | boolean> = { ...(effectiveTask.attributes ?? {}) };
    const ctx = {
      taskType: effectiveTask.taskType, sourceRequirement: effectiveTask.sourceRequirement ?? "any",
      agentId, permission: perms, attributes, ...attributes,
    };

    const rt: RuntimeExecution = {
      id: nextId("rt"), scenarioId: scenario.id, userId: userId!, agentId: agentId!, input: text,
      context: { taskType: effectiveTask.taskType, sourceRequirement: effectiveTask.sourceRequirement, agentId,
        sessionId: nextId("sess"), attributes, permission: perms },
      candidateSkills: [], steps: [], status: "RUNNING", startedAt: Date.now(),
    };
    setRuntime(rt); addRuntime(rt);
    setSelectedSkill(undefined); setChecks([]); setCandidates([]); setBlockedSkill(undefined);
    setInput(text);
    addMessage("user", text);
    setPhase("TASK_RECEIVED");
    emit({ eventId: nextId("evt"), eventType: "USER_TASK_STARTED", timestamp: Date.now(),
      sourceDomain: "USER", sourceId: eventBus.id, targetDomain: "ALL",
      correlationId: nextId("corr"), globalVersion,
      payload: { runtimeId: rt.id, userId } } as GovernanceEvent);

    await orchestrator.wait(260);
    let rt2 = addStep(rt, "TASK_RECEIVED", { input: text });
    setPhase("CONTEXT_EXTRACTED");
    setContext({ taskType: effectiveTask.taskType, sourceRequirement: effectiveTask.sourceRequirement, agentId, userId, ...attributes });
    addMessage("system", `已提取上下文：taskType=${effectiveTask.taskType}${attributes ? "，" + Object.entries(attributes).map(([k,v])=>`${k}=${v}`).join("，") : ""}`);
    await orchestrator.wait(420);
    rt2 = addStep(rt2, "CONTEXT_EXTRACTED", { taskType: effectiveTask.taskType, attributes });

    setPhase("SKILL_MATCHED");
    const initialCandidates: SkillCandidate[] = effectiveTask.candidates.map(c => ({
      skillId: c.skillId, plannerScore: c.plannerScore, governanceBonus: 0,
      finalScore: c.plannerScore, reason: [...c.reason],
    }));
    setCandidates(initialCandidates);
    await orchestrator.wait(380);
    rt2 = addStep(rt2, "SKILL_MATCHED", { candidates: initialCandidates.map(c => c.skillId) });

    setPhase("GOVERNANCE_RESOLVED");
    setChecks([{ label: "检查全局不变量与权限…" }]);
    await orchestrator.wait(320);
    setChecks(c => [{ ...c[0], ok: true }, { label: "解析全局默认与本地细化…" }]);
    await orchestrator.wait(320);

    const activeGlobals = Object.values(globalContracts).filter(g => g.state === "ACTIVE");
    const effective = resolveGovernance(
      activeGlobals.filter(g => g.contractType === "INVARIANT"),
      activeGlobals.filter(g => g.contractType === "DEFAULT"),
      userLocalRules, ctx, initialCandidates, skillPerms,
    );
    const blocked = effective.find(c => c.finalScore === 0 && skills[c.skillId]?.requiredPermissions?.length);
    const applied = effective.some(c => c.governanceBonus !== 0 || c.finalScore === 0);
    setChecks(c => [c[0], c[1], {
      label: blocked ? `权限不足：${skillName(blocked.skillId)} 被全局不变量阻断`
        : applied ? "命中治理规则，已调整技能得分" : "暂无适用规则，按规划器评分选择",
      ok: blocked ? false : applied,
    }]);
    setCandidates(effective);
    rt2 = addStep(rt2, "GOVERNANCE_RESOLVED", { scores: effective });
    await orchestrator.wait(380);

    // Permission block (E2E-03): the intended skill is gated → block before executing.
    if (blocked && blocked.skillId === effectiveTask.expect.selectedSkillId) {
      const prof = buildProfile(effectiveTask, userId!);
      setSelectedSkill(blocked.skillId);
      const rt3: RuntimeExecution = { ...rt2, candidateSkills: effective, selectedSkillId: blocked.skillId,
        status: "FAILED", resultSnippets: effectiveTask.expect.snippets,
        anomalyReason: `PERMISSION_BLOCK: missing ${effectiveTask.expect.blockPermission}`,
        evidenceProfile: prof };
      setRuntime(rt3); updateRuntime(rt.id, rt3);
      setBlockedSkill(blocked.skillId);
      setPhase("BLOCKED");
      addStep(rt3, "SKILL_SELECTED", { selected: blocked.skillId, finalScore: 0, blocked: true });
      addStep(rt3, "RESULT_EVALUATED", { blocked: blocked.skillId });
      addMessage("system", `⛔ 权限不足：${skillName(blocked.skillId)} 需要 ${effectiveTask.expect.blockPermission}，调用前被阻断。`);
      setRunning(false);
      return;
    }

    setPhase("SKILL_SELECTED");
    const winner = [...effective].sort((a,b) => b.finalScore - a.finalScore)[0];
    setSelectedSkill(winner.skillId);
    const rt3: RuntimeExecution = { ...rt2, candidateSkills: effective, selectedSkillId: winner.skillId };
    setRuntime(rt3); updateRuntime(rt.id, rt3);
    addStep(rt3, "SKILL_SELECTED", { selected: winner.skillId, finalScore: winner.finalScore });
    addMessage("agent", `选中技能：${skillName(winner.skillId)}（综合得分 ${winner.finalScore.toFixed(2)}）`);
    await orchestrator.wait(320);

    setPhase("SKILL_EXECUTED");
    addMessage("agent", `正在执行 ${skillName(winner.skillId)}…`);
    await orchestrator.wait(560);

    // Anomaly only if the originally-bad skill won AND governance hasn't fixed it yet
    // (closureVersion reached means a published global rule now resolves it).
    const closureReached = effectiveTask.expect.closureVersion
      ? parseInt(globalVersion.replace("v",""),10) >= parseInt(effectiveTask.expect.closureVersion.replace("v",""),10)
      : winner.skillId !== effectiveTask.expect.selectedSkillId;
    const anomaly = !!effectiveTask.expect.anomaly && winner.skillId === effectiveTask.expect.selectedSkillId && !closureReached;
    const snippets = anomaly ? effectiveTask.expect.snippets
      : (effectiveTask.expect.correctionSnippets && winner.skillId === effectiveTask.expect.correctionSkillId) ? effectiveTask.expect.correctionSnippets
      : effectiveTask.expect.snippets;

    setPhase(anomaly ? "ANOMALY" : "RESULT_EVALUATED");
    const updated: RuntimeExecution = {
      ...rt3,
      status: (anomaly ? "ANOMALY_DETECTED" : "SUCCEEDED") as RuntimeStatus,
      resultSnippets: snippets,
      anomalyReason: anomaly ? effectiveTask.expect.anomalyReason : undefined,
      evidenceProfile: anomaly ? buildProfile(task, userId!) : undefined,
      completedAt: Date.now(),
    };
    setRuntime(updated); updateRuntime(rt.id, updated);
    addStep(updated, "RESULT_EVALUATED", { match: anomaly ? "LOW" : "HIGH" });

    if (anomaly) {
      addMessage("system", "⚠ 结果未达业务标准，发现治理机会。");
      emit({ eventId: nextId("evt"), eventType: "RUNTIME_ANOMALY_DETECTED", timestamp: Date.now(),
        sourceDomain: "USER", sourceId: eventBus.id, targetDomain: "ALL",
        correlationId: nextId("corr"), globalVersion,
        payload: { runtimeId: rt.id, reason: scenario.evidence(task, userId!).violationType } } as GovernanceEvent);
      await orchestrator.wait(500);
      setCorrectionOpen(true);
    } else {
      addMessage("agent", `✓ ${snippets[0]?.title ?? "任务完成"}（${snippets[0]?.source ?? ""}）`);
      setRunning(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, input, userId, agentId, globalVersion, globalContracts, userLocalRules, task, scenario, skillPerms, sessionPermissions]);

  const applyCorrection = React.useCallback(async () => {
    if (!runtime || !task) return;
    setPhase("CORRECTION"); setCorrectionOpen(false);
    const alt = task.expect.correctionSkillId!;
    const rt: RuntimeExecution = { ...runtime, correctionSkillId: alt, status: "CORRECTED" };
    setRuntime(rt); updateRuntime(runtime.id, rt);
    addStep(rt, "USER_CORRECTION", { from: runtime.selectedSkillId, to: alt });
    addMessage("user", `改用 ${skillName(alt)}。`);
    emit({ eventId: nextId("evt"), eventType: "USER_CORRECTION_SUBMITTED", timestamp: Date.now(),
      sourceDomain: "USER", sourceId: eventBus.id, targetDomain: "ALL",
      correlationId: nextId("corr"), globalVersion,
      payload: { runtimeId: runtime.id, alternateSkillId: alt } } as GovernanceEvent);
    await orchestrator.wait(420);
    setSelectedSkill(alt);
    setCandidates(cs => cs.map(c => c.skillId === alt
      ? { ...c, finalScore: 1.0, governanceBonus: +(1 - c.plannerScore).toFixed(2), reason: [...c.reason, "用户修正：强制选择该技能"] } : c));
    if (task.expect.correctionSnippets) addMessage("agent", task.expect.correctionSnippets.map(s => s.title).join("；"));
    setPhase("CORRECTED");
    await orchestrator.wait(420);
    setPhase("OPPORTUNITY");
    addMessage("system", "已识别治理机会：可将该修正结构化为证据，参与跨用户聚合。");
    setRunning(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, task, emit, globalVersion, updateRuntime]);

  const goBuildEvidence = () => runtime && navigate(`/user/${userId}/证据/new/${runtime.id}`);
  const requestGrant = () => {
    // E2E-03: a 24h delegated grant maps to finance:read after v21.
    grantPermissions(userId!, ["delegated_finance_read"]);
    addMessage("system", "已提交 24 小时委托授权；重新认证后会话获得 delegated_finance_read。请重跑任务。");
    setPhase("IDLE");
  };

  React.useEffect(() => {
    return eventBus.subscribe(async (event) => {
      if (event.eventType === "DEMO_RESET") {
        setPhase("IDLE"); setMessages([]); setCandidates([]); setRuntime(undefined);
        setSelectedSkill(undefined); setContext({}); setChecks([]); setBlockedSkill(undefined);
        return;
      }
      if (event.eventType !== "DEMO_COMMAND") return;
      const { action, userId: target, prompt, task: cmdTask } = event.payload as
        { action: string; userId?: string; prompt?: string; task?: string };
      if (target && target !== userId) return;
      if (cmdTask && tasks.some(t => t.id === cmdTask)) setTaskId(cmdTask);
      // Allow state to settle before running, when a task was just selected.
      if (cmdTask && tasks.some(t => t.id === cmdTask)) await new Promise(r => setTimeout(r, 60));
      if (action === "run") { await run(prompt); }
      else if (action === "correct") { await applyCorrection(); }
      else if (action === "buildEvidence") { setTimeout(goBuildEvidence, 600); }
      else if (action === "requestGrant") { requestGrant(); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, applyCorrection, userId, tasks]);

  const showInspectorInline = !collapsed;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="h-14 bg-white border-b border-ink-200 flex items-center px-4 gap-3 shrink-0">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-900 leading-tight">智能体工作台 · <span className="mono">{agentId}</span></p>
          <p className="text-[11px] text-ink-500">模型 fabric-model-4 · 全局基准 <span className="mono text-brand-700">{globalVersion}</span> · E2E-0{scenario.index} {scenario.shortTitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select value={taskId} onChange={e => setTaskId(e.target.value)}
            className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[12px] text-ink-700 outline-none max-w-[260px]">
            {tasks.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {collapsed && <Button variant="outline" size="sm" icon="Pulse" onClick={() => setInspector(true)}>检查器</Button>}
          <Button variant="outline" size="sm" icon="FileCode" onClick={() => setTraceOpen(true)}>轨迹</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: showInspectorInline ? "1fr 320px" : "1fr" }}>
        <div className="flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto scroll-thin px-5 py-4 space-y-3">
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <motion.div key={m.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : m.role === "system" ? "justify-center" : "justify-start"}`}>
                  {m.role === "system" ? (
                    <div className="max-w-[92%] text-[11.5px] text-ink-500 bg-ink-100/70 rounded-full px-3 py-1">{m.text}</div>
                  ) : (
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap
                      ${m.role === "user" ? "bg-brand-600 text-white rounded-br-sm" : "bg-white border border-ink-200 text-ink-800 rounded-bl-sm"}`}>
                      {m.text}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {phase !== "IDLE" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-3 space-y-2.5">
                {Object.keys(context).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-500">
                    <Icon name="Spark" size={12} className="text-brand-600" />
                    {Object.entries(context).map(([k,v]) => (
                      <span key={k} className="chip">{k}=<span className="mono ml-1">{String(v)}</span></span>
                    ))}
                  </div>
                )}

                {candidates.length > 0 && (
                  <div className="space-y-1.5">
                    {candidates.map(c => {
                      const sel = selectedSkill === c.skillId;
                      return (
                        <motion.div key={c.skillId} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className={`p-2.5 rounded-xl border-2 transition-colors
                            ${sel ? "border-brand-400 bg-brand-50/70" : "border-ink-200 bg-white"}`}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center text-ink-700 shrink-0">
                              <Icon name="Cog" size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-semibold text-ink-900">{skillName(c.skillId)}</p>
                              <p className="text-[11px] text-ink-500 truncate">{c.reason[0]}</p>
                            </div>
                            <ScoreTransition value={c.finalScore} threshold={0} digits={2} />
                            <button onClick={() => setExplainSkill(c.skillId)} className="text-[11px] text-brand-700 hover:underline shrink-0">为何</button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {checks.length > 0 && (
                  <div className="rounded-lg bg-ink-50 border border-ink-100 p-2.5 space-y-1">
                    {checks.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        {g.ok === undefined ? <span className="w-3 h-3 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
                          : g.ok ? <Icon name="Check" size={13} className="text-emerald-600" />
                          : <span className="w-3 h-3 rounded-full bg-amber-400" />}
                        <span className="text-ink-700">{g.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {runtime?.resultSnippets && ["ANOMALY","RESULT_EVALUATED","BLOCKED","CORRECTED","OPPORTUNITY"].includes(phase) && (
                  <div className="grid gap-1.5">
                    {runtime.resultSnippets.map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border
                          ${s.official ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.official ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className="text-[12px] text-ink-800 flex-1 truncate">{s.title}</span>
                        <span className="text-[10.5px] mono text-ink-500">{s.source}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                <AnimatePresence>
                  {phase === "ANOMALY" && (
                    <motion.div initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Icon name="Warn" size={15} /></span>
                      <div className="flex-1">
                        <p className="text-[12.5px] font-semibold text-amber-900">发现治理问题</p>
                        <p className="text-[11px] text-amber-800">{task?.expect.anomalyReason}</p>
                      </div>
                      <Button variant="primary" size="sm" icon="Spark" onClick={() => setCorrectionOpen(true)}>修正</Button>
                    </motion.div>
                  )}
                  {phase === "BLOCKED" && (
                    <motion.div initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-rose-300 bg-rose-50 p-3 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"><Icon name="Warn" size={15} /></span>
                        <div>
                          <p className="text-[12.5px] font-semibold text-rose-900">全局不变量阻断 · 缺少 {task?.expect.blockPermission}</p>
                          <p className="text-[11px] text-rose-800">本地规则不能放宽权限。可提交证据，或申请临时委托授权。</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="primary" size="sm" icon="Shield" onClick={requestGrant}>申请临时授权</Button>
                        <Button variant="ghost" size="sm" onClick={goBuildEvidence}>提交证据</Button>
                      </div>
                    </motion.div>
                  )}
                  {phase === "OPPORTUNITY" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-brand-300 bg-gradient-to-br from-brand-50 to-violet-50 p-3">
                      <p className="text-[12.5px] font-bold text-brand-900 mb-1">识别到治理机会</p>
                      <p className="text-[11.5px] text-brand-900/80 mb-2.5">可将该修正结构化为证据，保留在本地或在跨用户聚合后升级为全局规则。</p>
                      <div className="flex items-center gap-2">
                        <Button variant="primary" size="sm" icon="ArrowR" onClick={goBuildEvidence}>结构化证据</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPhase("CORRECTED")}>暂不处理</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          <div className="border-t border-ink-200 bg-white p-2.5 shrink-0">
            <div className="flex items-end gap-2 card !rounded-xl !shadow-none p-2">
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={1}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
                placeholder="向智能体提问…"
                className="flex-1 resize-none bg-transparent outline-none text-[12.5px] leading-6 px-1.5 py-1 max-h-24" />
              <Button variant="primary" size="sm" icon="Send" onClick={() => run()} disabled={running}>
                {running ? "运行中…" : "发送"}
              </Button>
            </div>
          </div>
        </div>

        {showInspectorInline && <InspectorPane />}
      </div>

      <Drawer open={inspectorOpen} onClose={() => setInspector(false)} title="治理检查器" width={360}>
        <InspectorPane />
      </Drawer>

      <Drawer open={traceOpen} onClose={() => setTraceOpen(false)} title="运行轨迹" width={520}>
        {runtime ? (
          <div className="space-y-2.5">
            {runtime.steps.map((s, i) => (
              <div key={s.id} className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center text-[10.5px] font-bold shrink-0">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-ink-800">{stepLabel(s.type)}</p>
                  <pre className="mt-1 text-[10.5px] mono bg-ink-50 border border-ink-100 rounded-lg p-2 overflow-x-auto">{JSON.stringify(s.payload, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-[12.5px] text-ink-500">暂无运行记录。</p>}
      </Drawer>

      <Modal open={correctionOpen} onClose={() => setCorrectionOpen(false)} title="修正工作室" width={720}
        footer={<>
          <Button variant="ghost" onClick={() => setCorrectionOpen(false)}>取消</Button>
          <Button variant="primary" icon="Check" onClick={applyCorrection}>应用修正</Button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <Card className="!shadow-none border-rose-200 bg-rose-50/40">
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold">当前选择</p>
            <p className="text-[15px] font-bold text-rose-700">{skillName(runtime?.selectedSkillId)}</p>
            <p className="text-[11.5px] text-ink-500 mt-2">{task?.expect.snippets[0]?.title}</p>
          </Card>
          <Card className="!shadow-none border-emerald-200 bg-emerald-50/40">
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold">建议修正</p>
            <p className="text-[15px] font-bold text-emerald-700">{skillName(task?.expect.correctionSkillId)}</p>
            <p className="text-[11.5px] text-ink-500 mt-2">{task?.expect.correctionSnippets?.[0]?.title ?? "应用用户建议的替代技能后重新执行。"}</p>
          </Card>
        </div>
      </Modal>

      <Modal open={!!explainSkill} onClose={() => setExplainSkill(undefined)} title={`为何选择 ${skillName(explainSkill)}？`} width={480}>
        {explainSkill && (() => {
          const c = candidates.find(x => x.skillId === explainSkill); if (!c) return null;
          return (
            <div className="space-y-2.5">
              <ScoreRow label="规划器评分" value={c.plannerScore} />
              <ScoreRow label="治理加权" value={c.governanceBonus} tone={c.governanceBonus >= 0 ? "emerald" : "rose"} />
              <div className="border-t border-ink-100 pt-2.5 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-ink-800">最终得分</span>
                <span className="mono text-[19px] font-bold text-brand-700">{c.finalScore.toFixed(2)}</span>
              </div>
              {c.reason.length > 0 && <ul className="text-[11.5px] text-ink-600 list-disc pl-4 space-y-0.5">{c.reason.map((r,i) => <li key={i}>{r}</li>)}</ul>}
            </div>
          );
        })()}
      </Modal>
    </div>
  );

  function InspectorPane() {
    return (
      <aside className="border-l border-ink-200 bg-white overflow-y-auto scroll-thin h-full">
        <div className="p-3 space-y-3">
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">上下文</p>
            <div className="space-y-1 text-[11.5px]">
              <Row k="任务类型" v={String(context.taskType ?? "—")} mono />
              <Row k="来源要求" v={String(context.sourceRequirement ?? "—")} mono />
              <Row k="智能体" v={String(context.agentId ?? "—")} mono />
              {sessionPermissions[userId!] && <Row k="会话权限" v={sessionPermissions[userId!].join(", ")} mono />}
            </div>
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">全局治理</p>
            {Object.values(globalContracts).filter(g => g.state === "ACTIVE").slice(0, 4).map(g => (
              <div key={g.id} className="flex items-start gap-2 py-1.5 border-b border-ink-100 last:border-b-0">
                <span className={`chip ${g.contractType === "INVARIANT" ? "chip-rose" : "chip-brand"} mt-0.5`}>
                  {g.contractType === "INVARIANT" ? "不变量" : "默认"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-medium text-ink-800 leading-snug">{g.title}</p>
                  <p className="text-[10.5px] text-ink-500 mono">{g.id}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">本地治理（{userLocalRules.length}）</p>
            {userLocalRules.length === 0 && <p className="text-[11.5px] text-ink-500 italic">暂无本地规则。</p>}
            {userLocalRules.map(l => (
              <div key={l.id} className="flex items-start gap-2 py-1.5 border-b border-ink-100 last:border-b-0">
                <StateBadge state={l.state} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-medium text-ink-800 leading-snug">{l.title}</p>
                  <p className="text-[10.5px] text-ink-500 mono">{l.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }
}

const Row: React.FC<{ k: string; v: string; mono?: boolean }> = ({ k, v, mono }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-ink-500">{k}</span>
    <span className={`text-ink-800 truncate ${mono ? "mono" : ""}`}>{v}</span>
  </div>
);
const ScoreRow: React.FC<{ label: string; value: number; tone?: "brand"|"emerald"|"rose" }> = ({ label, value, tone = "brand" }) => {
  const colors = { brand: "text-brand-700", emerald: "text-emerald-700", rose: "text-rose-700" };
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-ink-600">{label}</span>
      <span className={`mono text-[14px] font-semibold ${colors[tone]}`}>{value >= 0 ? "+" : ""}{value.toFixed(2)}</span>
    </div>
  );
};
function stepLabel(t: string) {
  return ({
    TASK_RECEIVED: "接收任务", CONTEXT_EXTRACTED: "提取上下文", SKILL_MATCHED: "匹配技能",
    GOVERNANCE_RESOLVED: "治理裁决", SKILL_SELECTED: "选择技能", SKILL_EXECUTED: "执行技能",
    RESULT_EVALUATED: "结果评估", USER_CORRECTION: "用户修正",
  } as Record<string, string>)[t] ?? t;
}
