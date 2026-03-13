'use client';
import { Kanban, Clapperboard, Calendar, Users, Brain, LogOut, Terminal, Monitor } from 'lucide-react';

const navItems = [
  { id: 'tasks', label: 'Tasks', icon: Kanban },
  { id: 'content', label: 'Content', icon: Clapperboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'office', label: 'Office', icon: Monitor },
  { id: 'memory', label: 'Memory', icon: Brain },
];

export default function Sidebar({ active, onNav, onLogout }: {
  active: string;
  onNav: (view: string) => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <nav className="hidden md:flex w-[220px] flex-shrink-0 bg-surface border-r border-border flex-col h-screen">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <Terminal className="w-5 h-5 text-accent-hover" strokeWidth={2} />
          <span className="text-sm font-semibold tracking-tight">Mission Control</span>
        </div>
        <div className="flex-1 py-3 flex flex-col gap-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={`flex items-center gap-3 px-5 py-2.5 text-[0.82rem] transition-all border-l-2 ${
                active === id
                  ? 'bg-accent-glow text-text border-accent'
                  : 'text-text-dim border-transparent hover:bg-surface2 hover:text-text'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-border py-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-5 py-2.5 text-[0.82rem] text-text-dim hover:text-text transition-colors w-full border-l-2 border-transparent"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar — visible only on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around h-14 safe-area-inset-bottom">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all ${
              active === id ? 'text-accent-hover' : 'text-text-muted'
            }`}
          >
            <Icon
              className="w-5 h-5"
              strokeWidth={active === id ? 2.2 : 1.6}
            />
            <span className="text-[0.55rem] font-medium leading-none">{label}</span>
          </button>
        ))}
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
