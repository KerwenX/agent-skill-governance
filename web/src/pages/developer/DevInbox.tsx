import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { humanRelation } from "../../engines/governance";

const TABS = ["全部", "证据", "聚类", "候选", "冲突s"] as const;

export default function DevInbox() {
  const navigate = useNavigate();
  const s = useGovernance();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("全部");

  const 证据  = Object.values(s.evidence).sort((a,b) => b.createdAt - a.createdAt);
  const clusters  = Object.values(s.clusters).sort((a,b) => b.createdAt - a.createdAt);
  const candidates= Object.values(s.candidates).sort((a,b) => b.createdAt - a.createdAt);
  const conflicts = Object.values(s.localContracts).filter(c => c.state === "CONFLICT");

  const counts = {
    全部: 证据.length + clusters.length + candidates.length + conflicts.length,
    证据: 证据.length,
    聚类: clusters.length,
    候选: candidates.length,
    冲突s: conflicts.length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">治理收件箱</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">本地信号、证据聚类、候选规则与冲突。</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-ink-200">
        {TABS.map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 h-10 text-[13px] font-medium transition-colors
              ${tab === t ? "text-brand-700" : "text-ink-500 hover:text-ink-800"}`}>
            {t}
            <span className="ml-2 text-[11px] mono text-ink-400">{counts[t]}</span>
            {tab === t && (
              <motion.span layoutId="inbox-underline"
                className="absolute bottom-0 left-2 right-2 h-[2px] bg-brand-600 rounded-t-sm" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(tab === "全部" || tab === "证据") && 证据.map(e => (
          <Card key={e.id} className="hover:border-brand-300 transition-colors">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center shrink-0">
                <Icon name="Inbox" size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip chip-brand">本地信号</span>
                  <span className="mono text-[12px] font-semibold text-ink-800">{e.id}</span>
                  <StateBadge state={e.state} className="ml-auto" />
                </div>
                <p className="text-[13px] font-semibold text-ink-900">{e.violationType}</p>
                <p className="text-[11.5px] text-ink-500 mt-0.5">
                  {e.userId} · {e.context.taskType} ·{" "}
                  <span className="mono">{humanRelation(e.skillRelation)}</span>
                </p>
                <p className="text-[11.5px] text-ink-500 mt-1">
                  quality {e.qualityScore.toFixed(2)} · parent {e.parentGlobalVersion}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {(tab === "全部" || tab === "聚类") && clusters.map(c => {
          const cand = candidates.find(x => x.clusterId === c.id);
          return (
            <Card key={c.id} className="hover:border-brand-300 transition-colors cursor-pointer"
                  onClick={() => cand && navigate(`/developer/candidates/${cand.id}`)}>
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 border border-violet-100 flex items-center justify-center shrink-0">
                  <Icon name="Git" size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="chip chip-violet">聚类</span>
                    <span className="mono text-[12px] font-semibold text-ink-800">{c.id}</span>
                    <StateBadge state={c.state} className="ml-auto" />
                  </div>
                  <p className="text-[13px] font-semibold text-ink-900">
                    {c.independentUserCount} independent 用户 · {c.totalEvidenceCount} 证据
                  </p>
                  <p className="text-[11.5px] text-ink-500 mt-0.5 mono">{humanRelation(c.skillRelation)}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-500">
                    <span>覆盖率 <b className="text-ink-700">{(c.coverageScore*100).toFixed(0)}%</b></span>
                    <span>一致性 <b className="text-ink-700">{(c.resolutionAgreement*100).toFixed(0)}%</b></span>
                    <span>评分 <b className={c.promotionScore >= 0.75 ? "text-emerald-600" : "text-ink-700"}>{c.promotionScore.toFixed(2)}</b></span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {(tab === "全部" || tab === "候选") && candidates.map(c => (
          <Card key={c.id} className="hover:border-brand-300 cursor-pointer"
                onClick={() => navigate(`/developer/candidates/${c.id}`)}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
                <Icon name="FileCode" size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip chip-emerald">候选</span>
                  <span className="mono text-[12px] font-semibold">{c.id}</span>
                  <StateBadge state={c.state} className="ml-auto" />
                </div>
                <p className="text-[13px] font-semibold text-ink-900">{c.proposedType} · {humanRelation(c.proposedRelation)}</p>
                <ul className="text-[11.5px] text-ink-500 mt-1 list-disc pl-4 space-y-0.5">
                  {c.rationale.slice(0, 2).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>
          </Card>
        ))}

        {(tab === "全部" || tab === "冲突s") && conflicts.map(c => (
          <Card key={c.id} className="border-rose-200 bg-rose-50/30">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Icon name="Warn" size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip chip-rose">冲突</span>
                  <span className="mono text-[12px] font-semibold">{c.id}</span>
                  <StateBadge state={c.state} className="ml-auto" />
                </div>
                <p className="text-[13px] font-semibold text-ink-900">{c.title}</p>
                <p className="text-[11.5px] text-ink-600 mt-0.5">{c.summary}</p>
                <Button size="sm" variant="soft" className="mt-2" onClick={() => navigate(`/user/${c.ownerId}/conflicts/${c.id}`)}>
                  Open resolver <Icon name="External" size={12} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {counts[tab] === 0 && (
        <Empty
          title={`No ${tab === "全部" ? "signals" : tab.toLowerCase()} yet`}
          body="Run a user task and submit a correction — 证据 will stream in here in real time."
        />
      )}
    </div>
  );
}
