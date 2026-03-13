'use client';
import { UserPlus, Crown, Cpu, PenTool, Palette, Settings } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  description?: string;
  department?: string;
  model?: string;
  status?: string;
  skills?: string[];
  spawnLabel?: string;
  isHuman?: boolean;
  isLead?: boolean;
}

const DEPT_ORDER = ['leadership', 'engineering', 'content', 'design', 'operations'];
const DEPT_ICONS: Record<string, typeof Crown> = { leadership: Crown, engineering: Cpu, content: PenTool, design: Palette, operations: Settings };
const DEPT_COLORS: Record<string, string> = {
  leadership: '#f59e0b', engineering: '#3b82f6', content: '#a855f7', design: '#ec4899', operations: '#6b7280',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500', busy: 'bg-amber-500', standby: 'bg-zinc-500',
};

export default function TeamView({ members, onAdd, onEdit }: {
  members: Member[];
  onAdd: () => void;
  onEdit?: (m: Member) => void;
}) {
  const grouped = DEPT_ORDER.map(dept => ({
    id: dept,
    label: dept.charAt(0).toUpperCase() + dept.slice(1),
    members: members.filter(m => m.department === dept),
  })).filter(g => g.members.length > 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Team</h1>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors">
          <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} /> Member
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          {grouped.map(dept => {
            const Icon = DEPT_ICONS[dept.id] || Settings;
            const color = DEPT_COLORS[dept.id] || '#6b7280';
            return (
              <div key={dept.id}>
                <div className="flex items-center gap-2.5 mb-4 pb-2 border-b-2" style={{ borderBottomColor: color }}>
                  <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.8} />
                  <span className="text-sm font-semibold">{dept.label}</span>
                  <span className="text-xs text-text-muted ml-1">{dept.members.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dept.members.map(m => (
                    <div key={m.id} onClick={() => onEdit?.(m)} className="bg-surface border border-border rounded-xl p-4 hover:border-border-hover transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-bg border border-border flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {m.avatar || m.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{m.name}</span>
                            {m.isHuman && <span className="text-[0.55rem] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-medium uppercase tracking-wider">human</span>}
                            <div className={`w-2 h-2 rounded-full ml-auto ${STATUS_COLORS[m.status || 'standby']}`} />
                          </div>
                          {m.role && <div className="text-xs text-text-muted mt-0.5">{m.role}</div>}
                        </div>
                      </div>
                      {m.description && <p className="text-xs text-text-muted mt-2 line-clamp-2">{m.description}</p>}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {m.model && <span className="text-[0.6rem] px-1.5 py-0.5 bg-surface2 border border-border rounded font-mono text-text-muted">{m.model}</span>}
                        {m.spawnLabel && <span className="text-[0.6rem] px-1.5 py-0.5 bg-accent/10 text-accent-hover rounded border border-accent/20">{m.spawnLabel}</span>}
                      </div>
                      {m.skills && m.skills.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {m.skills.map(s => (
                            <span key={s} className="text-[0.58rem] px-1.5 py-0.5 bg-zinc-800 text-text-muted rounded">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
