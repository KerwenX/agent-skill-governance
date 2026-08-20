import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { orchestrator } from "../../app/animations";

export default function UserUpdates() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const changeSets = useGovernance(s => s.changeSets);
  const localContracts = useGovernance(s => s.localContracts);
  const updateLocalContract = useGovernance(s => s.updateLocalContract);
  const [checkingId, setCheckingId] = React.useState<string>();
  const [checkResults, setCheckResults] = React.useState<Record<string, boolean[]>>({});

  const mine = Object.values(localContracts).filter(c => c.ownerId === userId);
  const updates = Object.values(changeSets).sort((a,b) => b.createdAt - a.createdAt);

  const runCheck = async (csId: string, affectedIds: string[]) => {
    setCheckingId(csId);
    setCheckResults({});
    const steps = [true, true, false, true]; // 父版本 / Skill / Relationship / Context
    for (let i = 0; i < 4; i++) {
      await orchestrator.wait(380);
      setCheckResults(prev => ({ ...prev, [csId]: steps.slice(0, i + 1) }));
    }
    await orchestrator.wait(300);
    // Navigate to first affected revalidation
    if (affectedIds.length > 0) {
      navigate(`/user/${userId}/revalidation/${affectedIds[0]}`);
    }
    setCheckingId(undefined);
  };

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">治理更新</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">影响你本地治理的全局变更。</p>
        </div>

        {updates.length === 0 && (
          <Empty icon="Bell" title="暂无更新" body="全局契约发布后，影响分析将出现在这里。" />
        )}

        <div className="space-y-3">
          {updates.map(cs => {
            const affected = cs.affectedContractIds.filter(id => mine.some(m => m.id === id));
            const isChecking = checkingId === cs.id;
            const results = checkResults[cs.id] ?? [];
            return (
              <motion.div key={cs.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <div className="flex items-start gap-4">
                    <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white flex items-center justify-center shadow">
                      <Icon name="Bolt" size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold text-ink-900">
                          全局治理 <span className="mono">{cs.fromVersion}</span> →{" "}
                          <span className="mono text-brand-700">{cs.toVersion}</span>
                        </p>
                        <StateBadge state="PUBLISHED" />
                      </div>
                      <div className="mt-2 space-y-1 text-[12.5px] text-ink-700">
                        {cs.changedRelationships.slice(0, 2).map((r, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="chip chip-emerald">+ {r.type}</span>
                            <span className="mono">{r.sourceSkillId.replace("skill-","")} → {r.targetSkillId?.replace("skill-","")}</span>
                          </div>
                        ))}
                        {cs.changedContextSchemas.filter(Boolean).map(s => (
                          <span key={s} className="chip">{s}</span>
                        ))}
                      </div>

                      <p className="text-[12.5px] text-ink-600 mt-2">
                        Your impact: <b className={affected.length ? "text-amber-700" : "text-emerald-700"}>
                          {affected.length} local contract{affected.length === 1 ? "" : "s"} affected
                        </b>
                      </p>

                      {isChecking && (
                        <div className="mt-3 p-3 rounded-lg bg-brand-50 border border-brand-100 space-y-1.5">
                          {[
                            "Checking 父版本 契约…",
                            "Checking Skill Relationship…",
                            "Checking Skill Version…",
                            "Checking Context Schema…",
                          ].map((label, i) => (
                            <div key={i} className="flex items-center gap-2 text-[12.5px]">
                              {results[i] === undefined ? (
                                <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
                              ) : results[i] ? (
                                <Icon name="Check" size={14} className="text-emerald-600" />
                              ) : (
                                <span className="w-3.5 h-3.5 inline-block rounded-full bg-amber-400" />
                              )}
                              <span className="text-ink-700">{label}</span>
                              {results[i] !== undefined && (
                                <span className={`ml-auto text-[11px] mono ${results[i] ? "text-emerald-700" : "text-amber-700"}`}>
                                  {results[i] ? "MATCH" : "—"}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <Button
                        variant={affected.length ? "primary" : "soft"}
                        size="sm"
                        disabled={isChecking}
                        onClick={() => affected.length ? runCheck(cs.id, affected) : null}
                      >
                        {affected.length ? "审阅 Impact" : "No Impact"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
