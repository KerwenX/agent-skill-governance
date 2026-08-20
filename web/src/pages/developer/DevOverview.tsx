import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, SectionTitle, StatCard, StateBadge, Empty } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { AnimatedNumber } from "../../components/common/UI";
import { Funnel } from "../../components/animations/Animations";

export default function DevOverview() {
  const navigate = useNavigate();
  const s = useGovernance();

  const 证据List = Object.values(s.evidence).sort((a,b) => b.createdAt - a.createdAt);
  const clusters = Object.values(s.clusters);
  const candidates = Object.values(s.candidates);
  const localContracts = Object.values(s.localContracts);

  const activeCount    = localContracts.filter(c => c.state === "ACTIVE").length;
  const staleCount     = localContracts.filter(c => c.state === "STALE").length;
  const retiredCount   = localContracts.filter(c => c.state === "RETIRED").length;
  const refinedCount   = localContracts.filter(c => c.state === "ACTIVE_REFINEMENT").length;
  const conflictCount  = localContracts.filter(c => c.state === "CONFLICT").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900 leading-tight">治理总览</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">
            跨窗口信号流 · 全局基准 <span className="mono text-brand-700 font-semibold">{s.globalVersion}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon="History" onClick={() => navigate("/developer/history")}>历史记录</Button>
          <Button variant="soft" icon="Git" onClick={() => navigate("/developer/证据")}>证据智能</Button>
          <Button variant="primary" icon="ArrowR" onClick={() => navigate("/developer/inbox")}>
            打开收件箱
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="技能"              value={s.platformStats.skills} icon="Cog"       accent="brand" />
        <StatCard label="全局契约"    value={Object.keys(s.globalContracts).length} icon="Book" accent="brand" />
        <StatCard label="观测到本地契约"      value={s.platformStats.localContractsObserved} icon="Layers" accent="violet" />
        <StatCard label="证据总数"      value={s.evidenceInboxCount} icon="Inbox" accent="amber" delta={证据List.length} />
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Signal panel */}
        <Card className="col-span-12 lg:col-span-8">
          <SectionTitle
            icon="Pulse" title="治理信号"
            subtitle="实时证据、聚类与升级候选"
            right={<StateBadge state="LIVE" />}
          />
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Tile label="新证据"     value={s.evidenceInboxCount} color="text-brand-700" />
            <Tile label="聚类"         value={clusters.length}      color="text-violet-700" />
            <Tile label="可升级"  value={clusters.filter(c => c.state === "PROMOTION_READY").length} color="text-emerald-700"
                  pulse={clusters.some(c => c.state === "PROMOTION_READY")} />
            <Tile label="冲突"        value={conflictCount}        color="text-rose-700" />
          </div>

          {clusters.length > 0 && (
            <div className="space-y-2">
              {clusters.slice(0, 4).map(c => {
                const cand = candidates.find(x => x.clusterId === c.id);
                return (
                  <motion.button
                    key={c.id}
                    layout
                    onClick={() => navigate(cand ? `/developer/candidates/${cand.id}` : "/developer/证据")}
                    className="w-full text-left p-3 rounded-xl border border-ink-200 hover:border-brand-300 bg-white hover:bg-brand-50/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center">
                        <Icon name="Git" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ink-900 mono">{c.id}</p>
                        <p className="text-[11.5px] text-ink-500">
                          {c.independentUserCount} 用户 · {c.totalEvidenceCount} 证据 · score {c.promotionScore.toFixed(2)}
                        </p>
                      </div>
                      <StateBadge state={c.state} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
          {clusters.length === 0 && (
            <Empty
              icon="Inbox"
              title="等待本地证据"
              body="在用户窗口运行任务并触发修正，证据将实时出现在这里。"
            />
          )}
        </Card>

        {/* Recent global changes */}
        <Card className="col-span-12 lg:col-span-4">
          <SectionTitle icon="History" title="最近全局变更" />
          {Object.values(s.changeSets).length === 0 && (
            <p className="text-[12.5px] text-ink-500 italic py-6 text-center">
              本场会话尚未发布全局变更 this session.
            </p>
          )}
          <div className="space-y-2">
            {Object.values(s.changeSets).slice(-5).reverse().map(cs => (
              <button key={cs.id}
                onClick={() => navigate(`/developer/propagation/${cs.id}`)}
                className="w-full text-left p-3 rounded-lg border border-ink-200 hover:border-brand-300 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="mono text-[12px] font-semibold text-brand-700">{cs.fromVersion} → {cs.toVersion}</span>
                  <span className="chip chip-emerald ml-auto">已发布</span>
                </div>
                <p className="text-[11.5px] text-ink-500">
                  {cs.affectedContractIds.length} local affected · {cs.revalidation?.retired.length ?? 0} retired
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* Health */}
        <Card className="col-span-12 lg:col-span-7">
          <SectionTitle icon="Shield" title="治理健康度" subtitle="本地契约生命周期分布" />
          <div className="grid grid-cols-5 gap-3">
            <HealthTile label="生效中"      value={activeCount}   color="emerald" />
            <HealthTile label="待重验证"       value={staleCount}    color="amber" />
            <HealthTile label="已退役"     value={retiredCount}  color="slate" />
            <HealthTile label="精化"  value={refinedCount}  color="violet" />
            <HealthTile label="冲突"    value={conflictCount} color="rose" />
          </div>
          {(retiredCount + refinedCount + conflictCount) > 0 && (
            <div className="mt-5">
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
                Last propagation funnel
              </p>
              <Funnel
                total={retiredCount + refinedCount + conflictCount}
                stages={[
                  { label: "已退役",    value: retiredCount, color: "bg-ink-500" },
                  { label: "Refinement", value: refinedCount, color: "bg-violet-500" },
                  { label: "冲突",   value: conflictCount, color: "bg-rose-500" },
                ]}
              />
            </div>
          )}
        </Card>

        {/* 证据 activity */}
        <Card className="col-span-12 lg:col-span-5">
          <SectionTitle icon="Pulse" title="证据 Activity" subtitle="最新本地信号" />
          {证据List.length === 0 && (
            <p className="text-[12.5px] text-ink-500 italic py-6 text-center">暂无证据。</p>
          )}
          <div className="space-y-2">
            {证据List.slice(0, 6).map(e => (
              <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-ink-50">
                <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[11px] font-bold">
                  {e.userId.replace("user-","").toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-mono text-ink-800 truncate">{e.id}</p>
                  <p className="text-[11px] text-ink-500 truncate">{e.violationType}</p>
                </div>
                <StateBadge state={e.state} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 本地数据库状态（简易 JSON 数据库 + 副本复位） */}
      <Card className="!bg-ink-900 text-ink-100 border-ink-800">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <p className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-1">数据存储</p>
            <p className="text-[12.5px] text-ink-200 leading-relaxed">
              种子副本 <span className="mono text-brand-300">data/db.json</span>（每次启动复位） → 运行时库
              <span className="mono text-brand-300"> localStorage</span>（运行中可增删改查）
            </p>
            <p className="text-[11px] text-ink-400 mt-1">
              当前场景 <span className="mono">{s.scenarioId}</span> · 版本 {s.globalVersion} · 本地规则 {localContracts.length} 条 ·
              证据 {Object.keys(s.evidence).length} 条 · 变更集 {Object.keys(s.changeSets).length} 个
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="soft" size="sm" icon="Reset" onClick={async () => {
              const { resetDb } = await import("../../data/db");
              await resetDb();
              location.reload();
            }}>恢复默认数据</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

const Tile: React.FC<{ label: string; value: number; color: string; pulse?: boolean }> = ({ label, value, color, pulse }) => (
  <div className={`p-3 rounded-xl border border-ink-200 bg-white relative overflow-hidden ${pulse ? "ring-2 ring-emerald-300/40" : ""}`}>
    <p className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">{label}</p>
    <p className={`mt-1 text-[24px] font-bold mono leading-none ${color}`}>
      <AnimatedNumber value={value} />
    </p>
    {pulse && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
  </div>
);

const HEALTH_COLORS: Record<string,string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber:   "bg-amber-50 text-amber-700 border-amber-200",
  slate:   "bg-ink-100 text-ink-700 border-ink-200",
  violet:  "bg-violet-50 text-violet-700 border-violet-200",
  rose:    "bg-rose-50 text-rose-700 border-rose-200",
};
const HealthTile: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className={`p-3 rounded-xl border ${HEALTH_COLORS[color]}`}>
    <p className="text-[10.5px] uppercase tracking-wider opacity-80 font-semibold">{label}</p>
    <p className="text-[22px] font-bold mono leading-none mt-1">{value}</p>
  </div>
);
