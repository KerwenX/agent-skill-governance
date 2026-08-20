import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGovernance } from "../../store/governance";
import { Button, Card, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { GovernanceDiff } from "../../components/animations/Animations";
import { humanRelation } from "../../engines/governance";
import { buildPublish, applyPublish } from "../../engines/publishing";

export default function DevContractEditor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const candidateId = params.get("candidate");
  const s = useGovernance();

  const candidate = candidateId ? s.candidates[candidateId] : undefined;
  const cluster = candidate ? s.clusters[candidate.clusterId] : undefined;

  const [publishing, setPublishing] = React.useState(false);

  const pub = React.useMemo(
    () => (candidate ? buildPublish(s, candidate) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidate, s.globalVersion, s.localContracts, s.globalContracts],
  );

  if (!candidate || !cluster || !pub) {
    return (
      <Card>
        <p className="text-[13px] text-ink-600">没有可发布的候选规则。请先在收件箱批准一条候选。</p>
        <Button className="mt-2" onClick={() => navigate("/developer/inbox")}>返回收件箱</Button>
      </Card>
    );
  }

  const { contract: draft, changeSet: preview } = pub;
  const fromVer = preview.fromVersion;
  const toVer = preview.toVersion;
  const affectedCount = preview.affectedContractIds.length;

  const publish = async () => {
    setPublishing(true);
    applyPublish(s, pub, candidate);
    navigate(`/developer/propagation/${preview.id}`);
  };

  const diffLines = [
    ...draft.predicate.map(p => ({ sign: "+" as const, text: `WHEN ${p.field} ${p.operator.toLowerCase().replace("_"," ")} ${JSON.stringify(p.value)}` })),
    ...draft.relations.map(r => ({ sign: "+" as const, text: `THEN ${humanRelation(r, s.skills)}` })),
  ];

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[12.5px] text-ink-500 shrink-0">
        <button className="link-quiet" onClick={() => navigate(-1)}>返回</button>
        <Icon name="ChevronR" size={12} /> <span>发布全局契约</span>
      </div>
      <div className="flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-[20px] font-bold text-ink-900">全局契约编辑器</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">Candidate {candidate.id} · cluster {cluster.id}</p>
        </div>
        <StateBadge state={candidate.state} />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col gap-3 min-h-0 overflow-y-auto scroll-thin">
          <SectionTitle icon="FileCode" title="治理规则" />
          <div>
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">规则等级</p>
            <div className="flex items-center gap-2">
              <span className={`chip ${draft.contractType === "DEFAULT" ? "chip-brand" : "chip-rose"}`}>
                {draft.contractType === "DEFAULT" ? "Global Default" : "Global Invariant"}
              </span>
              <span className="text-[12px] text-ink-500">
                {draft.contractType === "DEFAULT"
                  ? "本地契约可用上下文条件细化。"
                  : "本地契约不可放宽此约束（overridePermission=false）。"}
              </span>
            </div>
          </div>
          <GovernanceDiff lines={diffLines} />
          <div>
            <p className="text-[11.5px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">规则摘要</p>
            <p className="text-[12.5px] text-ink-700">{draft.summary}</p>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col gap-3 min-h-0">
          <SectionTitle icon="Git" title="版本预览" />
          <div className="flex items-center gap-3 text-center">
            <div className="flex-1 p-3 rounded-xl bg-ink-50 border border-ink-100">
              <p className="text-[10.5px] uppercase tracking-wider text-ink-500">从</p>
              <p className="text-[20px] font-bold mono text-ink-700">{fromVer}</p>
            </div>
            <Icon name="ArrowR" size={18} className="text-ink-400" />
            <div className="flex-1 p-3 rounded-xl bg-brand-50 border border-brand-200">
              <p className="text-[10.5px] uppercase tracking-wider text-brand-700">至</p>
              <p className="text-[20px] font-bold mono text-brand-800">{toVer}</p>
            </div>
          </div>
          <SectionTitle icon="Network" title="影响摘要" className="!mt-2" />
          <div className="grid grid-cols-2 gap-2 text-[12.5px]">
            <Impact label="受影响" value={affectedCount} color="text-amber-700 bg-amber-50 border-amber-200" />
            <Impact label="未受影响" value={s.platformStats.localContractsObserved - affectedCount} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
          </div>
          {preview.changedSkills.length > 0 && (
            <div className="text-[11.5px] text-ink-600">
              <span className="font-semibold">技能版本变更：</span>
              {preview.changedSkills.join(", ")}
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
            <ul className="text-[12px] text-ink-600 space-y-1 list-disc pl-4">
              {Object.values(s.localContracts)
                .filter(l => preview.affectedContractIds.includes(l.id))
                .slice(0, 6)
                .map(l => (
                  <li key={l.id} className="mono">
                    {l.id} <span className="text-ink-400">· {l.title}</span>
                  </li>
                ))}
              {affectedCount === 0 && <li className="text-ink-400 list-none">无受影响本地契约。</li>}
            </ul>
          </div>
        </Card>
      </div>

      <div className="shrink-0 card p-3 flex items-center gap-2 shadow-pop">
        <Button variant="ghost" onClick={() => navigate(-1)}>取消</Button>
        <div className="ml-auto" />
        <Button variant="primary" icon="Bolt" onClick={publish} disabled={publishing}>
          {publishing ? "发布中…" : `发布 ${toVer}`}
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
