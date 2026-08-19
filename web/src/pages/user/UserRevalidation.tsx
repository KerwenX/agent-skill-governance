import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { orchestrator } from "../../app/animations";

const STEPS = [
  "Load New Global 状态",
  "Compare Governance",
  "Evaluate Local Context",
  "Resolve 状态",
];

export default function UserRevalidation() {
  const { userId, contractId } = useParams();
  const navigate = useNavigate();
  const contract = useGovernance(s => contractId ? s.localContracts[contractId] : undefined);
  const globalContracts = useGovernance(s => s.globalContracts);
  const updateLocalContract = useGovernance(s => s.updateLocalContract);
  const 条事件 = useGovernance(s => s.events);
  const changeSets = useGovernance(s => s.changeSets);

  const [step, setStep] = React.useState(0);
  const [outcome, setOutcome] = React.useState<"RETIRED" | "ACTIVE_REFINEMENT" | "CONFLICT">();
  const [eliminating, setEliminating] = React.useState<string[]>([]);

  const lastCs = Object.values(changeSets).sort((a,b) => b.createdAt - a.createdAt)[0];
  const newGlobal = lastCs ? globalContracts[lastCs.changedContracts[lastCs.changedContracts.length - 1]] : undefined;

  React.useEffect(() => {
    if (!contract) return;
    let cancelled = false;
    (async () => {
      // Step 1
      await orchestrator.wait(400);
      if (cancelled) return; setStep(1);
      await orchestrator.wait(700);
      if (cancelled) return; setStep(2);
      await orchestrator.wait(700);
      if (cancelled) return; setStep(3);
      // decide outcome
      const result = contract.revalidation?.result
        ?? (contract.id.includes("C") ? "CONFLICT"
            : contract.id.includes("B") ? "ACTIVE_REFINEMENT"
            : "RETIRED");
      // eliminate options one by one
      const order = result === "RETIRED" ? ["CONFLICT", "ACTIVE_REFINEMENT"]
                  : result === "ACTIVE_REFINEMENT" ? ["CONFLICT", "RETIRED"]
                  : ["ACTIVE_REFINEMENT", "RETIRED"];
      for (const opt of order) {
        await orchestrator.wait(500);
        if (cancelled) return;
        setEliminating(prev => [...prev, opt]);
      }
      await orchestrator.wait(400);
      if (cancelled) return;
      setOutcome(result);
      updateLocalContract(contract.id, { state: result as never });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  if (!contract) {
    return <Empty title="契约 not found" cta={<Button onClick={() => navigate(-1)}>返回</Button>} />;
  }

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-[1100px] mx-auto p-6 space-y-5">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
          <button className="link-quiet" onClick={() => navigate(-1)}>返回</button>
          <Icon name="ChevronR" size={12} /><span>Revalidation</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-ink-900">Revalidation · {contract.id}</h1>
            <p className="text-[13px] text-ink-500 mt-0.5">{contract.title}</p>
          </div>
          <StateBadge state={outcome ?? "REVALIDATING"} />
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-2 ${i <= step ? "" : "opacity-50"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2
                  ${i < step ? "bg-emerald-500 border-emerald-500 text-white"
                    : i === step ? "bg-brand-600 border-brand-600 text-white animate-pulse"
                    : "border-ink-200 text-ink-500"}`}>
                  {i < step ? <Icon name="Check" size={13} /> : i+1}
                </span>
                <span className={`text-[12.5px] font-medium hidden md:inline ${i <= step ? "text-ink-900" : "text-ink-500"}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-ink-200" />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Global diff */}
          <Card className="col-span-12 lg:col-span-6">
            <SectionTitle icon="FileCode" title="New Global 状态" subtitle={lastCs ? `${lastCs.fromVersion} → ${lastCs.toVersion}` : ""} />
            {newGlobal ? (
              <div className="space-y-2">
                {newGlobal.predicate.map((p, i) => (
                  <div key={i} className="text-[12.5px] mono bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-1.5">
                    + {p.field} = {JSON.stringify(p.value)}
                  </div>
                ))}
                {newGlobal.relations.map((r, i) => (
                  <div key={i} className="text-[12.5px] mono bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-1.5">
                    + {r.type}: {r.sourceSkillId.replace("skill-","")} → {r.targetSkillId?.replace("skill-","")}
                  </div>
                ))}
              </div>
            ) : <p className="text-[12.5px] text-ink-500 italic">No global change data.</p>}
          </Card>

          {/* Local contract */}
          <Card className="col-span-12 lg:col-span-6">
            <SectionTitle icon="Shield" title="Local 契约" />
            <div className="space-y-2">
              {contract.predicate.map((p, i) => (
                <div key={i} className="text-[12.5px] mono bg-ink-50 border border-ink-200 rounded-lg px-3 py-1.5">
                  {p.field} = {JSON.stringify(p.value)}
                </div>
              ))}
              {contract.relations.map((r, i) => (
                <div key={i} className="text-[12.5px] mono bg-violet-50 border border-violet-200 text-violet-800 rounded-lg px-3 py-1.5">
                  {r.type}: {r.sourceSkillId.replace("skill-","")} → {r.targetSkillId?.replace("skill-","")}
                </div>
              ))}
            </div>
          </Card>

          {/* Context evaluation */}
          <Card className="col-span-12">
            <SectionTitle icon="Pulse" title="Context Evaluation" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CtxBox label="Global coverage" value={
                outcome === "RETIRED" ? "100%"
                : outcome === "ACTIVE_REFINEMENT" ? "Partial"
                : outcome === "CONFLICT" ? "Partial"
                : "…"} />
              <CtxBox label="Local-specific" value={
                outcome === "ACTIVE_REFINEMENT" ? "Yes"
                : outcome === "RETIRED" ? "None"
                : outcome === "CONFLICT" ? "冲突"
                : "…"} />
              <CtxBox label="Compatible" value={
                outcome === "CONFLICT" ? "No" : outcome ? "Yes" : "…"} />
              <CtxBox label="Outcome" value={outcome ? outcome.replace("_"," ") : "…"} highlight={!!outcome} />
            </div>
          </Card>

          {/* 解决方式 candidates */}
          <Card className="col-span-12">
            <SectionTitle icon="Check" title="解决方式" subtitle="Three candidates evaluated" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["RETIRED","ACTIVE_REFINEMENT","CONFLICT"] as const).map(opt => {
                const eliminated = eliminating.includes(opt);
                const isOutcome = outcome === opt;
                const meta = {
                  RETIRED: { color: "slate", icon: "Check" as const,
                    text: "Global fully covers local rule; safe to retire." },
                  ACTIVE_REFINEMENT: { color: "violet", icon: "Spark" as const,
                    text: "Local retains user-specific conditions; refined rule continues." },
                  CONFLICT: { color: "rose", icon: "Warn" as const,
                    text: "Global and local are incompatible; needs explicit resolution." },
                }[opt];
                return (
                  <motion.div
                    key={opt}
                    animate={eliminated && !isOutcome ? { opacity: 0.35, scale: 0.97 } : { opacity: 1, scale: 1 }}
                    className={`p-4 rounded-xl border-2 relative
                      ${isOutcome ? "border-emerald-400 bg-emerald-50/60 shadow-ring"
                        : eliminated ? "border-ink-200 bg-ink-50"
                        : "border-ink-200 bg-white"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center
                        ${isOutcome ? "bg-emerald-500 text-white" : "bg-ink-100 text-ink-500"}`}>
                        <Icon name={isOutcome ? "Check" : meta.icon} size={14} />
                      </span>
                      <p className="text-[13px] font-bold text-ink-900">{opt.replace("_"," ")}</p>
                      {eliminated && !isOutcome && (
                        <span className="ml-auto chip chip-slate">× {opt === "CONFLICT" ? "compatible" : "no local-specific"}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-ink-600">{meta.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>

        {outcome && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="card p-4 flex items-center gap-3 shadow-pop">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Icon name="Check" size={20} />
            </span>
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold text-ink-900">
                {outcome === "RETIRED" && "Local contract retired — global rule now covers it fully."}
                {outcome === "ACTIVE_REFINEMENT" && "Local contract retained as active refinement — local-specific conditions preserved."}
                {outcome === "CONFLICT" && "冲突 detected — open the resolver to choose a strategy."}
              </p>
            </div>
            {outcome === "CONFLICT"
              ? <Button variant="primary" icon="ArrowR"
                  onClick={() => navigate(`/user/${userId}/conflicts/${contract.id}`)}>
                  Resolve 冲突
                </Button>
              : <Button variant="soft" onClick={() => navigate(`/user/${userId}/governance`)}>
                  返回 to 我的治理
                </Button>}
          </motion.div>
        )}
      </div>
    </div>
  );
}

const CtxBox: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`p-3 rounded-xl border ${highlight ? "border-emerald-300 bg-emerald-50" : "border-ink-200 bg-white"}`}>
    <p className="text-[10.5px] uppercase tracking-wider text-ink-500 font-semibold">{label}</p>
    <p className={`text-[16px] font-bold mono leading-none mt-1 ${highlight ? "text-emerald-700" : "text-ink-800"}`}>{value}</p>
  </div>
);
