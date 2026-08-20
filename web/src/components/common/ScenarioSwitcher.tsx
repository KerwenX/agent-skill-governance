import React from "react";
import { useNavigate } from "react-router-dom";
import { useGovernance } from "../../store/governance";
import { SCENARIOS } from "../../fixtures/scenarios/registry";
import { Icon } from "./Icons";

/** Compact scenario selector used in the shell topbar. */
export default function ScenarioSwitcher({ compact = false }: { compact?: boolean }) {
  const scenarioId = useGovernance(s => s.scenarioId);
  const role = useGovernance(s => s.role);
  const userId = useGovernance(s => s.userId);
  const loadScenario = useGovernance(s => s.loadScenario);
  const navigate = useNavigate();

  const onChange = (id: string) => {
    loadScenario(id);
    // Stay within the same surface after switching.
    if (role === "developer") navigate(`/developer?scenario=${id}`);
    else if (role === "user" && userId) navigate(`/user/${userId}?scenario=${id}`);
  };

  return (
    <label className={`flex items-center gap-2 ${compact ? "" : "px-2"}`}>
      <Icon name="Spark" size={14} className="text-brand-600 shrink-0" />
      {!compact && <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">实施例</span>}
      <select
        value={scenarioId}
        onChange={e => onChange(e.target.value)}
        className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[12.5px] font-medium text-ink-800 outline-none focus:border-brand-400 max-w-[200px]"
      >
        {SCENARIOS.map(s => (
          <option key={s.id} value={s.id}>E2E-0{s.index} · {s.shortTitle}</option>
        ))}
      </select>
    </label>
  );
}
