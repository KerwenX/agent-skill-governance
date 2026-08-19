import React from "react";
import { useGovernance } from "../../store/governance";
import { Card, Empty, SectionTitle } from "../../components/common/UI";

export default function UserHistory() {
  const 证据 = useGovernance(s => s.evidence);
  const localContracts = useGovernance(s => s.localContracts);
  const userId = useGovernance(s => s.userId);

  const my证据 = Object.values(证据).filter(e => e.userId === userId)
    .sort((a,b) => b.createdAt - a.createdAt);
  const myLocal = Object.values(localContracts).filter(c => c.ownerId === userId)
    .sort((a,b) => b.updatedAt - a.updatedAt);

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">My 历史记录</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">Your 证据 and local governance activity.</p>
        </div>
        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 md:col-span-7">
            <SectionTitle title="Recent 证据" />
            {my证据.length === 0 && <Empty title="No 证据 yet" />}
            <div className="space-y-2">
              {my证据.map(e => (
                <div key={e.id} className="p-3 rounded-lg border border-ink-200 bg-white">
                  <p className="mono text-[12px] font-semibold text-brand-700">{e.id}</p>
                  <p className="text-[12.5px] text-ink-800">{e.violationType}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {new Date(e.createdAt).toLocaleString()} · parent {e.parentGlobalVersion}
                  </p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="col-span-12 md:col-span-5">
            <SectionTitle title="Local 契约s" />
            {myLocal.length === 0 && <Empty title="No local contracts" />}
            <div className="space-y-2">
              {myLocal.map(c => (
                <div key={c.id} className="p-3 rounded-lg border border-ink-200 bg-white">
                  <p className="mono text-[12px] font-semibold text-ink-800">{c.id}</p>
                  <p className="text-[12px] text-ink-600 truncate">{c.title}</p>
                  <p className="text-[11px] text-ink-400 mt-0.5">{c.state}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
