import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { createEvidence } from "../../engines/evidence";
import { buildLocalContractFromEvidence } from "../../engines/governance";
import { eventBus, nextId } from "../../app/eventBus";
import type { GovernanceEvent, LocalEvidence } from "../../domain/types";
import { orchestrator } from "../../app/animations";

const STEPS = ["上下文", "技能关系", "运行证据", "解决方式", "依赖信息"];
const EXTRACT = ["上下文", "技能对", "违规类型", "修正动作", "版本信息"];

export default function UserEvidenceNew() {
  const { userId, runtimeId } = useParams();
  const navigate = useNavigate();
  const s = useGovernance();
  const runtime = runtimeId ? s.runtimes[runtimeId] : undefined;

  const [step, setStep] = React.useState(0);
  const [extracting, setExtracting] = React.useState(true);
  const [extracted, setExtracted] = React.useState<Record<string, boolean>>({});
  const [createLocal, setCreateLocal] = React.useState<boolean | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [证据, set证据] = React.useState<LocalEvidence | null>(null);
  const [autoCreate, setAutoCreate] = React.useState(false);

  React.useEffect(() => {
    if (!runtime) return;
    let cancelled = false;
    (async () => {
      for (const label of EXTRACT) {
        await orchestrator.wait(220);
        if (cancelled) return;
        setExtracted(prev => ({ ...prev, [label]: true }));
      }
      await orchestrator.wait(180);
      if (cancelled) return;
      const ev = createEvidence(runtime, s.globalVersion, true);
      Object.keys(ev.skillVersions).forEach(sid => { ev.skillVersions[sid] = s.skills[sid]?.version ?? "0.0"; });
      set证据(ev);
      setExtracting(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime?.id]);

  // Demo command: auto-create local rule
  React.useEffect(() => {
    return eventBus.subscribe(event => {
      if (event.eventType !== "DEMO_COMMAND") return;
      const { action, userId: target } = event.payload as { action: string; userId?: string };
      if (target && target !== userId) return;
      if (action === "createLocalRule") setAutoCreate(true);
    });
  }, [userId]);

  React.useEffect(() => {
    if (autoCreate && 证据 && !submitting && !extracting) {
      confirm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate, 证据, submitting, extracting]);

  if (!runtime || !证据) {
    return <Card className="m-6"><p className="text-[13px] text-ink-600">正在从运行记录 {runtimeId} 生成证据…</p></Card>;
  }

  const canConfirm = 证据.context.taskType
    && 证据.skillRelation.sourceSkillId
    && 证据.runtimeEvidence.length > 0
    && 证据.parentGlobalVersion;

  async function confirm(alsoCreateLocal: boolean) {
    if (!证据 || !runtime) return;
    setCreateLocal(alsoCreateLocal);
    setSubmitting(true);
    const final证据: LocalEvidence = {
      ...证据,
      state: "LOCAL",
      localContractId: undefined,
      localResolution: alsoCreateLocal ? 证据.localResolution : undefined,
    };
    s.addEvidence(final证据);

    if (alsoCreateLocal) {
      const c = buildLocalContractFromEvidence(final证据);
      s.addLocalContract(c);
      final证据.localContractId = c.id;
      s.updateEvidence(final证据.id, { localContractId: c.id, state: "LOCAL" });
      s.emit({
        eventId: nextId("evt"), eventType: "LOCAL_CONTRACT_CREATED",
        timestamp: Date.now(), sourceDomain: "USER", sourceId: eventBus.id,
        targetDomain: "ALL", correlationId: nextId("corr"),
        globalVersion: s.globalVersion, payload: { contract: c },
      } as GovernanceEvent);
    }

    s.emit({
      eventId: nextId("evt"), eventType: "LOCAL_EVIDENCE_CREATED",
      timestamp: Date.now(), sourceDomain: "USER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: s.globalVersion, payload: { evidenceId: final证据.id, evidence: final证据 },
    } as GovernanceEvent);

    await orchestrator.wait(500);
    setSubmitting(false);
    navigate(`/user/${userId}/agent/${runtime.agentId}`);
  }

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-[1200px] mx-auto p-6 space-y-5">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
          <button className="link-quiet" onClick={() => navigate(-1)}>返回工作台</button>
          <Icon name="ChevronR" size={12} /><span>结构化证据</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-ink-900">证据构建器</h1>
            <p className="text-[13px] text-ink-500 mt-0.5">从运行记录 <span className="mono">{runtime.id}</span> 自动结构化提取</p>
          </div>
          <StateBadge state={extracting ? "EVALUATING" : "STRUCTURED"} />
        </div>

        <Card>
          <div className="flex items-center">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <button onClick={() => setStep(i)} className="flex items-center gap-2 group">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-colors
                    ${i <= step ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-500 border-ink-200 group-hover:border-brand-300"}`}>
                    {String(i+1).padStart(2, "0")}
                  </span>
                  <span className={`text-[12.5px] font-medium ${i <= step ? "text-ink-900" : "text-ink-500"}`}>{label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px mx-3 bg-ink-200" />}
              </React.Fragment>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 lg:col-span-4">
            <SectionTitle icon="Terminal" title="运行来源" subtitle="自动提取的字段" />
            <ul className="space-y-2">
              {EXTRACT.map(label => (
                <motion.li key={label}
                  animate={extracted[label] ? { opacity: 1, x: 0 } : { opacity: 0.4, x: 0 }}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-[12.5px]
                    ${extracted[label] ? "border-emerald-200 bg-emerald-50/50 text-ink-800" : "border-ink-200 bg-white text-ink-500"}`}>
                  {extracted[label]
                    ? <Icon name="Check" size={14} className="text-emerald-600" />
                    : <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />}
                  {label}
                </motion.li>
              ))}
            </ul>
          </Card>

          <Card className="col-span-12 lg:col-span-5">
            <SectionTitle title={STEPS[step]} />
            <div className="space-y-3 text-[12.5px]">
              {step === 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <Field k="任务类型" v={证据.context.taskType ?? "—"} />
                  <Field k="来源要求" v={证据.context.sourceRequirement ?? "—"} />
                  <Field k="智能体" v={证据.context.agentId ?? "—"} />
                  <Field k="会话" v={证据.context.sessionId ?? "—"} />
                </div>
              )}
              {step === 1 && (
                <div className="space-y-2">
                  <Field k="关系类型" v={证据.skillRelation.type} />
                  <Field k="源技能" v={证据.skillRelation.sourceSkillId} />
                  <Field k="目标技能" v={证据.skillRelation.targetSkillId ?? "—"} />
                </div>
              )}
              {step === 2 && (
                <ul className="space-y-1.5">
                  {证据.runtimeEvidence.map((it, i) => (
                    <li key={i} className="p-2 rounded-lg bg-ink-50 border border-ink-100">
                      <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibot">{it.kind}</p>
                      <p className="text-ink-800 font-medium">{it.label}：<span className="mono">{String(it.value)}</span></p>
                      {it.match && <p className="text-[11px] text-ink-500">匹配度：{it.match}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {step === 3 && (
                证据.localResolution ? (
                  <div className="p-3 rounded-lg bg-brand-50 border border-brand-200">
                    <p className="font-semibold text-brand-800">{证据.localResolution.type}</p>
                    <p className="text-brand-900/80 mt-1">{证据.localResolution.description}</p>
                    <ul className="mt-2 list-disc pl-4 text-[12px] text-brand-900/80 space-y-0.5">
                      {证据.localResolution.rationale.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                ) : <p className="text-ink-500 italic">未选择本地解决方式。</p>
              )}
              {step === 4 && (
                <div className="space-y-2">
                  <Field k="父全局版本" v={证据.parentGlobalVersion} />
                  <Field k="技能版本" v={Object.entries(证据.skillVersions).map(([k,v]) => `${k}@${v}`).join(", ")} />
                  <Field k="上下文模式" v={证据.context.taskType ?? "—"} />
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)}>上一步</Button>
              {step < 4 && <Button variant="soft" onClick={() => setStep(s => s + 1)}>下一步</Button>}
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-3 !bg-ink-900 text-ink-100 border-ink-800">
            <p className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-2">证据预览</p>
            <pre className="text-[11px] mono leading-relaxed whitespace-pre-wrap break-all">
{`${证据.id}
状态: ${证据.state}
用户: ${证据.userId}
违规:
  ${证据.violationType}
技能关系:
  ${证据.skillRelation.type}: ${证据.skillRelation.sourceSkillId} -> ${证据.skillRelation.targetSkillId}
上下文:
  任务: ${证据.context.taskType}
  来源: ${证据.context.sourceRequirement}
质量: ${证据.qualityScore.toFixed(2)}
父版本: ${证据.parentGlobalVersion}`}
            </pre>
          </Card>
        </div>

        <div className="sticky bottom-4 card p-3 flex items-center gap-2 flex-wrap shadow-pop">
          <div className="flex-1 text-[12.5px] text-ink-600">
            {canConfirm ? "证据已完整。可仅提交证据，或同时生成本地治理规则。" : "请补全必填字段。"}
          </div>
          <Button variant="ghost" onClick={() => confirm(false)} disabled={!canConfirm || submitting}>仅提交证据</Button>
          <Button variant="primary" icon="Shield" onClick={() => confirm(true)} disabled={!canConfirm || submitting}>
            {createLocal ? "提交中…" : "同时创建本地规则"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const Field: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="p-2 rounded-lg bg-ink-50 border border-ink-100">
    <p className="text-[10.5px] uppercase tracking-wider text-ink-500 font-semibold">{k}</p>
    <p className="mono text-[12px] text-ink-900 break-all">{v}</p>
  </div>
);
