import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { GovernanceDiff, LineageTrail, ScoreTransition } from "../../components/animations/Animations";
import { humanRelation, contractFromCandidate } from "../../engines/governance";
import { PROMOTION_THRESHOLD } from "../../engines/aggregation";
import { eventBus, nextId } from "../../app/eventBus";
import type { GovernanceEvent } from "../../domain/types";

export default function DevCandidateReview() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const s = useGovernance();
  const candidate = candidateId ? s.candidates[candidateId] : undefined;
  const [keptLocalReason, setKeptLocalReason] = React.useState("");
  const [showKeepLocal, setShowKeepLocal] = React.useState(false);

  if (!candidate) {
    return <Empty title="未找到候选规则" body="可能已被重置。" cta={<Button onClick={() => navigate("/developer/inbox")}>返回收件箱</Button>} />;
  }

  const cluster = s.clusters[candidate.clusterId];
  const 证据 = cluster ? cluster.evidenceIds.map(id => s.evidence[id]).filter(Boolean) : [];

  const updateCandidate = (patch: Partial<typeof candidate>) => {
    const updated = { ...candidate, ...patch };
    s.upsertCandidate(updated);
    s.emit({
      eventId: nextId("evt"), eventType:
        patch.state === "APPROVED" ? "GLOBAL_CANDIDATE_APPROVED"
        : patch.state === "REJECTED" ? "GLOBAL_CANDIDATE_REJECTED"
        : "GLOBAL_CANDIDATE_CREATED",
      timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: s.globalVersion, payload: { candidate: updated },
    } as GovernanceEvent);
  };

  const goEditor = () => {
    updateCandidate({ state: "APPROVED" });
    navigate(`/developer/contracts/new?candidate=${candidate.id}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
        <button className="link-quiet" onClick={() => navigate("/developer/inbox")}>收件箱</button>
        <Icon name="ChevronR" size={12} />
        <span>Candidate {candidate.id}</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900 flex items-center gap-2">
            候选规则审阅
            <StateBadge state={candidate.state} />
          </h1>
          <p className="text-[13px] text-ink-500 mt-0.5">{candidate.proposedType} · {humanRelation(candidate.proposedRelation)}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* 证据 side */}
        <Card className="col-span-12 lg:col-span-5">
          <SectionTitle icon="Inbox" title="来源 证据" subtitle={`${证据.length} 条 · 来自 ${cluster?.independentUserCount ?? 0} 个用户`} />
          <div className="space-y-2">
            {证据.map(ev => ev && (
              <div key={ev.id} className="p-2.5 rounded-lg border border-ink-200 bg-ink-50/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-[12px] font-semibold text-ink-800">{ev.id}</span>
                  <span className="chip chip-slate">{ev.userId}</span>
                </div>
                <p className="text-[12px] text-ink-700">{ev.violationType}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">质量 {ev.qualityScore.toFixed(2)} · {ev.parentGlobalVersion}</p>
              </div>
            ))}
          </div>

          {cluster && (
            <div className="mt-4 card !shadow-none p-3">
              <ScoreTransition value={cluster.promotionScore} threshold={PROMOTION_THRESHOLD} label="Promotion" />
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px] text-ink-600">
                <span>频次 <b className="text-ink-800">{(cluster.frequencyScore*100).toFixed(0)}%</b></span>
                <span>覆盖率 <b className="text-ink-800">{(cluster.coverageScore*100).toFixed(0)}%</b></span>
                <span>一致性 <b className="text-ink-800">{(cluster.resolutionAgreement*100).toFixed(0)}%</b></span>
                <span>质量 <b className="text-ink-800">{(cluster.evidenceQuality*100).toFixed(0)}%</b></span>
              </div>
            </div>
          )}
        </Card>

        {/* Governance proposal side */}
        <Card className="col-span-12 lg:col-span-7">
          <SectionTitle icon="FileCode" title="Governance Proposal" />
          <div className="space-y-4">
            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">类型</p>
              <div className="flex items-center gap-2">
                <TypeChip active={candidate.proposedType === "DEFAULT"}  label="Global Default"
                         onClick={() => s.upsertCandidate({ ...candidate, proposedType: "DEFAULT" })} />
                <TypeChip active={candidate.proposedType === "INVARIANT"} label="Global Invariant"
                         onClick={() => s.upsertCandidate({ ...candidate, proposedType: "INVARIANT" })} />
              </div>
            </div>

            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">建议规则</p>
              <GovernanceDiff
                lines={[
                  { sign: "+", text: `WHEN taskType = ${candidate.proposedPredicate.find(p => p.field === "taskType")?.value ?? "*"}` },
                  ...(candidate.proposedPredicate.find(p => p.field === "sourceRequirement")
                      ? [{ sign: "+" as const, text: `AND sourceRequirement = official` }] : []),
                  { sign: "+", text: `THEN ${humanRelation(candidate.proposedRelation)}` },
                ]}
              />
            </div>

            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">来源链路</p>
              <LineageTrail
                nodes={[
                  { id: "1", label: "Runtime 证据", sub: `${证据.length} items`, tone: "slate" },
                  { id: "2", label: "Cluster", sub: cluster?.id, tone: "violet" },
                  { id: "3", label: "Candidate", sub: candidate.id, tone: "brand", active: true },
                  { id: "4", label: "Global 契约", sub: "pending publish", tone: "slate" },
                ]}
              />
            </div>

            <ul className="text-[12px] text-ink-600 list-disc pl-4 space-y-0.5">
              {candidate.rationale.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </Card>
      </div>

      {/* Decision bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="sticky bottom-4 z-30 card p-3 flex items-center gap-2 flex-wrap shadow-pop"
      >
        <Button variant="ghost" onClick={() => { updateCandidate({ state: "NEEDS_MORE_EVIDENCE" }); navigate("/developer/证据"); }}>
          Need More 证据
        </Button>
        <Button variant="ghost" onClick={() => setShowKeepLocal(true)}>保留为本地规则</Button>
        <Button variant="ghost" onClick={() => updateCandidate({ state: "REJECTED" })}>驳回</Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" icon="Cog">修改</Button>
          <Button variant="primary" icon="Check" onClick={goEditor}>
            批准并创建全局契约
          </Button>
        </div>
      </motion.div>

      {showKeepLocal && (
        <div className="fixed inset-0 bg-ink-900/50 z-50 flex items-center justify-center p-4" onClick={() => setShowKeepLocal(false)}>
          <Card className="w-[420px]" >
            <div onClick={e => e.stopPropagation()}>
              <SectionTitle title="Keep this local?" subtitle="Prevent this issue from being promoted to global governance." />
              <div className="space-y-2">
                {["Private Resource", "User-specific Permission", "Organization-specific Context", "Insufficient Coverage", "Other"].map(r => (
                  <label key={r} className="flex items-center gap-2 p-2 rounded-lg border border-ink-200 cursor-pointer hover:border-brand-300">
                    <input type="radio" name="reason" value={r} checked={keptLocalReason === r}
                      onChange={() => setKeptLocalReason(r)} className="accent-brand-600" />
                    <span className="text-[12.5px] text-ink-800">{r}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowKeepLocal(false)}>取消</Button>
                <Button variant="primary" disabled={!keptLocalReason} onClick={() => {
                  updateCandidate({ state: "KEPT_LOCAL", keepLocalReason: keptLocalReason });
                  setShowKeepLocal(false);
                  navigate("/developer/inbox");
                }}>确认保留为本地规则</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const TypeChip: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button onClick={onClick}
    className={`px-3 h-8 rounded-lg text-[12.5px] font-medium border transition-colors
      ${active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-700 border-ink-200 hover:border-brand-300"}`}>
    {label}
  </button>
);
