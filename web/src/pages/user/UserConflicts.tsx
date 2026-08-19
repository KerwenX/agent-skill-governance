import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { orchestrator } from "../../app/animations";

type Strategy = "RETIRE" | "REFINE" | "REBUILD";

const STRATEGIES: { id: Strategy; title: string; desc: string; icon: "Check" | "Spark" | "Cog" }[] = [
  { id: "RETIRE",  title: "Retire Local 规则",   desc: "Drop the local rule and accept global governance as-is.", icon: "Check" },
  { id: "REFINE",  title: "Refine Context",      desc: "Narrow the local rule so it applies only under a guard condition.", icon: "Spark" },
  { id: "REBUILD", title: "Rebuild Local Governance", desc: "Discard the local rule and construct a new one from scratch.", icon: "Cog" },
];

export default function UserConflicts() {
  const { userId, contractId } = useParams();
  const navigate = useNavigate();
  const contract = useGovernance(s => contractId ? s.localContracts[contractId] : undefined);
  const updateLocalContract = useGovernance(s => s.updateLocalContract);

  const [strategy, setStrategy] = React.useState<Strategy>("REFINE");
  const [merging, setMerging] = React.useState(true);
  const [mergeFailed, setMergeFailed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await orchestrator.wait(900);
      if (cancelled) return;
      setMergeFailed(true); setMerging(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!contract) {
    return <Empty title="冲突 not found" cta={<Button onClick={() => navigate(-1)}>返回</Button>} />;
  }

  const submit = async () => {
    setSubmitting(true);
    await orchestrator.wait(700);
    if (strategy === "RETIRE") {
      updateLocalContract(contract.id, { state: "RETIRED" });
    } else if (strategy === "REFINE") {
      // Narrow: if IRSearch unavailable then WebSearch
      updateLocalContract(contract.id, {
        state: "ACTIVE_REFINEMENT",
        predicate: [
          ...contract.predicate,
          { field: "irSearchUnavailable", operator: "EQUALS" as const, value: true },
        ],
        relations: contract.relations.map(r => ({ ...r, type: "FALLBACK" as never })),
      });
    } else {
      updateLocalContract(contract.id, { state: "ACTIVE" });
    }
    setSubmitting(false);
    navigate(`/user/${userId}/governance`);
  };

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-[1200px] mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900 flex items-center gap-2">
            冲突 Resolver
            <StateBadge state="CONFLICT" />
          </h1>
          <p className="text-[13px] text-ink-500 mt-0.5">{contract.id} · {contract.title}</p>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* GLOBAL */}
          <Card className="col-span-12 md:col-span-5 border-emerald-200">
            <SectionTitle icon="Book" title="Global" subtitle="Newly published global rule" />
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[12.5px] mono text-emerald-800">
                WHEN taskType=official_filing
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[12.5px] mono text-emerald-800">
                THEN IRSearch {">"} WebSearch
              </div>
            </div>
          </Card>

          {/* MERGE */}
          <div className="col-span-12 md:col-span-2 flex flex-col items-center justify-center gap-2 py-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center
              ${mergeFailed ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700"}`}>
              {merging ? <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : mergeFailed ? <Icon name="X" size={22} /> : <Icon name="Check" size={22} />}
            </div>
            <p className="text-[12px] text-ink-700 font-semibold">
              {merging ? "Attempting merge" : mergeFailed ? "INCOMPATIBLE" : "Compatible"}
            </p>
            {mergeFailed && (
              <p className="text-[11px] text-rose-700 text-center max-w-[160px]">
                Local excludes the skill the global rule prioritizes.
              </p>
            )}
          </div>

          {/* LOCAL */}
          <Card className="col-span-12 md:col-span-5 border-rose-200">
            <SectionTitle icon="Shield" title="Local" subtitle="Your existing local rule" />
            <div className="space-y-2">
              {contract.predicate.map((p, i) => (
                <div key={i} className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-[12.5px] mono text-rose-800">
                  {p.field} = {JSON.stringify(p.value)}
                </div>
              ))}
              {contract.relations.map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-[12.5px] mono text-rose-800">
                  {r.type}: {r.sourceSkillId.replace("skill-","")} excludes {r.targetSkillId?.replace("skill-","")}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Strategies */}
        <Card>
          <SectionTitle icon="Cog" title="解决方式 Strategy" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STRATEGIES.map(s => {
              const selected = strategy === s.id;
              return (
                <motion.button
                  key={s.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setStrategy(s.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors
                    ${selected ? "border-brand-400 bg-brand-50/60 shadow-ring" : "border-ink-200 bg-white hover:border-brand-300"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center
                      ${selected ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}>
                      <Icon name={s.icon} size={14} />
                    </span>
                    <p className="text-[13px] font-bold text-ink-900">{s.title}</p>
                  </div>
                  <p className="text-[12px] text-ink-600">{s.desc}</p>
                </motion.button>
              );
            })}
          </div>

          {strategy === "REFINE" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-3 rounded-xl bg-brand-50 border border-brand-200">
              <p className="text-[12.5px] text-brand-900 font-medium mb-2">
                Refined rule preview:
              </p>
              <div className="space-y-1.5 font-mono text-[12px] text-brand-900">
                <div>WHEN taskType=official_filing</div>
                <div className="pl-4">AND irSearchUnavailable=true</div>
                <div>THEN WebSearch (fallback)</div>
              </div>
            </motion.div>
          )}
        </Card>

        <div className="sticky bottom-4 card p-3 flex items-center gap-2 shadow-pop">
          <Button variant="ghost" onClick={() => navigate(-1)}>取消</Button>
          <div className="ml-auto" />
          <StateBadge state={submitting ? "REVALIDATING" : "CONFLICT"} />
          <Button variant="primary" icon="Check" onClick={submit} disabled={submitting || merging}>
            {submitting ? "Applying…" : "Apply 解决方式"}
          </Button>
        </div>
      </div>
    </div>
  );
}
