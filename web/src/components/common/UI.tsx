// Common UI primitives
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon, IconName } from "./Icons";

// ============================================================
// Button
// ============================================================
type BtnVariant = "primary" | "ghost" | "soft" | "outline" | "danger";
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  icon?: IconName;
  iconRight?: IconName;
  size?: "sm" | "md";
  block?: boolean;
}> = ({ variant = "soft", icon, iconRight, size = "md", block, className = "", children, ...rest }) => {
  const cls = `btn-${variant}`;
  const sizing = size === "sm" ? "h-8 px-3 text-[12px]" : "h-9 px-3.5 text-[13px]";
  return (
    <button className={`${cls} ${sizing} ${block ? "w-full" : ""} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 15} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 13 : 15} />}
    </button>
  );
};

// ============================================================
// Card
// ============================================================
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { pad?: boolean }> =
({ pad = true, className = "", children, ...rest }) => (
  <div className={`card ${pad ? "p-5" : ""} ${className}`} {...rest}>{children}</div>
);

export const SectionTitle: React.FC<{ icon?: IconName; title: string; subtitle?: string; right?: React.ReactNode; className?: string }> =
({ icon, title, subtitle, right, className = "" }) => (
  <div className={`flex items-start justify-between gap-3 mb-3 ${className}`}>
    <div className="flex items-center gap-2 min-w-0">
      {icon && (
        <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-100">
          <Icon name={icon} size={15} />
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold text-ink-900 truncate">{title}</h3>
        {subtitle && <p className="text-[11.5px] text-ink-500 truncate">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

// ============================================================
// 状态 Badge (with morph)
// ============================================================
const STATE_STYLES: Record<string, string> = {
  ACTIVE:             "chip-emerald",
  STALE:              "chip-amber",
  REVALIDATING:       "chip-brand",
  RETIRED:            "chip-slate",
  ACTIVE_REFINEMENT:  "chip-violet",
  CONFLICT:           "chip-rose",
  PROMOTION_READY:    "chip-brand",
  CLUSTERED:          "chip-slate",
  EVALUATING:         "chip-amber",
  LOCAL_ONLY:         "chip-slate",
  CANDIDATE_CREATED:  "chip-brand",
  GENERATED:          "chip-slate",
  UNDER_REVIEW:       "chip-amber",
  APPROVED:           "chip-emerald",
  REJECTED:           "chip-rose",
  KEPT_LOCAL:         "chip-slate",
  NEEDS_MORE_EVIDENCE:"chip-amber",
  PUBLISHED:          "chip-emerald",
  DETECTED:           "chip-amber",
  STRUCTURED:         "chip-slate",
  LOCAL:              "chip-slate",
  LIVE:               "chip-emerald",
};

const STATE_LABEL: Record<string, string> = {
  ACTIVE: "生效中", STALE: "待重验证", REVALIDATING: "重验证中", RETIRED: "已退役",
  ACTIVE_REFINEMENT: "精化中", CONFLICT: "冲突", PROMOTION_READY: "可升级",
  CLUSTERED: "已聚类", EVALUATING: "评估中", LOCAL_ONLY: "仅本地", CANDIDATE_CREATED: "已生成候选",
  GENERATED: "已生成", UNDER_REVIEW: "审查中", APPROVED: "已批准", REJECTED: "已驳回",
  KEPT_LOCAL: "保留本地", NEEDS_MORE_EVIDENCE: "证据不足", PUBLISHED: "已发布",
  DETECTED: "已检测", STRUCTURED: "已结构化", LOCAL: "本地", LIVE: "实时",
  SUCCEEDED: "成功", ANOMALY_DETECTED: "异常", CORRECTED: "已修正",
  RUNNING: "运行中", IDLE: "空闲",
};

export const StateBadge: React.FC<{ state: string; pulse?: boolean; className?: string }> = ({ state, pulse, className = "" }) => {
  const cls = STATE_STYLES[state] ?? "chip-slate";
  const label = STATE_LABEL[state] ?? state.replace(/_/g, " ");
  return (
    <motion.span
      layout
      key={state}
      initial={{ opacity: 0, y: -4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      className={`chip ${cls} ${pulse ? "ring-2 ring-offset-1 ring-amber-300/50" : ""} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </motion.span>
  );
};

// ============================================================
// Drawer (right side, Layer 2)
// ============================================================
export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, subtitle, width = 520, children, footer }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          key="mask"
          className="fixed inset-0 bg-ink-900/30 backdrop-blur-[2px] z-40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
        />
        <motion.aside
          key="panel"
          className="fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-ink-200"
          style={{ width }}
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-ink-100">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-ink-900 leading-tight">{title}</h3>
              {subtitle && <p className="text-[12px] text-ink-500 mt-0.5">{subtitle}</p>}
            </div>
            <button className="btn-ghost h-8 w-8 !px-0 flex items-center justify-center" onClick={onClose} aria-label="Close">
              <Icon name="X" size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-5">{children}</div>
          {footer && <div className="border-t border-ink-100 p-4 bg-ink-50/60">{footer}</div>}
        </motion.aside>
      </>
    )}
  </AnimatePresence>
);

// ============================================================
// Modal (center, Layer 2)
// ============================================================
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, children, width = 560, footer }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        key="modal"
        className="fixed inset-0 z-[55] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
        <motion.div
          className="relative bg-white rounded-2xl shadow-pop w-full overflow-hidden"
          style={{ maxWidth: width }}
          initial={{ scale: 0.96, y: 8, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100">
            <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
            <button className="btn-ghost h-8 w-8 !px-0 flex items-center justify-center" onClick={onClose} aria-label="Close">
              <Icon name="X" size={16} />
            </button>
          </div>
          <div className="p-5 max-h-[70vh] overflow-y-auto scroll-thin">{children}</div>
          {footer && <div className="border-t border-ink-100 p-4 bg-ink-50/60 flex items-center justify-end gap-2">{footer}</div>}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ============================================================
// StatCard (KPI tile with count-up)
// ============================================================
export const StatCard: React.FC<{
  label: string;
  value: number | string;
  delta?: number;
  icon?: IconName;
  accent?: "brand" | "amber" | "emerald" | "rose" | "violet";
  suffix?: string;
}> = ({ label, value, delta, icon, accent = "brand", suffix }) => {
  const accents: Record<string, string> = {
    brand:   "bg-brand-50 text-brand-700 border-brand-100",
    amber:   "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose:    "bg-rose-50 text-rose-700 border-rose-100",
    violet:  "bg-violet-50 text-violet-700 border-violet-100",
  };
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-ink-500 font-medium uppercase tracking-wider">{label}</p>
          <motion.div
            key={String(value)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="mt-1 text-[26px] font-semibold text-ink-900 mono leading-none"
          >
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix && <span className="text-[14px] text-ink-400 ml-1">{suffix}</span>}
          </motion.div>
          {delta !== undefined && (
            <p className={`mt-1.5 text-[11.5px] font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} 较上版本
            </p>
          )}
        </div>
        {icon && (
          <span className={`w-9 h-9 rounded-xl border flex items-center justify-center ${accents[accent]}`}>
            <Icon name={icon} size={17} />
          </span>
        )}
      </div>
    </Card>
  );
};

// ============================================================
// Explain button
// ============================================================
export const ExplainBtn: React.FC<{ onClick: () => void; label?: string; className?: string }> =
({ onClick, label = "为何?", className = "" }) => (
  <button
    onClick={onClick}
    className={`text-[11.5px] text-brand-700 hover:text-brand-800 underline decoration-dotted underline-offset-4
                decoration-brand-300 hover:decoration-brand-500 font-medium ${className}`}
  >
    {label}
  </button>
);

// ============================================================
// Empty state
// ============================================================
export const Empty: React.FC<{ icon?: IconName; title: string; body?: string; cta?: React.ReactNode }> =
({ icon = "Inbox", title, body, cta }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <span className="w-12 h-12 rounded-2xl bg-ink-100 text-ink-500 flex items-center justify-center mb-3">
      <Icon name={icon} size={22} />
    </span>
    <p className="text-[14px] font-semibold text-ink-800">{title}</p>
    {body && <p className="text-[12.5px] text-ink-500 mt-1 max-w-md">{body}</p>}
    {cta && <div className="mt-4">{cta}</div>}
  </div>
);

// ============================================================
// ProgressBar (with animated fill)
// ============================================================
export const ProgressBar: React.FC<{ value: number; color?: string; height?: number }> =
({ value, color = "bg-brand-500", height = 6 }) => (
  <div className="w-full bg-ink-100 rounded-full overflow-hidden" style={{ height }}>
    <motion.div
      className={`h-full rounded-full ${color}`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
    />
  </div>
);

// ============================================================
// Tooltip (simple)
// ============================================================
export const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactNode }> = ({ content, children }) => (
  <span className="relative inline-block group">
    {children}
    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1
                     bg-ink-900 text-white text-[11px] rounded-md whitespace-nowrap
                     opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-pop">
      {content}
    </span>
  </span>
);

// ============================================================
// AnimatedNumber
// ============================================================
export const AnimatedNumber: React.FC<{ value: number; duration?: number; decimals?: number; className?: string }> =
({ value, duration = 0.7, decimals = 0, className = "" }) => {
  const [display, setDisplay] = React.useState(value);
  React.useEffect(() => {
    const start = display;
    const startTime = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startTime) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className={`mono ${className}`}>{display.toFixed(decimals)}</span>;
};
