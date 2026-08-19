import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGovernance } from "../../store/governance";
import { Icon } from "./Icons";

const KIND_ICON = {
  info:    { name: "Info"  as const, cls: "bg-brand-50 text-brand-700 border-brand-100" },
  success: { name: "Check" as const, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  warn:    { name: "Warn"  as const, cls: "bg-amber-50 text-amber-700 border-amber-100" },
  danger:  { name: "Warn"  as const, cls: "bg-rose-50 text-rose-700 border-rose-100" },
};

const NotificationCenter: React.FC = () => {
  const notifications = useGovernance(s => s.notifications);
  const navigate = useNavigate();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[340px] max-w-[90vw] pointer-events-none">
      <AnimatePresence>
        {notifications.slice(0, 4).map(n => {
          const k = KIND_ICON[n.kind];
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              className="pointer-events-auto bg-white rounded-xl shadow-pop border border-ink-200 p-3 flex items-start gap-2.5 cursor-pointer hover:border-brand-300 transition-colors"
              onClick={() => n.cta && navigate(n.cta.to)}
            >
              <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${k.cls}`}>
                <Icon name={k.name} size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-ink-900 leading-tight">{n.title}</p>
                {n.body && <p className="text-[11.5px] text-ink-500 mt-0.5 leading-snug">{n.body}</p>}
                {n.cta && <p className="text-[11px] text-brand-700 font-medium mt-1">{n.cta.label} →</p>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
