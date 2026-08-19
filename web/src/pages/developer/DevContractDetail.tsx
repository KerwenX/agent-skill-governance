import React from "react";
import { useParams } from "react-router-dom";
import { useGovernance } from "../../store/governance";
import { Card, SectionTitle, StateBadge, Empty } from "../../components/common/UI";
import { humanRelation } from "../../engines/governance";
import { LineageTrail } from "../../components/animations/Animations";

const TABS = ["规则", "来源", "Impact", "依赖", "History"] as const;

export default function DevContractDetail() {
  const { contractId } = useParams();
  const s = useGovernance();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("规则");
  const contract = contractId ? s.globalContracts[contractId] : undefined;

  if (!contract) {
    return <Empty title="契约 not found" body="It may not exist in this demo session." />;
  }

  const 证据 = contract.originEvidenceIds.map(id => s.evidence[id]).filter(Boolean);
  const cluster = Object.values(s.clusters).find(c => c.evidenceIds.some(id => contract.originEvidenceIds.includes(id)));
  const candidate = Object.values(s.candidates).find(c => c.publishedContractId === contract.id);
  const changeSets = Object.values(s.changeSets).filter(cs => cs.changedContracts.includes(contract.id));
  const latestCs = changeSets[changeSets.length - 1];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="mono text-[12px] text-brand-700 font-semibold">{contract.id}</p>
          <h1 className="text-[22px] font-bold text-ink-900">{contract.title}</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">{contract.summary}</p>
        </div>
        <StateBadge state={contract.state} />
      </div>

      <div className="flex items-center gap-1 border-b border-ink-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative px-4 h-10 text-[13px] font-medium transition-colors
              ${tab === t ? "text-brand-700" : "text-ink-500 hover:text-ink-800"}`}>
            {t}
            {tab === t && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-brand-600 rounded-t-sm" />}
          </button>
        ))}
      </div>

      {tab === "规则" && (
        <Card>
          <SectionTitle title="Predicate & Relations" />
          <div className="space-y-3">
            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">WHEN</p>
              <div className="space-y-1">
                {contract.predicate.map((p, i) => (
                  <div key={i} className="text-[12.5px] mono bg-ink-50 border border-ink-100 rounded-lg px-3 py-1.5">
                    {p.field} {p.operator.toLowerCase()} {JSON.stringify(p.value)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">THEN</p>
              <div className="space-y-1">
                {contract.relations.map((r, i) => (
                  <div key={i} className="text-[12.5px] mono bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-1.5">
                    {humanRelation(r)}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 text-[12px] text-ink-600">
              <span className="chip">Type: {contract.contractType}</span>
              <span className="chip">Override: {contract.overridePermission ? "全部owed" : "Forbidden"}</span>
              <span className="chip mono">父版本: {contract.parentVersion}</span>
            </div>
          </div>
        </Card>
      )}

      {tab === "来源" && (
        <Card>
          <SectionTitle title="Lineage" subtitle="Runtime 证据 → cluster → candidate → contract" />
          <LineageTrail
            nodes={[
              { id: "ev", label: "Runtime 证据", sub: `${证据.length} items`, tone: "slate" },
              { id: "cl", label: "证据 Cluster", sub: cluster?.id ?? "—", tone: "violet" },
              { id: "cd", label: "Candidate", sub: candidate?.id ?? "—", tone: "brand" },
              { id: "gc", label: "Global 契约", sub: contract.id, tone: "emerald", active: true },
            ]}
          />
        </Card>
      )}

      {tab === "Impact" && (
        <Card>
          <SectionTitle title="Impact" subtitle={latestCs ? `From ${latestCs.fromVersion} → ${latestCs.toVersion}` : "No changes"} />
          {latestCs ? (
            <div className="grid grid-cols-4 gap-3">
              <ImpactTile label="Affected"  value={latestCs.affectedContractIds.length} color="amber" />
              <ImpactTile label="已退役"   value={latestCs.revalidation?.retired.length ?? 0} color="slate" />
              <ImpactTile label="Refinement" value={latestCs.revalidation?.refined.length ?? 0} color="violet" />
              <ImpactTile label="冲突"  value={latestCs.revalidation?.conflicted.length ?? 0} color="rose" />
            </div>
          ) : <p className="text-[12.5px] text-ink-500 italic">No propagation data yet.</p>}
        </Card>
      )}

      {tab === "依赖" && (
        <Card>
          <SectionTitle title="依赖 Policy" />
          <p className="text-[12.5px] text-ink-600">
            Local contracts based on this rule track: <b>parent contract</b>, <b>skill versions</b>,{" "}
            <b>relationship</b> and <b>context schema</b>. When any of these change, dependent local contracts
            enter <span className="chip chip-amber">STALE</span> and revalidation is triggered automatically.
          </p>
        </Card>
      )}

      {tab === "History" && (
        <Card>
          <SectionTitle title="History" />
          <ul className="space-y-2 text-[12.5px]">
            <历史记录Item time="—" title={`${contract.id} published`} sub={`based on ${candidate?.id ?? "candidate"} · ${contract.originEvidenceIds.length} 证据`} />
            <历史记录Item time="—" title={`${candidate?.id ?? "Candidate"} approved`} sub="promotion threshold crossed" />
          </ul>
        </Card>
      )}
    </div>
  );
}

const ImpactTile: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const map: Record<string,string> = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-ink-100 text-ink-700 border-ink-200",
    violet:"bg-violet-50 text-violet-700 border-violet-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <div className={`p-4 rounded-xl border ${map[color]}`}>
      <p className="text-[10.5px] uppercase tracking-wider opacity-80 font-semibold">{label}</p>
      <p className="text-[26px] font-bold mono leading-none mt-1">{value}</p>
    </div>
  );
};
const 历史记录Item: React.FC<{ time: string; title: string; sub: string }> = ({ time, title, sub }) => (
  <li className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-ink-50">
    <span className="mono text-[11px] text-ink-400 w-16 shrink-0">{time}</span>
    <div>
      <p className="text-ink-800 font-medium">{title}</p>
      <p className="text-ink-500 text-[11.5px]">{sub}</p>
    </div>
  </li>
);
