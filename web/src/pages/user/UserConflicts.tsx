import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { humanRelation } from "../../engines/governance";
import { orchestrator } from "../../app/animations";

type Strategy = "RETIRE" | "REFINE" | "REBUILD";

export default function UserConflicts() {
  const { userId, contractId } = useParams();
  const navigate = useNavigate();
  const contract = useGovernance(s => contractId ? s.localContracts[contractId] : undefined);
  const globalContracts = useGovernance(s => s.globalContracts);
  const skills = useGovernance(s => s.skills);
  const updateLocalContract = useGovernance(s => s.updateLocalContract);

  const [strategy, setStrategy] = React.useState<Strategy>("REFINE");
  const [merging, setMerging] = React.useState(true);
  const [mergeFailed, setMergeFailed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // The conflicting global is the active GLOBAL contract whose relation opposes the local one.
  const conflictingGlobal = React.useMemo(() => {
    if (!contract) return undefined;
    return Object.values(globalContracts).find(g =>
      g.state === "ACTIVE" && g.relations.some(gr =>
        contract.relations.some(lr =>
          (gr.type === "PRIORITY" && lr.type === "EXCLUSION"
            && gr.sourceSkillId === lr.targetSkillId
            && (gr.targetSkillId ?? "") === (lr.sourceSkillId ?? ""))
          || (gr.type === "PRIORITY" && lr.type === "PRIORITY"
            && gr.sourceSkillId === lr.targetSkillId
            && (gr.targetSkillId ?? "") === (lr.sourceSkillId ?? ""))
        )
      )
    );
  }, [contract, globalContracts]);

  // A scenario-appropriate refinement guard predicate:
  //  - filing conflict (C): irSearchUnavailable=true fallback
  //  - legacy OCR plugin: force retire (no safe local refine) — surface as rebuild/manual
  const isFilingConflict = contract?.relations.some(r => r.targetSkillId === "skill-ir-search" || r.sourceSkillId === "skill-ir-search");
  const refineGuard = isFilingConflict
    ? { field: "irSearchUnavailable", operator: "EQUALS" as const, value: true }
    : undefined;

  const STRATEGIES: { id: Strategy; title: string; desc: string; icon: "Check" | "Spark" | "Cog"; disabled?: boolean }[] = [
    { id: "RETIRE", title: "退役本地规则", desc: "放弃本地规则，直接采用新的全局治理。", icon: "Check" },
    { id: "REFINE",  title: "细化上下文", desc: "收窄本地规则，仅在特定守卫条件下生效。", icon: "Spark", disabled: !refineGuard },
    { id: "REBUILD", title: "安全回退/重建", desc: "不放宽不变量；改为人工审批或受控备用路径。", icon: "Cog" },
  ];

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await orchestrator.wait(800);
      if (cancelled) return;
      setMergeFailed(true); setMerging(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!contract) {
    return <Empty title="未找到冲突" cta={<Button onClick={() => navigate(-1)}>返回</Button>} />;
  }

  const submit = async () => {
    setSubmitting(true);
    await orchestrator.wait(600);
    if (strategy === "RETIRE") {
      updateLocalContract(contract.id, { state: "RETIRED" });
    } else if (strategy === "REFINE" && refineGuard) {
      updateLocalContract(contract.id, {
        state: "ACTIVE_REFINEMENT",
        predicate: [...contract.predicate, refineGuard],
        relations: contract.relations.map(r => ({ ...r, type: "FALLBACK" as never })),
      });
    } else {
      // REBUILD: keep conflicted but mark as retired (safe manual fallback), user rebuilds separately
      updateLocalContract(contract.id, { state: "RETIRED" });
    }
    setSubmitting(false);
    navigate(`/user/${userId}/governance`);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 min-h-0">
      <div className="shrink-0">
        <h1 className="text-[20px] font-bold text-ink-900 flex items-center gap-2">
          冲突解决器
          <StateBadge state="CONFLICT" />
        </h1>
        <p className="text-[12.5px] text-ink-500 mt-0.5 mono">{contract.id} · {contract.title}</p>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        <Card className="col-span-12 md:col-span-5 border-emerald-200 flex flex-col gap-2 min-h-0 overflow-y-auto scroll-thin">
          <SectionTitle icon="Book" title="新全局规则" subtitle="刚发布的全局契约" />
          {conflictingGlobal ? (
            <>
              {conflictingGlobal.predicate.map((p, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] mono text-emerald-800">
                  WHEN {p.field} {p.operator.toLowerCase().replace("_"," ")} {JSON.stringify(p.value)}
                </div>
              ))}
              {conflictingGlobal.relations.map((r, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] mono text-emerald-800">
                  THEN {humanRelation(r, skills)}
                </div>
              ))}
            </>
          ) : <p className="text-[12px] text-ink-500 italic">未找到直接对立的全局关系（版本/上下文不兼容）。</p>}
        </Card>

        <div className="col-span-12 md:col-span-2 flex flex-col items-center justify-center gap-2 py-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            ${mergeFailed ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700"}`}>
            {merging ? <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              : mergeFailed ? <Icon name="X" size={22} /> : <Icon name="Check" size={22} />}
          </div>
          <p className="text-[12px] text-ink-700 font-semibold">
            {merging ? "尝试合并" : mergeFailed ? "无法合并" : "兼容"}
          </p>
          {mergeFailed && <p className="text-[11px] text-rose-700 text-center max-w-[160px]">本地规则与全局规则方向相反或版本不兼容。</p>}
        </div>

        <Card className="col-span-12 md:col-span-5 border-rose-200 flex flex-col gap-2 min-h-0 overflow-y-auto scroll-thin">
          <SectionTitle icon="Shield" title="本地规则" subtitle="你现有的本地契约" />
          {contract.predicate.map((p, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[12px] mono text-rose-800">
              {p.field} = {JSON.stringify(p.value)}
            </div>
          ))}
          {contract.relations.map((r, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[12px] mono text-rose-800">
              {humanRelation(r, skills)}
            </div>
          ))}
        </Card>
      </div>

      <Card className="shrink-0">
        <SectionTitle icon="Cog" title="解决方式" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STRATEGIES.map(s => {
            const selected = strategy === s.id;
            return (
              <motion.button key={s.id} whileHover={{ y: -2 }} disabled={s.disabled}
                onClick={() => !s.disabled && setStrategy(s.id)}
                className={`text-left p-3 rounded-xl border-2 transition-colors
                  ${s.disabled ? "opacity-40 cursor-not-allowed border-ink-200 bg-white"
                    : selected ? "border-brand-400 bg-brand-50/60 shadow-ring" : "border-ink-200 bg-white hover:border-brand-300"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${selected ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}>
                    <Icon name={s.icon} size={14} />
                  </span>
                  <p className="text-[13px] font-bold text-ink-900">{s.title}</p>
                </div>
                <p className="text-[12px] text-ink-600">{s.desc}</p>
              </motion.button>
            );
          })}
        </div>

        {strategy === "REFINE" && refineGuard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 p-3 rounded-xl bg-brand-50 border border-brand-200">
            <p className="text-[12px] text-brand-900 mono space-y-0.5">
              <span className="block">当 {contract.predicate.map(p => `${p.field}=${JSON.stringify(p.value)}`).join(" AND ")}</span>
              <span className="block pl-4">且 {refineGuard.field}={JSON.stringify(refineGuard.value)}</span>
              <span className="block">则 {humanRelation({ ...contract.relations[0], type: "FALLBACK" }, skills)}</span>
            </p>
          </motion.div>
        )}
      </Card>

      <div className="shrink-0 card p-3 flex items-center gap-2 shadow-pop">
        <Button variant="ghost" onClick={() => navigate(-1)}>取消</Button>
        <div className="ml-auto" />
        <StateBadge state={submitting ? "REVALIDATING" : "CONFLICT"} />
        <Button variant="primary" icon="Check" onClick={submit} disabled={submitting || merging}>
          {submitting ? "应用中…" : "应用解决方式"}
        </Button>
      </div>
    </div>
  );
}
