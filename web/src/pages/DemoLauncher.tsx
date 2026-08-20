import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useGovernance } from "../store/governance";
import { usePresentation } from "../store/presentation";
import { Button, Card, SectionTitle } from "../components/common/UI";
import { Icon } from "../components/common/Icons";
import { SCENARIOS } from "../fixtures/scenarios/registry";
import { DEMO_SCRIPTS, broadcastReset, sendCommand, type DemoWindow, type Target } from "../app/demoScript";
import { orchestrator } from "../app/animations";
import { eventBus } from "../app/eventBus";

export default function DemoLauncher() {
  const [params, setParams] = useSearchParams();
  const resetAll = useGovernance(s => s.resetAll);
  const loadScenario = useGovernance(s => s.loadScenario);
  const speed = usePresentation(s => s.playbackSpeed);
  const setSpeed = usePresentation(s => s.setSpeed);

  const presentation = params.get("mode") === "presentation";
  const noWindows = params.get("noWindows") === "1";
  const initialScenario = params.get("scenario") ?? SCENARIOS[0].id;
  const [scenarioId, setScenarioId] = React.useState(initialScenario);
  const script = DEMO_SCRIPTS[scenarioId] ?? DEMO_SCRIPTS[SCENARIOS[0].id];
  const scenario = SCENARIOS.find(s => s.id === scenarioId)!;

  const [playing, setPlaying] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(-1);
  const [windowsOpen, setWindowsOpen] = React.useState(false);
  const [log, setLog] = React.useState<{ id: number; text: string; focus?: string }[]>([]);
  const cancelRef = React.useRef(false);
  const logIdRef = React.useRef(0);

  // Expose script + controls for Playwright automation.
  React.useEffect(() => {
    (window as unknown as { __skillos?: unknown }).__skillos = {
      ...((window as unknown as { __skillos?: Record<string, unknown> }).__skillos ?? {}),
      demoScript: script,
      scenarios: SCENARIOS,
      selectScenario: (id: string) => { setScenarioId(id); loadScenario(id); },
    };
    document.documentElement.dataset.demoScenario = scenarioId;
  }, [script, scenarioId, loadScenario]);

  const chooseScenario = (id: string) => {
    setScenarioId(id);
    loadScenario(id);
    const next = new URLSearchParams(params);
    next.set("scenario", id);
    setParams(next, { replace: true });
  };

  const openWindows = () => {
    if (windowsOpen) return;
    if (noWindows) { setWindowsOpen(true); return; }
    script.windows.forEach(w => {
      const url = w.kind === "developer" ? `/developer?scenario=${scenarioId}` : `${w.sub}?scenario=${scenarioId}`;
      window.open(url, `skillos-${w.key}`, `width=${w.w},height=${w.h},menubar=no,toolbar=no`);
    });
    setWindowsOpen(true);
  };

  const pushLog = (text: string, focus?: string) => {
    logIdRef.current += 1;
    setLog(l => [...l.slice(-40), { id: logIdRef.current, text, focus }]);
  };
  const stop = () => { cancelRef.current = true; setPlaying(false); };

  const play = async () => {
    if (playing) { stop(); return; }
    cancelRef.current = false;
    setPlaying(true); setLog([]);
    resetAll(); loadScenario(scenarioId); broadcastReset();
    openWindows();
    pushLog(`已打开 ${script.windows.length} 个窗口（${scenario.shortTitle}）。`);
    await orchestrator.wait(1800);

    for (let i = 0; i < script.steps.length; i++) {
      if (cancelRef.current) break;
      const step = script.steps[i];
      setStepIdx(i);
      document.documentElement.dataset.demoStep = step.id;
      pushLog(step.narration, step.focus);
      if (step.command && step.target) sendCommand(step.target, step.command);
      const wait = (step.wait ?? 2000) / speed;
      const t0 = performance.now();
      while (performance.now() - t0 < wait) {
        if (cancelRef.current) break;
        await new Promise(r => setTimeout(r, 80));
      }
    }
    setStepIdx(-1);
    delete document.documentElement.dataset.demoStep;
    setPlaying(false);
  };

  const focusLabels: Record<string, string> = {
    launcher: "演示台", developer: "开发者端", all: "全部",
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" data-demo-scenario={scenarioId}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-[1320px]">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center shadow-pop">
            <Icon name="Shield" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-ink-900 leading-tight">智能体 Skill 双端协同治理 · 引导演示</h1>
            <p className="text-[12.5px] text-ink-500 mt-0.5">证据上行 → 全局演化 → 依赖传播 → 局部消解。选择实施例后开始演示。</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="chip chip-brand">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {eventBus.id.slice(0, 10)}
            </span>
          </div>
        </div>

        {/* Scenario picker */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {SCENARIOS.map(s => {
            const active = s.id === scenarioId;
            return (
              <button key={s.id} onClick={() => chooseScenario(s.id)}
                className={`text-left p-3.5 rounded-2xl border-2 transition-all ${active ? "border-brand-400 bg-brand-50/60 shadow-ring" : "border-ink-200 bg-white hover:border-brand-300"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip chip-slate mono text-[10.5px]">E2E-0{s.index}</span>
                  <span className="text-[11px] text-ink-400">{s.industry}</span>
                </div>
                <p className="text-[13.5px] font-bold text-ink-900 leading-snug">{s.title}</p>
                <p className="text-[11.5px] text-ink-500 mt-1 leading-snug line-clamp-2">{s.summary}</p>
                <div className="flex items-center gap-2 mt-2 text-[10.5px] text-ink-400">
                  <span>{s.users.length} 个用户端</span><span>·</span>
                  <span>{s.publishes.length} 次全局发布</span><span>·</span>
                  <span className="mono">{s.initialVersion}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 lg:col-span-5 space-y-4">
            <SectionTitle icon="Window" title="参演窗口" subtitle={`开发者 1 + 用户 ${script.windows.filter(w => w.kind === "user").length}`} />
            <div className="grid grid-cols-2 gap-2.5">
              {script.windows.map(w => (
                <WindowTile key={w.key} w={w} active={playing} />
              ))}
            </div>

            <SectionTitle icon="Bolt" title="演示速度" className="!mt-4" />
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1, 1.5, 2].map(m => (
                <button key={m} onClick={() => setSpeed(m)}
                  className={`h-9 rounded-lg text-[12.5px] font-medium border transition-all
                    ${speed === m ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-700 border-ink-200 hover:border-brand-300"}`}>
                  {m}×
                </button>
              ))}
            </div>

            <div className="pt-1 flex items-center gap-2">
              {playing ? (
                <Button variant="danger" icon="Pause" block onClick={stop}>暂停演示</Button>
              ) : (
                <Button variant="primary" icon="Play" block onClick={play}>
                  {stepIdx >= 0 ? "继续演示" : "开始演示"}
                </Button>
              )}
              <Button variant="outline" icon="Reset" onClick={() => { stop(); resetAll(); broadcastReset(); setLog([]); setStepIdx(-1); }}>
                重置
              </Button>
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-7 flex flex-col min-h-[420px]">
            <SectionTitle icon="History" title="演示剧本" subtitle={`共 ${script.steps.length} 步`} />

            <AnimatePresence mode="wait">
              {stepIdx >= 0 && (
                <motion.div key={stepIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-violet-50 p-3.5 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <span className="text-[10.5px] uppercase tracking-wider font-semibold text-brand-700">
                      第 {stepIdx + 1} 步 · 关注 {focusLabels[script.steps[stepIdx].focus] ?? script.steps[stepIdx].focus}
                    </span>
                  </div>
                  <p className="text-[13px] text-ink-900 leading-relaxed">{script.steps[stepIdx].narration}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {!presentation && (
              <div className="flex-1 min-h-0 overflow-y-auto scroll-thin -mr-2 pr-2">
                <ol className="relative">
                  {script.steps.map((s, i) => {
                    const done = i < stepIdx;
                    const active = i === stepIdx;
                    return (
                      <li key={s.id} className="flex gap-3 pb-2.5 last:pb-0">
                        <div className="flex flex-col items-center">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-bold border-2 shrink-0
                            ${active ? "bg-brand-600 border-brand-600 text-white ring-4 ring-brand-100"
                              : done ? "bg-emerald-500 border-emerald-500 text-white"
                              : "bg-white border-ink-200 text-ink-400"}`}>
                            {done ? <Icon name="Check" size={11} /> : i + 1}
                          </span>
                          {i < script.steps.length - 1 && <span className={`w-px flex-1 my-0.5 ${done ? "bg-emerald-300" : "bg-ink-200"}`} />}
                        </div>
                        <div className="min-w-0 pb-0.5">
                          <p className={`text-[12px] leading-snug ${active ? "text-ink-900 font-medium" : done ? "text-ink-600" : "text-ink-400"}`}>{s.narration}</p>
                          <p className="text-[10px] mono text-ink-400 mt-0.5">→ {focusLabels[s.focus] ?? s.focus}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {log.length > 0 && !presentation && (
              <div className="mt-3 pt-3 border-t border-ink-100">
                <p className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5">事件日志</p>
                <div className="space-y-0.5 max-h-20 overflow-y-auto scroll-thin">
                  {log.slice(-5).map(l => (
                    <p key={l.id} className="text-[11px] text-ink-600 flex gap-2">
                      <span className="mono text-ink-400">[{new Date().toLocaleTimeString()}]</span>
                      {l.focus && <span className="chip chip-slate !py-0 !px-1.5 text-[9.5px]">{focusLabels[l.focus] ?? l.focus}</span>}
                      <span className="flex-1 truncate">{l.text}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

const WindowTile: React.FC<{ w: DemoWindow; active?: boolean }> = ({ w, active }) => (
  <div className={`relative p-2.5 rounded-xl border-2 transition-colors ${active ? "border-brand-300 bg-brand-50/40" : "border-ink-200 bg-white"}`}>
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
        style={{ background: `linear-gradient(135deg, ${w.color}, #8B5CF6)` }}>
        {w.kind === "developer" ? <Icon name="Cog" size={16} /> : <span className="text-[12px]">{w.initials}</span>}
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-ink-900 truncate">{w.label}</p>
        <p className="text-[10.5px] text-ink-500 mono truncate">{w.sub}</p>
      </div>
      {active && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
    </div>
  </div>
);
