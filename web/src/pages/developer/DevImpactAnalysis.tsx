import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { AnimatedNumber } from "../../components/common/UI";
import { findAffectedContracts } from "../../engines/dependency";
import { humanRelation } from "../../engines/governance";
import { buildPublish } from "../../engines/publishing";

export default function DevImpactAnalysis() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const s = useGovernance();
  const [scanning, setScanning] = React.useState(false);
  const [scanProgress, setScanProgress] = React.useState<Record<string, number>>({
    ParentContract: 0, SkillVersion: 0, Relationship: 0, ContextSchema: 0,
  });
  const [done, setDone] = React.useState(false);

  // Find the candidate + draft contract (by candidate id)
  const candidate = Object.values(s.candidates).find(c => c.id === draftId)
    ?? Object.values(s.candidates).find(c => c.state === "APPROVED");
  const cluster = candidate ? s.clusters[candidate.clusterId] : undefined;

  const allLocals = Object.values(s.localContracts);

  // Build a preview publish (draft contract + change set) from the scenario profile.
  const pub = React.useMemo(
    () => (candidate ? buildPublish(s, candidate) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidate, s.globalVersion, s.localContracts, s.globalContracts],
  );
  const changeSet = pub?.changeSet ?? null;
  const toVer = pub?.changeSet.toVersion ?? "";
  const draft = pub?.contract;

  const affected = React.useMemo(
    () => changeSet ? findAffectedContracts(changeSet, allLocals) : [],
    [changeSet, allLocals]
  );

  const runScan = async () => {
    setScanning(true); setDone(false);
    const cats = ["ParentContract", "SkillVersion", "Relationship", "ContextSchema"] as const;
    for (const cat of cats) {
      const count = affected.filter(a => a.reasons.includes(cat)).length;
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        await new Promise(r => setTimeout(r, 40));
        setScanProgress(p => ({ ...p, [cat]: Math.round((count * i) / steps) }));
      }
      setScanProgress(p => ({ ...p, [cat]: count }));
    }
    setScanning(false); setDone(true);
  };

  if (!changeSet || !candidate || !draft) {
    return <Empty title="没有可分析的草案" body="请先批准一条候选规则，再运行影响分析。"
      cta={<Button onClick={() => navigate("/developer/inbox")}>返回收件箱</Button>} />;
  }
  const diffLines = [
    ...draft.predicate.map(p => `当 ${p.field} ${p.operator.toLowerCase().replace("_"," ")} ${JSON.stringify(p.value)}`),
    ...draft.relations.map(r => `则 ${humanRelation(r, s.skills)}`),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
        <button className="link-quiet" onClick={() => navigate(-1)}>返回</button>
        <Icon name="ChevronR" size={12} /><span>影响分析</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">影响分析</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">
            <span className="mono">{changeSet.fromVersion}</span> →{" "}
            <span className="mono text-brand-700 font-semibold">{changeSet.toVersion}</span>
          </p>
        </div>
        <Button variant="primary" icon="Bolt" disabled={scanning} onClick={runScan}>
          {scanning ? "扫描中…" : done ? "重新扫描" : "Run 影响分析"}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-5">
          <SectionTitle icon="FileCode" title="版本差异" />
          <div className="rounded-xl border border-ink-200 overflow-hidden font-mono text-[12.5px]">
            {diffLines.map((line, i) => (
              <div key={i} className="px-3 py-1.5 bg-emerald-50/70 text-emerald-800">
                <span className="opacity-70">+</span> {line}
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <SectionTitle icon="Network" title="依赖 Scan" subtitle="parent · version · relationship · context schema" />
          <div className="space-y-2.5">
            {(["ParentContract","SkillVersion","Relationship","ContextSchema"] as const).map(cat => {
              const count = scanProgress[cat];
              const total = affected.filter(a => a.reasons.includes(cat)).length;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-36 text-[12.5px] text-ink-700 font-medium">{label(cat)}</span>
                  <div className="flex-1 h-6 bg-ink-100 rounded-md overflow-hidden relative">
                    <motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-md"
                      initial={{ width: 0 }}
                      animate={{ width: `${total === 0 ? 0 : (count / total) * 100}%` }}
                      transition={{ duration: 0.3 }} />
                    {scanning && count < total && (
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] text-ink-500">
                        扫描中…
                      </span>
                    )}
                  </div>
                  <span className="w-12 text-right mono text-[13px] font-semibold text-ink-800">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">受影响</p>
              <p className="text-[30px] font-bold text-amber-800 mono leading-none mt-1">
                {done ? <AnimatedNumber value={affected.length} /> : "—"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">不受影响</p>
              <p className="text-[30px] font-bold text-emerald-800 mono leading-none mt-1">
                {done ? <AnimatedNumber value={s.platformStats.localContractsObserved - affected.length} /> : "—"}
              </p>
            </div>
          </div>
        </Card>

        {/* Graph */}
        <Card pad={false} className="col-span-12 overflow-hidden">
          <div className="p-4 pb-0">
            <SectionTitle icon="Network" title="依赖 Graph" subtitle="Changed ◆ · Affected ● · Unaffected ○ · 冲突 !" />
          </div>
          <svg viewBox="0 0 900 320" className="w-full">
            {/* Global node (changed) */}
            <g>
              <rect x={410} y={30} width={80} height={44} rx={10} fill="#1E3A8A" />
              <text x={450} y={50} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Fira Code">
                {toVer}
              </text>
              <text x={450} y={65} textAnchor="middle" fill="#BFDBFE" fontSize="9">◆ 已变更</text>
            </g>
            {/* Local nodes */}
            {allLocals.slice(0, 14).map((lc, i) => {
              const isAffected = affected.some(a => a.contract.id === lc.id);
              const x = 60 + (i % 7) * 115;
              const y = i < 7 ? 180 : 270;
              const color = !done ? "#94A3B8"
                : lc.state === "CONFLICT" ? "#F43F5E"
                : isAffected ? "#F59E0B" : "#CBD5E1";
              const symbol = lc.state === "CONFLICT" && done ? "!" : isAffected && done ? "●" : "○";
              return (
                <g key={lc.id}>
                  {isAffected && done && (
                    <line x1={450} y1={74} x2={x+20} y2={y} stroke={color} strokeWidth={1.2} strokeDasharray="4 4" className="edge-flow" />
                  )}
                  <circle cx={x+20} cy={y} r={16} fill={color} stroke="white" strokeWidth={2} />
                  <text x={x+20} y={y+4} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">{symbol}</text>
                  <text x={x+20} y={y+30} textAnchor="middle" fill="#475569" fontSize="9" fontFamily="Fira Code">
                    {lc.id.slice(0,8)}
                  </text>
                </g>
              );
            })}
          </svg>
        </Card>
      </div>

      <div className="sticky bottom-4 card p-3 flex items-center gap-2 shadow-pop">
        <Button variant="ghost" onClick={() => navigate(-1)}>返回</Button>
        <div className="ml-auto flex items-center gap-2">
          <StateBadge state={done ? "PROMOTION_READY" : "EVALUATING"} />
          <Button variant="primary" icon="Bolt"
            disabled={!done || scanning}
            onClick={() => navigate(`/developer/contracts/new?candidate=${candidate.id}`)}>
            Proceed to Publish
          </Button>
        </div>
      </div>
    </div>
  );
}

function label(cat: string) {
  return { ParentContract: "父版本 契约", SkillVersion: "Skill Version",
           Relationship: "技能关系", ContextSchema: "上下文模式" }[cat] ?? cat;
}
