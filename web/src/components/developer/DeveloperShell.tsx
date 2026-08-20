import React from "react";
import { NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGovernance } from "../../store/governance";
import { Icon, IconName } from "../common/Icons";
import { StateBadge } from "../common/UI";
import { useDevDemoCommands } from "../../hooks/useDemoCommands";

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/developer",           label: "治理总览",       icon: "Pulse"   },
  { to: "/developer/inbox",     label: "治理收件箱",     icon: "Inbox"  },
  { to: "/developer/证据",  label: "证据智能",       icon: "Git" },
  { to: "/developer/candidates",label: "候选规则",       icon: "FileCode" },
  { to: "/developer/contracts", label: "全局契约",       icon: "Book"   },
  { to: "/developer/dependencies", label: "依赖网络",    icon: "Network" },
  { to: "/developer/history",   label: "历史记录",       icon: "History" },
];

export default function DeveloperShell() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const init = useGovernance(s => s.init);
  const initialScenario = React.useRef(params.get("scenario"));
  React.useEffect(() => { init("developer", undefined, initialScenario.current ?? undefined); }, [init]);
  useDevDemoCommands();
  const globalVersion = useGovernance(s => s.globalVersion);
  const inbox = useGovernance(s => s.evidenceInboxCount);
  const notifications = useGovernance(s => s.notifications);
  const markRead = useGovernance(s => s.markAllNotificationsRead);
  const [bellOpen, setBellOpen] = React.useState(false);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="h-screen w-full flex bg-ink-50">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-ink-200 flex flex-col">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-ink-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center shadow">
            <Icon name="Shield" size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[14px] font-bold text-ink-900">SkillOS</p>
            <p className="text-[10.5px] text-ink-500 uppercase tracking-wider">开发者控制台</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scroll-thin">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/developer"}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
            >
              <Icon name={n.icon} size={15} />
              <span className="flex-1">{n.label}</span>
              {n.label === "治理收件箱" && inbox > 0 && (
                <span className="ml-auto text-[10.5px] mono bg-rose-100 text-rose-700 rounded-full px-1.5 h-4 inline-flex items-center font-semibold">
                  {inbox}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-ink-100">
          <div className="card p-2.5 !shadow-none">
            <p className="text-[10.5px] uppercase tracking-wider text-ink-500 font-medium">全局治理</p>
            <p className="text-[18px] font-bold text-brand-700 mono leading-none mt-1">{globalVersion}</p>
            <div className="mt-1.5"><StateBadge state="ACTIVE" /></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 bg-white border-b border-ink-200 flex items-center px-5 gap-4">
          <div className="flex items-center gap-2 text-[12px] text-ink-500">
            <span className="chip chip-brand mono">{globalVersion}</span>
            <span className="hidden md:inline">跨窗口实时同步</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setBellOpen(v => !v); markRead(); }}
              className="relative h-9 w-9 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-600"
              aria-label="通知"
            >
              <Icon name="Bell" size={17} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white text-[12px] font-bold">D</div>
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-hidden p-4">
          <div className="h-full overflow-y-auto scroll-thin pr-1">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bell popover */}
      <AnimatePresence>
        {bellOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="fixed top-14 right-6 w-[340px] bg-white rounded-xl shadow-pop border border-ink-200 z-40 overflow-hidden"
          >
            <div className="px-3 py-2.5 border-b border-ink-100 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink-900">通知</p>
              <span className="text-[11px] text-ink-500">{notifications.length} 条事件</span>
            </div>
            <div className="max-h-[360px] overflow-y-auto scroll-thin">
              {notifications.length === 0 && (
                <p className="text-[12.5px] text-ink-500 text-center py-8">暂无事件。</p>
              )}
              {notifications.slice(0, 12).map(n => (
                <button
                  key={n.id}
                  onClick={() => { if (n.cta) navigate(n.cta.to); setBellOpen(false); }}
                  className="w-full text-left px-3 py-2.5 border-b border-ink-100 last:border-b-0 hover:bg-ink-50"
                >
                  <p className="text-[12.5px] font-medium text-ink-900">{n.title}</p>
                  {n.body && <p className="text-[11.5px] text-ink-500 mt-0.5">{n.body}</p>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
