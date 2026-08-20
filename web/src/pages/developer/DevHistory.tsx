import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Empty, SectionTitle } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";

export default function DevHistory() {
  const navigate = useNavigate();
  const 条事件 = useGovernance(s => s.events);
  const changeSets = useGovernance(s => s.changeSets);
  const candidates = useGovernance(s => s.candidates);

  const items = React.useMemo(() => {
    const out: { ts: number; title: string; sub?: string; cta?: string; kind: string }[] = [];
    Object.values(changeSets).forEach(cs => {
      out.push({
        ts: cs.createdAt,
        title: `${cs.fromVersion} → ${cs.toVersion} published`,
        sub: `${cs.affectedContractIds.length} local affected · ${cs.revalidation?.retired.length ?? 0} retired`,
        cta: `/developer/propagation/${cs.id}`,
        kind: "publish",
      });
    });
    Object.values(candidates).forEach(c => {
      out.push({
        ts: c.createdAt,
        title: `${c.id} ${c.state.toLowerCase().replace("_"," ")}`,
        sub: c.rationale[0],
        cta: `/developer/candidates/${c.id}`,
        kind: "candidate",
      });
    });
    条事件.filter(e => e.eventType === "LOCAL_EVIDENCE_CREATED").forEach(e => {
      out.push({ ts: e.timestamp, title: "Local 证据 received", sub: (e.payload as {evidenceId:string}).evidenceId, kind: "证据" });
    });
    return out.sort((a,b) => b.ts - a.ts).slice(0, 60);
  }, [changeSets, candidates, 条事件]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-ink-900">治理历史记录</h1>
        <p className="text-[13px] text-ink-500 mt-0.5">治理侧按时间顺序的事件时间线。</p>
      </div>
      <Card>
        <SectionTitle icon="History" title="Timeline" />
        {items.length === 0 && <Empty title="No history yet" body="Run a demo to populate the timeline." />}
        <div className="relative pl-6">
          <div className="absolute left-[10px] top-2 bottom-2 w-px bg-ink-200" />
          {items.map((it, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i*0.02, 0.4) }}
              className="relative pb-4 last:pb-0">
              <span className={`absolute -left-[22px] top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px]
                ${it.kind === "publish" ? "bg-emerald-500 text-white"
                  : it.kind === "candidate" ? "bg-brand-500 text-white"
                  : "bg-amber-500 text-white"}`}>
                {it.kind === "publish" ? <Icon name="Check" size={11} />
                  : it.kind === "candidate" ? <Icon name="FileCode" size={10} />
                  : <Icon name="Inbox" size={10} />}
              </span>
              <button
                disabled={!it.cta}
                onClick={() => it.cta && navigate(it.cta)}
                className="text-left w-full group">
                <p className="text-[13px] font-semibold text-ink-900 group-hover:text-brand-700">{it.title}</p>
                {it.sub && <p className="text-[11.5px] text-ink-500 mt-0.5">{it.sub}</p>}
                <p className="text-[10.5px] mono text-ink-400 mt-0.5">
                  {new Date(it.ts).toLocaleTimeString()}
                </p>
              </button>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
