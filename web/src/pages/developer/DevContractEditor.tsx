import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGovernance } from "../../store/governance";
import { Button, Card, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { GovernanceDiff } from "../../components/animations/Animations";
import { contractFromCandidate, humanRelation, nextChangeSetId } from "../../engines/governance";
import { buildChangeSet, findAffectedContracts } from "../../engines/dependency";
import { revalidate } from "../../engines/revalidation";
import { eventBus, nextId } from "../../app/eventBus";
import type { GovernanceEvent } from "../../domain/types";

export default function DevContractEditor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const candidateId = params.get("candidate");
  const s = useGovernance();

  const candidate = candidateId ? s.candidates[candidateId] : undefined;
  const cluster = candidate ? s.clusters[candidate.clusterId] : undefined;

  const [overridePolicy, setOverridePolicy] = React.useState<"FORBIDDEN" | "ALLOWED">("FORBIDDEN");
  const [publishing, setPublishing] = React.useState(false);

  if (!candidate || !cluster) {
    return (
      <Card>
        <p className="text-[13px] text-ink-600">No candidate selected. 批准 a candidate first.</p>
        <Button className="mt-2" onClick={() => navigate("/developer/inbox")}>返回收件箱</Button>
      </Card>
    );
  }

  // Build a draft global contract (NOT yet in store)
  const draft = contractFromCandidate(candidate, cluster);
  if (candidate.proposedType === "INVARIANT") {
    draft.overridePermission = false;
  }

  const fromVer = s.globalVersion;
  const toVer = incrementVersion(s.globalVersion);
  draft.parentVersion = fromVer;

  // Preview impact by running dependency engine on ALL local contracts in memory
  // (we only store a representative subset; platform count is displayed via stats)
  const allLocals = Object.values(s.localContracts);
  const affected = findAffectedContracts({
    id: "PREVIEW",
    fromVersion: fromVer,
    toVersion: toVer,
    changedContracts: [draft.id, "GC-1014"],
    changedSkills: [],
    changedRelationships: draft.relations,
    changedContextSchemas: draft.scope.taskTypes ?? [],
    affectedContractIds: [],
    createdAt: Date.now(),
  }, allLocals);

  const publish = async () => {
    setPublishing(true);
    const final契约 = { ...draft, id: draft.id, state: "ACTIVE" as const, createdAt: Date.now(), updatedAt: Date.now() };

    // Run revalidation on each affected local
    const retired: string[] = []; const refined: string[] = []; const conflicted: string[] = [];
    const revalidations = affected.map(a => {
      const r = revalidate(a.contract, [final契约, ...Object.values(s.globalContracts)], {
        id: "PREVIEW", fromVersion: fromVer, toVersion: toVer,
        changedContracts: [final契约.id], changedSkills: [],
        changedRelationships: final契约.relations,
        changedContextSchemas: final契约.scope.taskTypes ?? [],
        affectedContractIds: [], createdAt: Date.now(),
      }, { taskType: "official_filing" });
      if (r.result === "RETIRED") retired.push(a.contract.id);
      if (r.result === "ACTIVE_REFINEMENT") refined.push(a.contract.id);
      if (r.result === "CONFLICT") conflicted.push(a.contract.id);
      return { contractId: a.contract.id, result: r };
    });

    const changeSet = buildChangeSet(fromVer, toVer, final契约, affected);
    changeSet.revalidation = { retired, refined, conflicted };
    changeSet.id = nextChangeSetId(toVer);

    s.addGlobalContract(final契约);
    s.addChangeSet(changeSet);

    // Mark affected locals stale
    for (const a of affected) {
      s.updateLocalContract(a.contract.id, { state: "STALE" });
    }

    // Update candidate
    s.upsertCandidate({ ...candidate, state: "PUBLISHED", publishedContractId: final契约.id });

    // Broadcast
    const payload = { changeSetId: changeSet.id };
    const evt: GovernanceEvent = {
      eventId: nextId("evt"), eventType: "GLOBAL_CONTRACT_PUBLISHED",
      timestamp: Date.now(), sourceDomain: "DEVELOPER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: toVer, payload,
    };
    s.emit(evt);
    s.emit({
      ...evt, eventId: nextId("evt"), eventType: "GLOBAL_CHANGESET_CREATED",
      payload: { changeSet, global契约: final契约 },
    });

    // Apply revalidation results (locally) — the user windows will also run their own when they receive the event.
    for (const id of retired)   s.updateLocalContract(id, { state: "RETIRED" });
    for (const id of refined)  s.updateLocalContract(id, { state: "ACTIVE_REFINEMENT" });
    for (const id of conflicted) s.updateLocalContract(id, { state: "CONFLICT" });

    // Navigate to propagation monitor
    navigate(`/developer/propagation/${changeSet.id}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
        <button className="link-quiet" onClick={() => navigate(-1)}>返回</button>
        <Icon name="ChevronR" size={12} /> <span>New Global 契约</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Global 契约 Editor</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">Candidate {candidate.id} · cluster {cluster.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <StateBadge state={candidate.state} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-7 space-y-4">
          <SectionTitle icon="FileCode" title="Governance 规则" />
          <div>
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">规则 class</p>
            <div className="flex items-center gap-2">
              <span className={`chip ${candidate.proposedType === "DEFAULT" ? "chip-brand" : "chip-rose"}`}>
                {candidate.proposedType === "DEFAULT" ? "Global Default" : "Global Invariant"}
              </span>
              <span className="text-[12px] text-ink-500">
                {candidate.proposedType === "DEFAULT"
                  ? "Locals may refine with context-specific conditions."
                  : "Locals cannot relax this constraint (overridePermission=false)."}
              </span>
            </div>
          </div>

          <GovernanceDiff
            lines={[
              { sign: "+", text: `WHEN taskType = ${candidate.proposedPredicate.find(p => p.field === "taskType")?.value ?? "*"}` },
              { sign: "+", text: `AND sourceRequirement = official` },
              { sign: "+", text: `THEN ${humanRelation(candidate.proposedRelation)}` },
            ]}
          />

          {candidate.proposedType === "INVARIANT" && (
            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">
                Local Override Policy
              </p>
              <div className="space-y-1.5">
                {(["FORBIDDEN", "ALLOWED"] as const).map(p => (
                  <label key={p} className="flex items-center gap-2 p-2 rounded-lg border border-ink-200 cursor-pointer">
                    <input type="radio" checked={overridePolicy === p} readOnly className="accent-brand-600" />
                    <span className="text-[12.5px] text-ink-800">
                      {p === "FORBIDDEN" ? "Forbidden — locals cannot relax" : "全部owed with conditions"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="col-span-12 lg:col-span-5 space-y-3">
          <SectionTitle icon="Git" title="Version Preview" />
          <div className="flex items-center gap-3 text-center">
            <div className="flex-1 p-3 rounded-xl bg-ink-50 border border-ink-100">
              <p className="text-[10.5px] uppercase tracking-wider text-ink-500">From</p>
              <p className="text-[20px] font-bold mono text-ink-700">{fromVer}</p>
            </div>
            <Icon name="ArrowR" size={18} className="text-ink-400" />
            <div className="flex-1 p-3 rounded-xl bg-brand-50 border border-brand-200">
              <p className="text-[10.5px] uppercase tracking-wider text-brand-700">To</p>
              <p className="text-[20px] font-bold mono text-brand-800">{toVer}</p>
            </div>
          </div>
          <SectionTitle icon="Network" title="Impact Summary" className="!mt-5" />
          <div className="grid grid-cols-2 gap-2 text-[12.5px]">
            <Impact label="Affected" value={affected.length} color="text-amber-700 bg-amber-50 border-amber-200" />
            <Impact label="Unaffected" value={s.platformStats.localContractsObserved - affected.length} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
          </div>
          <ul className="text-[12px] text-ink-600 mt-2 space-y-1 list-disc pl-4">
            {affected.slice(0, 5).map(a => (
              <li key={a.contract.id} className="mono">
                {a.contract.id} <span className="text-ink-400">· {a.reasons.join(", ")}</span>
              </li>
            ))}
            {affected.length > 5 && <li className="text-ink-400">… and {affected.length - 5} more</li>}
          </ul>
        </Card>
      </div>

      <div className="sticky bottom-4 card p-3 flex items-center gap-2 shadow-pop">
        <Button variant="ghost" onClick={() => navigate(-1)}>取消</Button>
        <div className="ml-auto" />
        <Button variant="outline">Save Draft</Button>
        <Button variant="primary" icon="Bolt" onClick={publish} disabled={publishing}>
          {publishing ? "Publishing…" : `Publish ${toVer}`}
        </Button>
      </div>
    </div>
  );
}

const Impact: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className={`p-3 rounded-xl border ${color}`}>
    <p className="text-[10.5px] uppercase tracking-wider opacity-80 font-semibold">{label}</p>
    <p className="text-[20px] font-bold mono leading-none mt-1">{value.toLocaleString()}</p>
  </div>
);

function incrementVersion(v: string) {
  const n = parseInt(v.replace("v",""), 10);
  return `v${n + 1}`;
}
