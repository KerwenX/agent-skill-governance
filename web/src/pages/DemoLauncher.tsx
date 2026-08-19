import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGovernance } from "../store/governance";
import { usePresentation } from "../store/presentation";
import { Button, Card, SectionTitle } from "../components/common/UI";
import { Icon } from "../components/common/Icons";
import { broadcastReset, DEMO_SCRIPT, sendCommand, type Target } from "../app/demoScript";
import { orchestrator } from "../app/animations";
import { eventBus } from "../app/eventBus";

const USERS = [
  { id: "user-a", name: "林 · 分析师",    initials: "林", color: "#5B82F6" },
  { id: "user-b", name: "陈 · 投研助理", initials: "陈", color: "#8B5CF6" },
  { id: "user-c", name: "周 · 交易员",    initials: "周", color: "#F59E0B" },
];

export default function DemoLauncher() {
  const resetAll = useGovernance(s => s.resetAll);
  const speed = usePresentation(s => s.playbackSpeed);
  const setSpeed = usePresentation(s => s.setSpeed);

  const [playing, setPlaying] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(-1);
  const [windowsOpen, setWindowsOpen] = React.useState(false);
  const [log, setLog] = React.useState<{ id: number; text: string; focus?: Target }[]>([]);
  const cancelRef = React.useRef(false);
  const logIdRef = React.useRef(0);

  const openWindows = () => {
    if (windowsOpen) return;
    const opts = "width=560,height=940,menubar=no,toolbar=no";
    window.open("/developer", "skillos-developer", "width=1440,height=940,menubar=no,toolbar=no");
    USERS.forEach(u => window.open(`/user/${u.id}`, `skillos-${u.id}`, opts));
    setWindowsOpen(true);
  };

  const pushLog = (text: string, focus?: Target) => {
    logIdRef.current += 1;
    setLog(l => [...l.slice(-30), { id: logIdRef.current, text, focus }]);
  };

  const stop = () => {
    cancelRef.current = true;
    setPlaying(false);
  };

  const play = async () => {
    if (playing) { stop(); return; }
    cancelRef.current = false;
    setPlaying(true);
    setLog([]);

    // 1. Reset state in all windows
    resetAll();
    broadcastReset();

    // 2. Open windows — MUST stay synchronous with the click gesture,
    //    otherwise browsers block the popups
    openWindows();
    pushLog("已打开开发者窗口与三个用户窗口。");
    await orchestrator.wait(700);
    await orchestrator.wait(1800);

    // 3. Walk through script
    for (let i = 0; i < DEMO_SCRIPT.length; i++) {
      if (cancelRef.current) break;
      const step = DEMO_SCRIPT[i];
      setStepIdx(i);
      pushLog(step.narration, step.focus);
      if (step.command && step.target) {
        sendCommand(step.target, step.command);
      }
      const wait = (step.wait ?? 2000) / speed;
      const t0 = performance.now();
      while (performance.now() - t0 < wait) {
        if (cancelRef.current) break;
        await new Promise(r => setTimeout(r, 80));
      }
    }

    setStepIdx(-1);
    setPlaying(false);
  };

  const focusLabels: Record<Target, string> = {
    launcher: "演示台", developer: "开发者端", "user-a": "User A", "user-b": "User B", "user-c": "User C", all: "全部",
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2,0.7,0.2,1] }}
        className="w-full max-w-[1280px]"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center shadow-pop">
            <Icon name="Shield" size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-ink-900 leading-tight">智能体 Skill 双端协同治理 · 引导演示</h1>
            <p className="text-[13px] text-ink-500 mt-0.5">
              证据上行 → 全局演化 → 依赖传播 → 局部消解。点击「开始演示」后将自动打开 4 个窗口并按剧本推进。
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="chip chip-brand">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {eventBus.id.slice(0,12)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Left: windows + controls */}
          <Card className="col-span-12 lg:col-span-5 space-y-5">
            <SectionTitle icon="Window" title="参演窗口" subtitle="开发者 1 个 + 用户 3 个" />
            <div className="grid grid-cols-2 gap-3">
              <WindowTile color="#2A48B8" label="开发者端" sub="/developer" big icon="Cog" active={playing} />
              {USERS.map(u => (
                <WindowTile key={u.id} color={u.color} label={u.name} sub={`/user/${u.id}`} initials={u.initials} active={playing} />
              ))}
            </div>

            <SectionTitle icon="Bolt" title="演示速度" className="!mt-6" />
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1, 1.5, 2].map(m => (
                <button key={m} onClick={() => setSpeed(m)}
                  className={`h-9 rounded-lg text-[12.5px] font-medium border transition-all
                    ${speed === m ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-700 border-ink-200 hover:border-brand-300"}`}>
                  {m}×
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
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

          {/* Right: script timeline + narration */}
          <Card className="col-span-12 lg:col-span-7 flex flex-col" >
            <SectionTitle icon="History" title="演示剧本" subtitle={`共 ${DEMO_SCRIPT.length} 步 · 约 2–3 分钟`} />

            {/* Live narration */}
            <AnimatePresence mode="wait">
              {stepIdx >= 0 && (
                <motion.div
                  key={stepIdx}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-violet-50 p-4 mb-4"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-brand-700">
                      第 {stepIdx + 1} 步 · 关注 {focusLabels[DEMO_SCRIPT[stepIdx].focus]}
                    </span>
                  </div>
                  <p className="text-[14px] text-ink-900 leading-relaxed">{DEMO_SCRIPT[stepIdx].narration}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto scroll-thin -mr-2 pr-2" style={{ maxHeight: 380 }}>
              <ol className="relative">
                {DEMO_SCRIPT.map((s, i) => {
                  const done = i < stepIdx;
                  const active = i === stepIdx;
                  return (
                    <li key={s.id} className="flex gap-3 pb-3 last:pb-0">
                      <div className="flex flex-col items-center">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 shrink-0
                          ${active ? "bg-brand-600 border-brand-600 text-white ring-4 ring-brand-100"
                            : done ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-ink-200 text-ink-400"}`}>
                          {done ? <Icon name="Check" size={12} /> : i + 1}
                        </span>
                        {i < DEMO_SCRIPT.length - 1 && (
                          <span className={`w-px flex-1 my-1 ${done ? "bg-emerald-300" : "bg-ink-200"}`} style={{ minHeight: 14 }} />
                        )}
                      </div>
                      <div className="min-w-0 pb-1">
                        <p className={`text-[12.5px] leading-snug ${active ? "text-ink-900 font-medium" : done ? "text-ink-600" : "text-ink-400"}`}>
                          {s.narration}
                        </p>
                        <p className="text-[10.5px] mono text-ink-400 mt-0.5">→ {focusLabels[s.focus]}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Log */}
            {log.length > 0 && (
              <div className="mt-3 pt-3 border-t border-ink-100">
                <p className="text-[10.5px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5">事件日志</p>
                <div className="space-y-1 max-h-24 overflow-y-auto scroll-thin">
                  {log.slice(-6).map(l => (
                    <p key={l.id} className="text-[11.5px] text-ink-600 flex gap-2">
                      <span className="mono text-ink-400">[{new Date().toLocaleTimeString()}]</span>
                      {l.focus && <span className="chip chip-slate !py-0 !px-1.5 text-[10px]">{focusLabels[l.focus]}</span>}
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

const WindowTile: React.FC<{
  color: string; label: string; sub: string; icon?: React.ComponentProps<typeof Icon>["name"];
  initials?: string; big?: boolean; active?: boolean;
}> = ({ color, label, sub, icon, initials, big, active }) => (
  <div className={`relative p-3 rounded-xl border-2 transition-colors ${active ? "border-brand-300 bg-brand-50/40" : "border-ink-200 bg-white"}`}>
    <div className="flex items-center gap-2.5">
      <div className={`${big ? "w-10 h-10" : "w-9 h-9"} rounded-xl flex items-center justify-center text-white font-bold`}
           style={{ background: `linear-gradient(135deg, ${color}, #8B5CF6)` }}>
        {icon ? <Icon name={icon} size={18} /> : <span className="text-[13px]">{initials}</span>}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink-900 truncate">{label}</p>
        <p className="text-[11px] text-ink-500 mono truncate">{sub}</p>
      </div>
      {active && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
    </div>
  </div>
);
