import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { Funnel } from "../../components/animations/Animations";
import { orchestrator } from "../../app/animations";

const PHASES = [
  { id: 1, key: "COMMIT",       label: "Commit",       desc: "Global version bumped" },
  { id: 2, key: "DEPENDENCY",   label: "依赖",   desc: "ΔG scanned against local contracts" },
  { id: 3, key: "INVALIDATION", label: "Invalidation", desc: "Affected locals marked STALE" },
  { id: 4, key: "REVALIDATION", label: "Revalidation", desc: "已退役 · Refinement · 冲突" },
];

export default function DevPropagation() {
  const { changeSetId } = useParams();
  const navigate = useNavigate();
  const s = useGovernance();
  const cs = changeSetId ? s.changeSets[changeSetId] : undefined;

  const [phase, setPhase] = React.useState(1);
  const [staleCount, set待重验证Count] = React.useState(0);
  const [revalDone, setRevalDone] = React.useState(false);

  React.useEffect(() => {
    if (!cs) return;
    let cancelled = false;
    (async () => {
      await orchestrator.wait(700);
      if (cancelled) return; setPhase(2);
      await orchestrator.wait(900);
      if (cancelled) return; setPhase(3);
      // animate stale count
      const target = cs.affectedContractIds.length;
      const steps = 14;
      for (let i = 1; i <= steps; i++) {
        await orchestrator.wait(70);
        if (cancelled) return;
        set待重验证Count(Math.round((target * i) / steps));
      }
      set待重验证Count(target);
      await orchestrator.wait(400);
      if (cancelled) return; setPhase(4);
      await orchestrator.wait(700);
      if (cancelled) return; setRevalDone(true);
    })();
    return () => { cancelled = true; };
  }, [cs]);

  if (!cs) {
    return <Empty title="Change set not found" body="可能已被重置。"
      cta={<Button onClick={() => navigate("/developer")}>总览</Button>} />;
  }

  const retired = cs.revalidation?.retired.length ?? 0;
  const refined = cs.revalidation?.refined.length ?? 0;
  const conflicted = cs.revalidation?.conflicted.length ?? 0;
  const total = retired + refined + conflicted;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900 flex items-center gap-2">
            Global Propagation
            <span className="chip chip-brand mono">{cs.id}</span>
          </h1>
          <p className="text-[13px] text-ink-500 mt-0.5">
            <span className="mono">{cs.fromVersion}</span> →{" "}
            <span className="mono text-brand-700 font-semibold">{cs.toVersion}</span>
          </p>
        </div>
        <Button variant="soft" icon="History" onClick={() => navigate(`/developer/contracts/${cs.changedContracts[0]}`)}>
          View 契约
        </Button>
      </div>

      {/* Phase header */}
      <Card>
        <div className="grid grid-cols-4 gap-3">
          {PHASES.map(p => {
            const active = phase === p.id;
            const complete = phase > p.id;
            return (
              <div key={p.id} className={`relative p-4 rounded-xl border-2 transition-colors
                ${active ? "border-brand-400 bg-brand-50/60" : complete ? "border-emerald-200 bg-emerald-50/40" : "border-ink-200 bg-white"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold
                    ${complete ? "bg-emerald-500 text-white"
                      : active ? "bg-brand-600 text-white"
                      : "bg-ink-200 text-ink-600"}`}>
                    {complete ? <Icon name="Check" size={14} /> : p.id}
                  </span>
                  <p className={`text-[13px] font-semibold ${active ? "text-brand-800" : complete ? "text-emerald-800" : "text-ink-700"}`}>
                    Phase {p.id}
                  </p>
                </div>
                <p className={`text-[13px] font-semibold ${active ? "text-brand-900" : "text-ink-800"}`}>{p.label}</p>
                <p className="text-[11.5px] text-ink-500 mt-0.5">{p.desc}</p>
                {active && (
                  <motion.span layoutId="phase-underline"
                    className="absolute bottom-0 left-3 right-3 h-[2px] bg-brand-600 rounded-t-sm" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-5">
        {/* Phase 1: commit */}
        <Card className={`col-span-12 lg:col-span-6 transition-opacity ${phase >= 1 ? "opacity-100" : "opacity-50"}`}>
          <SectionTitle icon="Git" title="Commit" subtitle="Atomic global state update" />
          <div className="flex items-center justify-center gap-4 py-4">
            <VersionPill version={cs.fromVersion} dim />
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.2, repeat: phase === 1 ? Infinity : 0 }}
            >
              <Icon name="ArrowR" size={22} className="text-brand-600" />
            </motion.div>
            <VersionPill version={cs.toVersion} highlight />
          </div>
          <p className="text-center text-[12.5px] text-emerald-700 font-medium">
            {phase >= 1 ? "✓ COMMITTED" : "Pending…"}
          </p>
        </Card>

        {/* Phase 2: propagation */}
        <Card className={`col-span-12 lg:col-span-6 transition-opacity ${phase >= 2 ? "opacity-100" : "opacity-50"}`}>
          <SectionTitle icon="Pulse" title="ΔG Propagation" subtitle="Event pulse to user domains" />
          <div className="relative h-[160px]">
            <svg viewBox="0 0 400 160" className="w-full h-full">
              <g>
                <rect x={170} y={60} width={60} height={36} rx={8} fill="#1E3A8A" />
                <text x={200} y={82} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Fira Code">
                  {cs.id}
                </text>
              </g>
              {[0,1,2].map(i => (
                <g key={i}>
                  <circle cx={60 + i*140} cy={130} r={16} fill="#8B5CF6" stroke="white" strokeWidth={2} />
                  <text x={60 + i*140} y={134} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">U{i+1}</text>
                  {phase >= 2 && (
                    <line x1={200} y1={96} x2={60 + i*140} y2={116}
                      stroke="#3B62E0" strokeWidth={1.6} strokeDasharray="6 6" className="edge-flow"
                      style={{ animationDelay: `${i*200}ms` }} />
                  )}
                </g>
              ))}
            </svg>
          </div>
        </Card>

        {/* Phase 3: invalidation */}
        <Card className={`col-span-12 lg:col-span-6 transition-opacity ${phase >= 3 ? "opacity-100" : "opacity-50"}`}>
          <SectionTitle icon="Bolt" title="Invalidation" subtitle={`${cs.affectedContractIds.length} affected contracts`} />
          <div className="text-center py-3">
            <p className="text-[12px] uppercase tracking-wider text-ink-500">ACTIVE → STALE</p>
            <p className="text-[44px] font-bold mono text-amber-600 leading-none mt-2">
              {staleCount}
            </p>
            <p className="text-[12px] text-ink-500 mt-1">of {cs.affectedContractIds.length} affected</p>
          </div>
          <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
              animate={{ width: `${(staleCount / Math.max(1, cs.affectedContractIds.length)) * 100}%` }} />
          </div>
        </Card>

        {/* Phase 4: revalidation */}
        <Card className={`col-span-12 lg:col-span-6 transition-opacity ${phase >= 4 ? "opacity-100" : "opacity-50"}`}>
          <SectionTitle icon="Check" title="Revalidation" subtitle="Three possible outcomes" />
          {phase >= 4 && (
            <Funnel
              total={Math.max(1, total)}
              stages={[
                { label: "已退役",    value: retired, color: "bg-ink-500" },
                { label: "Refinement", value: refined, color: "bg-violet-500" },
                { label: "冲突",   value: conflicted, color: "bg-rose-500" },
              ]}
            />
          )}
          {phase < 4 && (
            <p className="text-[12.5px] text-ink-500 italic text-center py-6">Waiting for invalidation to complete…</p>
          )}
        </Card>
      </div>

      {revalDone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="card p-4 flex items-center gap-3 shadow-pop"
        >
          <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Icon name="Check" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-[13.5px] font-semibold text-ink-900">
              Propagation complete · {cs.toVersion} is live
            </p>
            <p className="text-[12px] text-ink-500">
              User consoles have been notified and are running their revalidation.
            </p>
          </div>
          <StateBadge state="PUBLISHED" />
          <Button variant="primary" icon="ArrowR" onClick={() => navigate("/developer")}>
            返回 to 总览
          </Button>
        </motion.div>
      )}
    </div>
  );
}

const VersionPill: React.FC<{ version: string; highlight?: boolean; dim?: boolean }> = ({ version, highlight, dim }) => (
  <div className={`px-4 py-2 rounded-xl border-2 font-mono font-bold text-[18px]
    ${highlight ? "border-brand-400 bg-brand-50 text-brand-800 shadow-ring" : ""}
    ${dim ? "border-ink-200 bg-ink-50 text-ink-500" : ""}`}>
    {version}
  </div>
);
