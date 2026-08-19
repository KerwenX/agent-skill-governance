import React from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useGovernance } from "../../store/governance";
import { useUserRevalidation } from "../../hooks/useUserRevalidation";
import { Icon, IconName } from "../common/Icons";

export default function UserShell() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const init = useGovernance(s => s.init);
  const user = useGovernance(s => (userId ? s.users[userId] : undefined));
  const globalVersion = useGovernance(s => s.globalVersion);
  const localContracts = useGovernance(s => s.localContracts);

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNav, setMobileNav] = React.useState(false);

  React.useEffect(() => { if (userId) init("user", userId); }, [init, userId]);
  useUserRevalidation();

  // Auto-collapse on narrow windows (e.g. 520px demo popups)
  React.useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 1180);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const mine = React.useMemo(
    () => Object.values(localContracts).filter(c => c.ownerId === userId),
    [localContracts, userId]
  );
  const staleCount = mine.filter(c => c.state === "STALE").length;
  const conflictCount = mine.filter(c => c.state === "CONFLICT").length;
  const badge = staleCount + conflictCount;

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center text-ink-500 text-[13px]">
        未找到该用户。<a className="link-quiet ml-2" href="/demo">返回演示台</a>
      </div>
    );
  }

  const nav: { to: string; label: string; icon: IconName; badge?: number }[] = [
    { to: `agent/${user.id === "user-a" ? "agent-user-a" : `agent-${user.id}`}`, label: "智能体工作台", icon: "Terminal" },
    { to: "governance", label: "我的治理规则", icon: "Shield", badge },
    { to: "updates", label: "治理更新", icon: "Bell", badge: staleCount },
    { to: "history", label: "历史记录", icon: "History" },
  ];

  const w = collapsed ? "w-16" : "w-56";

  return (
    <div className="h-screen w-full flex bg-ink-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${w} shrink-0 bg-white border-r border-ink-200 flex flex-col transition-[width] duration-200 relative z-30`}>
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-ink-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[13px] font-bold shrink-0"
               style={{ background: `linear-gradient(135deg, ${user.avatarColor}, #8B5CF6)` }}>
            {user.initials}
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <p className="text-[13px] font-bold text-ink-900 truncate">{user.name}</p>
              <p className="text-[10px] text-ink-500 uppercase tracking-wider truncate">{user.role}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scroll-thin">
          {nav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              title={collapsed ? n.label : undefined}
              className={({ isActive }) => `nav-item ${collapsed ? "justify-center px-0" : ""} ${isActive ? "nav-item-active" : ""}`}
            >
              <Icon name={n.icon} size={16} />
              {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
              {!collapsed && !!n.badge && n.badge > 0 && (
                <span className="ml-auto text-[10px] mono bg-rose-100 text-rose-700 rounded-full px-1.5 h-4 inline-flex items-center font-semibold">
                  {n.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-ink-100 space-y-2">
          <div className={`card p-2.5 !shadow-none ${collapsed ? "text-center" : ""}`}>
            <p className={`text-[10px] uppercase tracking-wider text-ink-500 font-medium ${collapsed ? "hidden" : ""}`}>全局基准版本</p>
            <p className="text-[16px] font-bold text-brand-700 mono leading-none mt-1">{globalVersion}</p>
          </div>
          <button onClick={() => setCollapsed(c => !c)}
            className="nav-item w-full" title={collapsed ? "展开侧栏" : "收起侧栏"}>
            <Icon name="ChevronR" size={16} className={collapsed ? "" : "rotate-180"} />
            {!collapsed && <span className="flex-1 text-left">收起侧栏</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay nav (very narrow screens) */}
      {mobileNav && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink-900/30" onClick={() => setMobileNav(false)} />
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <Outlet context={{ collapsed, setCollapsed, toggle查看or: () => setMobileNav(v => !v) }} />
      </main>
    </div>
  );
}
