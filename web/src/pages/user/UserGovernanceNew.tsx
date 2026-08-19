import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useGovernance } from "../../store/governance";
import { Button, Card, SectionTitle } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { buildLocalContractFromEvidence } from "../../engines/governance";
import { eventBus, nextId } from "../../app/eventBus";
import type { GovernanceEvent } from "../../domain/types";

export default function UserGovernanceNew() {
  const { userId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const s = useGovernance();
  const evidenceId = params.get("证据");
  const 证据 = evidenceId ? s.evidence[evidenceId] : undefined;

  const [predicate, setPredicate] = React.useState({
    taskType: 证据?.context.taskType ?? "official_filing",
    sourceRequirement: 证据?.context.sourceRequirement ?? "official",
  });
  const [relation, setRelation] = React.useState({
    type: "PRIORITY", source: "skill-ir-search", target: "skill-web-search",
  });
  const [validating, setValidating] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const preview = React.useMemo(() => {
    const matchedAgents = 1;
    const matchedTasks = 4;
    const blocked = relation.type === "EXCLUSION"
      && relation.source === "skill-web-search"
      && relation.target === "skill-ir-search"
      && predicate.taskType === "official_filing";
    return { matchedAgents, matchedTasks, blocked };
  }, [predicate, relation]);

  const save = async () => {
    setError(undefined);
    setValidating(true);
    await new Promise(r => setTimeout(r, 700));
    if (preview.blocked) {
      setError("BLOCKED BY GLOBAL INVARIANT: local rule cannot relax the official_filing priority.");
      setValidating(false);
      return;
    }
    let contract;
    if (证据) {
      contract = buildLocalContractFromEvidence(证据);
      contract.predicate = [
        { field: "taskType", operator: "EQUALS", value: predicate.taskType },
        { field: "sourceRequirement", operator: "EQUALS", value: predicate.sourceRequirement },
      ];
      contract.relations = [{
        type: relation.type as never,
        sourceSkillId: relation.source,
        targetSkillId: relation.target,
      }];
    } else {
      contract = {
        id: `LC-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
        domain: "LOCAL" as const,
        ownerId: userId,
        contractType: "REFINEMENT" as const,
        state: "ACTIVE" as const,
        title: `本地规则 · ${predicate.taskType}`,
        summary: `${relation.source} > ${relation.target}`,
        predicate: [
          { field: "taskType", operator: "EQUALS" as const, value: predicate.taskType },
          { field: "sourceRequirement", operator: "EQUALS" as const, value: predicate.sourceRequirement },
        ],
        relations: [{
          type: relation.type as never,
          sourceSkillId: relation.source,
          targetSkillId: relation.target,
        }],
        scope: { userIds: [userId!] },
        overridePermission: true,
        dependencies: {
          parentContractId: "GC-1014",
          skillVersions: { [relation.source]: s.skills[relation.source]?.version ?? "1.0", [relation.target]: s.skills[relation.target]?.version ?? "1.0" },
          relationships: [{ type: relation.type as never, sourceSkillId: relation.source, targetSkillId: relation.target }],
          contextSchemas: [predicate.taskType],
        },
        originEvidenceIds: evidenceId ? [evidenceId] : [],
        parentVersion: s.globalVersion,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    s.addLocalContract(contract);
    if (证据) s.updateEvidence(证据.id, { localContractId: contract.id });
    const evt: GovernanceEvent = {
      eventId: nextId("evt"), eventType: "LOCAL_CONTRACT_CREATED",
      timestamp: Date.now(), sourceDomain: "USER", sourceId: eventBus.id,
      targetDomain: "ALL", correlationId: nextId("corr"),
      globalVersion: s.globalVersion, payload: { contract },
    };
    s.emit(evt);
    setValidating(false);
    navigate(`/user/${userId}/governance`);
  };

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-[1100px] mx-auto p-6 space-y-5">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
          <button className="link-quiet" onClick={() => navigate(-1)}>返回</button>
          <Icon name="ChevronR" size={12} /><span>New Local Governance</span>
        </div>
        <h1 className="text-[22px] font-bold text-ink-900">Local Governance Builder</h1>

        {证据 && (
          <Card>
            <SectionTitle icon="Inbox" title="来源 证据" subtitle={证据.id} />
            <p className="text-[12.5px] text-ink-600">{证据.violationType}</p>
          </Card>
        )}

        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 lg:col-span-7 space-y-4">
            <SectionTitle icon="FileCode" title="规则 Builder" />

            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">WHEN</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={predicate.taskType}
                  onChange={e => setPredicate(p => ({ ...p, taskType: e.target.value }))}
                  className="h-9 px-3 rounded-lg border border-ink-200 text-[13px] mono focus:border-brand-400 outline-none" />
                <input value={predicate.sourceRequirement}
                  onChange={e => setPredicate(p => ({ ...p, sourceRequirement: e.target.value }))}
                  className="h-9 px-3 rounded-lg border border-ink-200 text-[13px] mono focus:border-brand-400 outline-none" />
              </div>
            </div>

            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">THEN</p>
              <select value={relation.type}
                onChange={e => setRelation(r => ({ ...r, type: e.target.value }))}
                className="h-9 px-3 rounded-lg border border-ink-200 text-[13px] w-full mb-2">
                <option value="PRIORITY">Priority</option>
                <option value="EXCLUSION">Exclusion</option>
                <option value="ORDER">Order</option>
                <option value="FALLBACK">Fallback</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={relation.source}
                  onChange={e => setRelation(r => ({ ...r, source: e.target.value }))}
                  className="h-9 px-3 rounded-lg border border-ink-200 text-[13px] mono">
                  {Object.values(s.skills).map(sk => <option key={sk.id} value={sk.id}>{sk.name}</option>)}
                </select>
                <select value={relation.target}
                  onChange={e => setRelation(r => ({ ...r, target: e.target.value }))}
                  className="h-9 px-3 rounded-lg border border-ink-200 text-[13px] mono">
                  {Object.values(s.skills).map(sk => <option key={sk.id} value={sk.id}>{sk.name}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <div className="col-span-12 lg:col-span-5 space-y-5">
            <Card>
              <SectionTitle icon="Pulse" title="Effective Impact Preview" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Agents" value={preview.matchedAgents} />
                <Metric label="Tasks" value={preview.matchedTasks} />
                <Metric label="Blocked" value={preview.blocked ? "Yes" : "No"} tone={preview.blocked ? "rose" : "emerald"} />
              </div>
              {preview.blocked && (
                <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 mt-3">
                  This rule conflicts with an active global invariant.
                </p>
              )}
            </Card>

            <Card>
              <SectionTitle icon="Git" title="依赖 Preview" />
              <ul className="text-[12px] space-y-1.5 text-ink-700">
                <li>父版本 Global: <span className="mono text-brand-700">GC-1014 ({s.globalVersion})</span></li>
                <li>Skill Versions: <span className="mono">{relation.source}@{s.skills[relation.source]?.version}, {relation.target}@{s.skills[relation.target]?.version}</span></li>
                <li>Relationship: <span className="mono">{relation.type}</span></li>
                <li>Context Schema: <span className="mono">{predicate.taskType}</span></li>
              </ul>
              <p className="text-[11.5px] text-ink-500 mt-2">
                This dependency lets future global changes determine whether this local rule must be revalidated.
              </p>
            </Card>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12.5px] text-rose-800">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-4 card p-3 flex items-center gap-2 shadow-pop">
          <Button variant="ghost" onClick={() => navigate(-1)}>取消</Button>
          <div className="ml-auto" />
          <Button variant="primary" icon="Check" onClick={save} disabled={validating}>
            {validating ? "Validating…" : "Create Local 契约"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const Metric: React.FC<{ label: string; value: string | number; tone?: string }> = ({ label, value, tone = "brand" }) => {
  const map: Record<string,string> = {
    brand: "text-brand-700", emerald: "text-emerald-700", rose: "text-rose-700",
  };
  return (
    <div className="p-3 rounded-xl bg-ink-50 border border-ink-100">
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`text-[20px] font-bold mono leading-none mt-1 ${map[tone]}`}>{value}</p>
    </div>
  );
};
