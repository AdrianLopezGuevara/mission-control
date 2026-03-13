'use client';
import { Kanban, Clapperboard, Calendar, Users, Brain, LogOut, Terminal, Monitor, LayoutDashboard, Activity, FileText, Bell } from 'lucide-react';

const navItems = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, badgeKey: null },
  { id: 'tasks', label: 'Tasks', icon: Kanban, badgeKey: 'tasks' as const },
  { id: 'content', label: 'Content', icon: Clapperboard, badgeKey: null },
  { id: 'calendar', label: 'Calendar', icon: Calendar, badgeKey: 'calendar' as const },
  { id: 'team', label: 'Team', icon: Users, badgeKey: 'team' as const },
  { id: 'office', label: 'Office', icon: Monitor, badgeKey: null },
  { id: 'notes', label: 'Notes', icon: FileText, badgeKey: null },
  { id: 'activity', label: 'Activity', icon: Activity, badgeKey: null },
  { id: 'memory', label: 'Memory', icon: Brain, badgeKey: null },
];

interface SidebarBadges {
  tasks: number;
  calendar: number;
  team: number;
}

export default function Sidebar({ active, onNav, onLogout, sseConnected = false, badges, notifCount = 0, onNotifClick }: {
  active: string;
  onNav: (view: string) => void;
  onLogout: () => void;
  sseConnected?: boolean;
  badges?: SidebarBadges;
  notifCount?: number;
  onNotifClick?: () => void;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex w-[220px] flex-shrink-0 bg-surface border-r border-border flex-col h-screen">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <Terminal className="w-5 h-5 text-accent-hover" strokeWidth={2} />
          <span className="text-sm font-semibold tracking-tight">Mission Control</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Bell icon */}
            <button
              onClick={onNotifClick}
              className="relative text-text-muted hover:text-text transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" strokeWidth={1.8} />
              {notifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[0.45rem] bg-red-500 text-white rounded-full px-1 min-w-[14px] text-center font-bold leading-4">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>
            {/* SSE status */}
            <div title={sseConnected ? 'Live — connected' : 'Offline'}>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 block ${sseConnected ? 'bg-emerald-400 sse-pulse' : 'bg-zinc-600'}`}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon, badgeKey }) => {
            const isActive = active === id;
            const count = badgeKey && badges ? badges[badgeKey] : 0;
            return (
              <div key={id} className="relative group">
                <button
                  onClick={() => onNav(id)}
                  title={label}
                  className={`flex items-center gap-3 px-5 py-2.5 text-[0.82rem] transition-all border-l-2 w-full ${
                    isActive
                      ? 'bg-accent-glow text-text border-accent shadow-[inset_3px_0_8px_rgba(124,58,237,0.15)]'
                      : 'text-text-dim border-transparent hover:bg-surface2 hover:text-text'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} />
                  <span className="flex-1 text-left">{label}</span>
                  {count > 0 && (
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-semibold tabular-nums min-w-[18px] text-center ${
                      isActive ? 'bg-accent/20 text-accent-hover' : 'bg-surface2 text-text-muted border border-border'
                    }`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border py-3">
          <button
            onClick={onLogout}
            title="Logout"
            className="flex items-center gap-3 px-5 py-2.5 text-[0.82rem] text-text-dim hover:text-text transition-colors w-full border-l-2 border-transparent hover:bg-surface2"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar — show core nav items */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border flex items-center justify-around h-14 safe-area-inset-bottom"
        style={{ background: 'rgba(17, 17, 19, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        {navItems.slice(0, 6).map(({ id, label, icon: Icon, badgeKey }) => {
          const count = badgeKey && badges ? badges[badgeKey] : 0;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 relative transition-all ${
                active === id ? 'text-accent-hover' : 'text-text-muted'
              }`}
            >
              {count > 0 && (
                <span className="absolute top-1 right-[20%] text-[0.45rem] bg-accent text-white rounded-full px-1 min-w-[13px] text-center font-bold leading-4">
                  {count > 99 ? '99+' : count}
                </span>
              )}
              <Icon className="w-5 h-5" strokeWidth={active === id ? 2.2 : 1.6} />
              <span className="text-[0.55rem] font-medium leading-none">{label}</span>
            </button>
          );
        })}
        {/* Bell on mobile */}
        <button
          onClick={onNotifClick}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 relative text-text-muted"
        >
          {notifCount > 0 && (
            <span className="absolute top-1 right-[18%] text-[0.45rem] bg-red-500 text-white rounded-full px-1 min-w-[13px] text-center font-bold leading-4">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
          <Bell className="w-5 h-5" strokeWidth={1.6} />
          <span className="text-[0.55rem] font-medium leading-none">Alerts</span>
        </button>
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-text-muted"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.6} />
          <span className="text-[0.55rem] font-medium leading-none">Logout</span>
        </button>
      </nav>
    </>
  );
}
