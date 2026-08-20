import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Drawer, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { ScoreTransition } from "../../components/animations/Animations";
import { humanRelation } from "../../engines/governance";
import { PROMOTION_THRESHOLD } from "../../engines/aggregation";

const SKILL_COLORS: Record<string, string> = {
  "skill-web-search": "#3B82F6",
  "skill-ir-search":  "#8B5CF6",
  "skill-pdf-extraction": "#06B6D4",
  "skill-ocr":        "#F59E0B",
  "skill-internal-finance": "#10B981",
};

export default function DevEvidence() {
  const navigate = useNavigate();
  const { clusterId } = useParams();
  const s = useGovernance();
  const [selected, setSelected] = React.useState<string | undefined>(clusterId);
  const [whyOpen, set为何Open] = React.useState(false);

  const clusters = Object.values(s.clusters).sort((a,b) => b.createdAt - a.createdAt);
  const activeId = selected;
  const activeCluster = clusters.find(c => c.id === activeId);

  // Synthesize canvas positions (deterministic)
  const positions = React.useMemo(() => {
    const map: Record<string, { x: number; y: number; color: string }> = {};
    const 证据Arr = Object.values(s.evidence);
    证据Arr.forEach((ev, i) => {
      const angle = (i / Math.max(1, 证据Arr.length)) * Math.PI * 2;
      const cluster = clusters.find(c => c.evidenceIds.includes(ev.id));
      const radius = cluster ? 60 : 140;
      map[ev.id] = {
        x: 260 + Math.cos(angle) * radius + (i % 3) * 12,
        y: 220 + Math.sin(angle) * radius + (i % 2) * 10,
        color: SKILL_COLORS[ev.skillRelation.sourceSkillId] ?? "#64748B",
      };
    });
    clusters.forEach((c, i) => {
      const angle = (i / Math.max(1, clusters.length)) * Math.PI * 2 + 0.6;
      map[c.id] = {
        x: 260 + Math.cos(angle) * 40,
        y: 220 + Math.sin(angle) * 40,
        color: "#8B5CF6",
      };
    });
    return map;
  }, [s.evidence, clusters]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">证据智能</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">证据按技能关系、违规类型、上下文与版本兼容性自动聚类。</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">升级阈值 <b className="mono ml-1">{PROMOTION_THRESHOLD.toFixed(2)}</b></span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Canvas */}
        <Card pad={false} className="col-span-12 lg:col-span-8 overflow-hidden relative" style={{ minHeight: 480 }}>
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <span className="chip chip-violet"><Icon name="Git" size={12} /> 聚类画布</span>
          </div>
          <svg viewBox="0 0 520 440" className="w-full h-[480px] grid-bg">
            {/* Edges */}
            {clusters.map(c =>
              c.evidenceIds.map(eid => {
                const a = positions[c.id]; const b = positions[eid];
                if (!a || !b) return null;
                return (
                  <line key={`${c.id}-${eid}`}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={c.state === "PROMOTION_READY" ? "#10B981" : "#CBD5E1"}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    className={c.state === "PROMOTION_READY" ? "edge-flow" : ""}
                  />
                );
              })
            )}
            {/* 证据 nodes */}
            {Object.entries(positions).filter(([k]) => k.startsWith("LE-")).map(([id, p]) => {
              const ev = s.evidence[id]; if (!ev) return null;
              return (
                <motion.g key={id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="cursor-pointer"
                  onClick={() => setSelected(ev.id)}
                >
                  <circle cx={p.x} cy={p.y} r={10} fill={p.color} stroke="white" strokeWidth={2} />
                  <text x={p.x} y={p.y - 14} textAnchor="middle"
                    className="fill-ink-500" style={{ fontSize: 9, fontFamily: "Fira Code" }}>
                    {id.slice(0,10)}
                  </text>
                </motion.g>
              );
            })}
            {/* Cluster nodes */}
            {clusters.map(c => {
              const p = positions[c.id]; if (!p) return null;
              const ready = c.state === "PROMOTION_READY";
              return (
                <motion.g key={c.id}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="cursor-pointer"
                  onClick={() => { setSelected(c.id); set为何Open(true); }}
                >
                  {ready && (
                    <circle cx={p.x} cy={p.y} r={28} fill="none" stroke="#10B981" strokeWidth={2} opacity={0.4}>
                      <animate attributeName="r" values="22;32;22" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={p.x} cy={p.y} r={20}
                    fill={ready ? "#10B981" : "#8B5CF6"} stroke="white" strokeWidth={3} />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white"
                    style={{ fontSize: 11, fontWeight: 700, fontFamily: "Fira Code" }}>
                    {c.totalEvidenceCount}
                  </text>
                  <text x={p.x} y={p.y + 36} textAnchor="middle"
                    className="fill-ink-700" style={{ fontSize: 10, fontWeight: 600, fontFamily: "Fira Code" }}>
                    {c.id}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </Card>

        {/* Detail */}
        <Card className="col-span-12 lg:col-span-4">
          {activeId ? (
            (() => {
              const c = activeCluster;
              if (!c) {
                const ev = s.evidence[activeId];
                return ev ? (
                  <div>
                    <SectionTitle icon="Inbox" title={ev.id} subtitle={ev.violationType} />
                    <p className="text-[12.5px] text-ink-600 mb-2">{humanRelation(ev.skillRelation)}</p>
                    <dl className="text-[12px] space-y-1">
                      <div className="flex justify-between"><dt className="text-ink-500">用户</dt><dd className="mono">{ev.userId}</dd></div>
                      <div className="flex justify-between"><dt className="text-ink-500">质量</dt><dd className="mono">{ev.qualityScore.toFixed(2)}</dd></div>
                      <div className="flex justify-between"><dt className="text-ink-500">父版本</dt><dd className="mono">{ev.parentGlobalVersion}</dd></div>
                    </dl>
                  </div>
                ) : null;
              }
              return (
                <div>
                  <SectionTitle
                    icon="Git" title={c.id} subtitle={humanRelation(c.skillRelation)}
                    right={<StateBadge state={c.state} />}
                  />
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                      <Metric k="Indep. 用户" v={c.independentUserCount} />
                      <Metric k="证据" v={c.totalEvidenceCount} />
                      <Metric k="频次" v={`${(c.frequencyScore*100).toFixed(0)}%`} />
                      <Metric k="覆盖率" v={`${(c.coverageScore*100).toFixed(0)}%`} />
                      <Metric k="一致性" v={`${(c.resolutionAgreement*100).toFixed(0)}%`} />
                      <Metric k="质量" v={`${(c.evidenceQuality*100).toFixed(0)}%`} />
                    </div>
                    <div className="card !shadow-none p-3">
                      <ScoreTransition value={c.promotionScore} threshold={PROMOTION_THRESHOLD} label="升级评分" />
                      <div className="mt-1.5 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500"
                          initial={{ width: 0 }} animate={{ width: `${c.promotionScore*100}%` }} />
                      </div>
                    </div>
                    <Button variant="soft" size="sm" icon="Info" onClick={() => set为何Open(true)}>
                      为何聚在一起？
                    </Button>
                    {c.candidateId && (
                      <Button variant="primary" size="sm" icon="ArrowR" block
                        onClick={() => navigate(`/developer/candidates/${c.candidateId}`)}>
                        审阅候选
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <Empty icon="Git" title="选择一个聚类" body="点击画布上的紫色/绿色节点查看证据详情。" />
          )}
        </Card>
      </div>

      <Drawer open={whyOpen} onClose={() => set为何Open(false)} title="相似度分析" width={520}>
        {activeCluster && (() => {
          const c = activeCluster;
          if (!c) return null;
          return (
            <div className="space-y-3">
              {[
                ["技能对", "匹配", 100, "emerald"],
                ["违规类型", "匹配", 100, "emerald"],
                ["上下文特征", "93%", 93, "brand"],
                ["版本兼容", c.versionCompatibility ? `${(c.versionCompatibility*100).toFixed(0)}%` : "100%",
                  c.versionCompatibility ? c.versionCompatibility*100 : 100, "brand"],
                ["解决方式", "匹配", (c.resolutionAgreement*100)|0, "emerald"],
              ].map(([label, val, pct, tone]) => (
                <div key={label as string}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <span className="text-ink-700 font-medium">{label}</span>
                    <span className="mono text-ink-900">{val as string}</span>
                  </div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <motion.div className={`h-full ${tone === "emerald" ? "bg-emerald-500" : "bg-brand-500"}`}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}

const Metric: React.FC<{ k: string; v: string | number }> = ({ k, v }) => (
  <div className="p-2 rounded-lg bg-ink-50 border border-ink-100">
    <p className="text-[10.5px] uppercase tracking-wider text-ink-500">{k}</p>
    <p className="text-[15px] font-bold text-ink-900 mono leading-none mt-0.5">{v}</p>
  </div>
);
