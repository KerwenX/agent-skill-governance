// Six required animation components — V4.0 sections 11–26
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// EventPulse — source glow → particle → target glow → counter
// ============================================================
export const EventPulse: React.FC<{
  active: boolean;
  sourceEl?: HTMLElement | null;
  targetEl?: HTMLElement | null;
  color?: string;
  onDone?: () => void;
}> = ({ active, color = "#3B62E0", onDone }) => {
  React.useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => onDone?.(), 800);
    return () => clearTimeout(t);
  }, [active, onDone]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ scale: 0.4, opacity: 0.7 }}
          animate={{ scale: 2.6, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="pointer-events-none fixed z-[80] w-4 h-4 rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}cc 0%, ${color}00 70%)`,
            left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </AnimatePresence>
  );
};

// ============================================================
// 状态Morph — smooth badge transition (handled in StateBadge,
// but this is a generic morph wrapper for inline text)
// ============================================================
export const 状态Morph: React.FC<{ value: string; className?: string }> = ({ value, className = "" }) => (
  <span className={`inline-block relative ${className}`}>
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
        transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
        className="inline-block"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </span>
);

// ============================================================
// 依赖Wave — global change → edges activate → locals light
// ============================================================
export const 依赖Wave: React.FC<{
  active: boolean;
  sourcePosition: { x: number; y: number };
  targets: { x: number; y: number }[];
  onDone?: () => void;
}> = ({ active, sourcePosition, targets, onDone }) => {
  React.useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => onDone?.(), 1600);
    return () => clearTimeout(t);
  }, [active, onDone]);

  if (!active) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 w-full h-full z-20">
      {targets.map((t, i) => (
        <line
          key={i}
          x1={sourcePosition.x} y1={sourcePosition.y}
          x2={t.x} y2={t.y}
          stroke="#3B62E0"
          strokeWidth={1.6}
          strokeDasharray="6 8"
          fill="none"
          className="edge-flow"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </svg>
  );
};

// ============================================================
// GovernanceDiff — ± lines with insert/remove highlight
// ============================================================
export const GovernanceDiff: React.FC<{
  lines: { sign: "+" | "-" | "="; text: string }[];
}> = ({ lines }) => (
  <div className="rounded-xl border border-ink-200 overflow-hidden bg-ink-50/60 font-mono text-[12.5px]">
    {lines.map((l, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.12, duration: 0.28 }}
        className={`flex items-start gap-2 px-3 py-1.5
          ${l.sign === "+" ? "bg-emerald-50/70 text-emerald-800" : ""}
          ${l.sign === "-" ? "bg-rose-50/70 text-rose-800 line-through decoration-rose-400/60" : ""}
          ${l.sign === "=" ? "text-ink-600" : ""}`}
      >
        <span className="w-3 shrink-0 opacity-70">{l.sign}</span>
        <span>{l.text}</span>
      </motion.div>
    ))}
  </div>
);

// ============================================================
// LineageTrail — vertical chain of nodes (证据 → Cluster → ...)
// ============================================================
export const LineageTrail: React.FC<{
  nodes: { id: string; label: string; sub?: string; active?: boolean; tone?: "brand" | "emerald" | "amber" | "violet" | "slate" }[];
  onNodeClick?: (id: string) => void;
}> = ({ nodes, onNodeClick }) => {
  const tones: Record<string, string> = {
    brand:   "bg-brand-50 border-brand-200 text-brand-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
    violet:  "bg-violet-50 border-violet-200 text-violet-700",
    slate:   "bg-ink-100 border-ink-200 text-ink-700",
  };
  return (
    <div className="relative pl-2">
      {nodes.map((n, i) => (
        <div key={n.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < nodes.length - 1 && (
            <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-brand-300 to-ink-200" />
          )}
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.12, duration: 0.3 }}
            onClick={() => onNodeClick?.(n.id)}
            className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold
                        ${tones[n.tone ?? "brand"]} ${n.active ? "ring-4 ring-brand-200" : ""}`}
          >
            {i + 1}
          </motion.button>
          <div className="pt-1">
            <p className="text-[13px] font-semibold text-ink-900">{n.label}</p>
            {n.sub && <p className="text-[11.5px] text-ink-500 font-mono">{n.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// ScoreTransition — count up with threshold crossing flash
// ============================================================
export const ScoreTransition: React.FC<{
  value: number;
  threshold?: number;
  label?: string;
  digits?: number;
}> = ({ value, threshold = 0.75, label, digits = 2 }) => {
  const [display, setDisplay] = React.useState(0);
  const prev = React.useRef(0);
  const [flash, setFlash] = React.useState(false);

  React.useEffect(() => {
    const start = prev.current;
    const startTime = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startTime) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  React.useEffect(() => {
    if (prev.current < threshold && value >= threshold) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1400);
      return () => clearTimeout(t);
    }
  }, [value, threshold]);

  const crossed = value >= threshold;
  return (
    <div className="relative inline-flex items-baseline gap-2">
      {label && <span className="text-[11.5px] text-ink-500 uppercase tracking-wider font-medium">{label}</span>}
      <motion.span
        className={`mono text-[22px] font-semibold tabular-nums
          ${crossed ? "text-emerald-600" : "text-ink-800"}
          ${flash ? "drop-shadow-[0_0_12px_rgba(16,185,129,.6)]" : ""}`}
        animate={flash ? { scale: [1, 1.12, 1] } : {}}
        transition={{ duration: 0.6 }}
      >
        {display.toFixed(digits)}
      </motion.span>
      {threshold > 0 && (
        <span className="text-[11px] text-ink-400 mono">/ {threshold.toFixed(2)}</span>
      )}
    </div>
  );
};

// ============================================================
// Funnel — for propagation results (29 → 21/6/2)
// ============================================================
export const Funnel: React.FC<{
  stages: { label: string; value: number; color: string }[];
  total: number;
}> = ({ stages, total }) => (
  <div className="space-y-2">
    {stages.map((s, i) => {
      const pct = total > 0 ? s.value / total : 0;
      return (
        <div key={s.label} className="flex items-center gap-3">
          <div className="w-32 text-[12.5px] text-ink-700 font-medium">{s.label}</div>
          <div className="flex-1 h-7 bg-ink-100 rounded-md overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.18, ease: [0.2, 0.7, 0.2, 1] }}
              className={`h-full ${s.color} flex items-center justify-end px-2 text-white text-[12px] font-mono`}
            >
              {s.value}
            </motion.div>
          </div>
        </div>
      );
    })}
  </div>
);

// ============================================================
// Edge connector (animated dash) — reusable
// ============================================================
export const AnimatedEdge: React.FC<{
  active?: boolean;
  direction?: "right" | "down";
  label?: string;
}> = ({ active = true, direction = "right", label }) => (
  <div className={`flex items-center ${direction === "down" ? "flex-col h-8" : ""} text-ink-400`}>
    {direction === "right" ? (
      <div className="flex-1 flex items-center">
        <div className="flex-1 h-px border-t border-dashed border-ink-300" />
        <motion.svg width="20" height="10" viewBox="0 0 20 10"
          animate={active ? { x: [0, 6, 0] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M0 5 L18 5 M13 1 L18 5 L13 9" stroke="currentColor" strokeWidth="1.4" fill="none" />
        </motion.svg>
        {label && <span className="ml-1 text-[10.5px] font-mono text-ink-500">{label}</span>}
      </div>
    ) : (
      <>
        <div className="w-px h-full border-l border-dashed border-ink-300" />
        <motion.svg width="10" height="20" viewBox="0 0 10 20"
          animate={active ? { y: [0, 6, 0] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M5 0 L5 18 M1 13 L5 18 L9 13" stroke="currentColor" strokeWidth="1.4" fill="none" />
        </motion.svg>
      </>
    )}
  </div>
);
