import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Button, Card, Drawer, Empty, SectionTitle, StateBadge } from "../../components/common/UI";
import { Icon } from "../../components/common/Icons";
import { humanRelation } from "../../engines/governance";

const TABS = ["生效中","待重验证","重验证中","生效中 Refinement","冲突","已退役"] as const;

export default function UserGovernance() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const localContracts = useGovernance(s => s.localContracts);
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("生效中");
  const [selected, setSelected] = React.useState<string>();

  const mine = React.useMemo(
    () => Object.values(localContracts).filter(c => c.ownerId === userId),
    [localContracts, userId]
  );
  const filtered = mine.filter(c => {
    if (tab === "生效中") return c.state === "ACTIVE";
    if (tab === "待重验证") return c.state === "STALE";
    if (tab === "重验证中") return c.state === "REVALIDATING";
    if (tab === "生效中 Refinement") return c.state === "ACTIVE_REFINEMENT";
    if (tab === "冲突") return c.state === "CONFLICT";
    if (tab === "已退役") return c.state === "RETIRED";
    return true;
  });

  const counts = Object.fromEntries(TABS.map(t => [t, mine.filter(c => stateTab(c.state) === t).length]));

  const selected契约 = selected ? localContracts[selected] : undefined;

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-6 space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-ink-900">我的治理</h1>
            <p className="text-[13px] text-ink-500 mt-0.5">Local contracts scoped to this user · lifecycle managed automatically.</p>
          </div>
          <Button variant="primary" icon="Plus" onClick={() => navigate(`/user/${userId}/governance/new`)}>
            New Local 规则
          </Button>
        </div>

        <div className="flex items-center gap-1 border-b border-ink-200 overflow-x-auto scroll-thin">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative px-4 h-10 text-[13px] font-medium whitespace-nowrap transition-colors
                ${tab === t ? "text-brand-700" : "text-ink-500 hover:text-ink-800"}`}>
              {t}
              <span className="ml-2 text-[11px] mono text-ink-400">{counts[t] ?? 0}</span>
              {tab === t && (
                <motion.span layoutId="ug-tab"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-brand-600 rounded-t-sm" />
              )}
            </button>
          ))}
        </div>

        <Card pad={false}>
          {filtered.length === 0 ? (
            <Empty icon="Shield" title={`No ${tab.toLowerCase()} contracts`}
                   body="本地规则s appear here after runtime 证据 is promoted to local governance." />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
                  <th className="px-4 py-2.5 font-semibold">契约</th>
                  <th className="px-4 py-2.5 font-semibold">规则</th>
                  <th className="px-4 py-2.5 font-semibold">父版本</th>
                  <th className="px-4 py-2.5 font-semibold">状态</th>
                  <th className="px-4 py-2.5 font-semibold">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}
                      onClick={() => setSelected(c.id)}
                      className="border-b border-ink-50 last:border-b-0 hover:bg-ink-50/60 cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-mono text-[12px] font-semibold text-ink-800">{c.id}</p>
                      <p className="text-[11.5px] text-ink-500 truncate max-w-[200px]">{c.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.relations.map((r, i) => (
                        <span key={i} className="chip mr-1">{humanRelation(r)}</span>
                      ))}
                    </td>
                    <td className="px-4 py-3 mono text-[11.5px] text-ink-500">{c.parentVersion ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StateBadge state={c.state} />
                    </td>
                    <td className="px-4 py-3 text-[11.5px] text-ink-500 mono">
                      {new Date(c.updatedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Drawer
        open={!!selected契约}
        onClose={() => setSelected(undefined)}
        title={selected契约?.id}
        subtitle={selected契约?.title}
        width={600}
      >
        {selected契约 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StateBadge state={selected契约.state} />
              <span className="chip chip-slate mono">{selected契约.contractType}</span>
            </div>
            <p className="text-[13px] text-ink-700">{selected契约.summary}</p>

            <Section title="Predicate" />
            <div className="space-y-1">
              {selected契约.predicate.map((p, i) => (
                <div key={i} className="text-[12.5px] mono bg-ink-50 border border-ink-100 rounded-lg px-3 py-1.5">
                  {p.field} {p.operator.toLowerCase()} {JSON.stringify(p.value)}
                </div>
              ))}
            </div>

            <Section title="Relations" />
            <div className="space-y-1">
              {selected契约.relations.map((r, i) => (
                <div key={i} className="text-[12.5px] mono bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-1.5">
                  {humanRelation(r)}
                </div>
              ))}
            </div>

            {selected契约.dependencies && (
              <>
                <Section title="依赖" />
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <Dep k="父版本" v={selected契约.dependencies.parentContractId} />
                  <Dep k="Context" v={selected契约.dependencies.contextSchemas.join(", ")} />
                  <Dep k="技能" v={Object.entries(selected契约.dependencies.skillVersions).map(([k,v]) => `${k.replace("skill-","")}@${v}`).join(", ")} />
                </div>
              </>
            )}

            {selected契约.state === "CONFLICT" && (
              <Button variant="primary" icon="ArrowR" block
                onClick={() => navigate(`/user/${userId}/conflicts/${selected契约.id}`)}>
                Open 冲突 Resolver
              </Button>
            )}
            {selected契约.state === "STALE" && (
              <Button variant="primary" icon="ArrowR" block
                onClick={() => navigate(`/user/${userId}/revalidation/${selected契约.id}`)}>
                Run Revalidation
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function stateTab(s: string) {
  if (s === "ACTIVE_REFINEMENT") return "生效中 Refinement";
  if (s === "RETIRED") return "已退役";
  if (s === "STALE") return "待重验证";
  if (s === "REVALIDATING") return "重验证中";
  if (s === "CONFLICT") return "冲突";
  return "生效中";
}
const Section: React.FC<{ title: string }> = ({ title }) => (
  <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mt-2">{title}</p>
);
const Dep: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="p-2 rounded-lg bg-ink-50 border border-ink-100">
    <p className="text-[10px] uppercase tracking-wider text-ink-500">{k}</p>
    <p className="mono text-[11.5px] text-ink-800 break-all">{v}</p>
  </div>
);
