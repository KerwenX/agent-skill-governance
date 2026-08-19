import React from "react";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Card, SectionTitle } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { humanRelation } from "../../engines/governance";

export default function DevDependencies() {
  const s = useGovernance();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"ALL" | "ParentContract" | "SkillVersion" | "Relationship" | "Context">("ALL");

  const localContracts = Object.values(s.localContracts);
  const filtered = localContracts.filter(c => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
      || (c.ownerId ?? "").toLowerCase().includes(q)
      || c.relations.some(r => r.sourceSkillId.includes(q) || (r.targetSkillId ?? "").includes(q));
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-ink-900">依赖 Network</h1>
        <p className="text-[13px] text-ink-500 mt-0.5">
          Global 契约 → Skill / Relationship → Local 契约 → User / Agent
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search skill, contract, user…"
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-ink-200 bg-white text-[13px] outline-none focus:border-brand-400" />
          </div>
          <div className="flex items-center gap-1">
            {(["ALL","ParentContract","SkillVersion","Relationship","Context"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 h-8 rounded-lg text-[12px] font-medium border transition-colors
                  ${filter === f ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"}`}>
                {f === "ALL" ? "全部" : f.replace(/([A-Z])/g, " $1").trim()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="p-4 rounded-xl border border-ink-200 bg-white hover:border-brand-300 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="mono text-[12px] font-semibold text-brand-700">{c.id}</span>
                <span className="chip chip-slate ml-auto">{c.state}</span>
              </div>
              <p className="text-[13px] font-semibold text-ink-900 mb-1">{c.title}</p>
              <p className="text-[11.5px] text-ink-500 mb-3">{c.summary}</p>
              {c.dependencies && (
                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  <DepItem label="父版本" value={c.dependencies.parentContractId} />
                  <DepItem label="Context" value={c.dependencies.contextSchemas.join(", ") || "—"} />
                  <DepItem label="技能" value={Object.entries(c.dependencies.skillVersions).map(([k,v]) =>
                    `${k.replace("skill-","")}@${v}`).join(", ")} mono />
                  <DepItem label="Relation" value={c.dependencies.relationships.map(r => humanRelation(r)).join("; ")} mono />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const DepItem: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="p-2 rounded-lg bg-ink-50 border border-ink-100 min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
    <p className={`text-ink-800 truncate ${mono ? "mono text-[11px]" : "text-[12px]"}`} title={value}>{value}</p>
  </div>
);
