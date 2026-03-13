'use client';
import { UserPlus, Crown, Cpu, PenTool, Palette, Settings, Edit2 } from 'lucide-react';

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

interface AgentStatus {
  id: string;
  name: string;
  state: string;
  label: string;
}

const DEPT_ORDER = ['leadership', 'engineering', 'content', 'design', 'operations'];
const DEPT_ICONS: Record<string, typeof Crown> = { leadership: Crown, engineering: Cpu, content: PenTool, design: Palette, operations: Settings };
const DEPT_COLORS: Record<string, string> = {
  leadership: '#f59e0b', engineering: '#3b82f6', content: '#a855f7', design: '#ec4899', operations: '#6b7280',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-400', busy: 'bg-amber-500', standby: 'bg-zinc-500',
};

export default function TeamView({ members, officeAgents = [], onAdd, onEdit }: {
  members: Member[];
  officeAgents?: AgentStatus[];
  onAdd: () => void;
  onEdit?: (m: Member) => void;
}) {
  const grouped = DEPT_ORDER.map(dept => ({
    id: dept,
    label: dept.charAt(0).toUpperCase() + dept.slice(1),
    members: members.filter(m => m.department === dept),
  })).filter(g => g.members.length > 0);

  const activeCount = members.filter(m => m.status === 'active').length;
  const totalCount = members.length;

  // Check if agent is recently active (in office with non-idle/offline state)
  const recentlyActiveNames = new Set(
    officeAgents
      .filter(a => a.state !== 'idle' && a.state !== 'offline')
      .map(a => a.name.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Team</h1>
          {totalCount > 0 && (
            <span className="text-xs text-text-muted bg-surface2 border border-border rounded-full px-2.5 py-0.5">
              <span className="text-emerald-400 font-semibold">{activeCount}</span>
              <span className="text-text-muted"> of {totalCount} active</span>
            </span>
          )}
        </div>
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
                  {dept.members.map(m => {
                    const isOnline = recentlyActiveNames.has(m.name.toLowerCase());
                    const isActive = m.status === 'active';
                    return (
                      <div
                        key={m.id}
                        onClick={() => onEdit?.(m)}
                        className="relative group bg-surface border border-border rounded-xl p-4 hover:border-border-hover transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 cursor-pointer"
                      >
                        {/* Edit tooltip on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="flex items-center gap-1 text-[0.6rem] px-2 py-1 bg-surface2 border border-border rounded-md text-text-muted">
                            <Edit2 className="w-2.5 h-2.5" /> Edit
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="relative w-10 h-10 rounded-full bg-bg border border-border flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {m.avatar || m.name.charAt(0)}
                            {/* Online dot from office */}
                            {isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-surface pulse-active" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{m.name}</span>
                              {m.isHuman && <span className="text-[0.55rem] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-medium uppercase tracking-wider">human</span>}
                              <div className={`w-2 h-2 rounded-full ml-auto flex-shrink-0 ${STATUS_COLORS[m.status || 'standby']} ${isActive ? 'pulse-active' : ''}`} />
                            </div>
                            {m.role && <div className="text-xs text-text-muted mt-0.5 truncate">{m.role}</div>}
                          </div>
                        </div>
                        {m.description && <p className="text-xs text-text-muted mt-2 line-clamp-2">{m.description}</p>}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {m.model && <span className="text-[0.6rem] px-1.5 py-0.5 bg-surface2 border border-border rounded font-mono text-text-muted">{m.model}</span>}
                          {m.spawnLabel && <span className="text-[0.6rem] px-1.5 py-0.5 bg-accent/10 text-accent-hover rounded border border-accent/20">{m.spawnLabel}</span>}
                          {isOnline && <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 ml-auto">● live</span>}
                        </div>
                        {m.skills && m.skills.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {m.skills.map(s => (
                              <span key={s} className="text-[0.58rem] px-1.5 py-0.5 bg-zinc-800 text-text-muted rounded">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface2 border border-border flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-text-muted" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">No team members yet</p>
                <p className="text-xs text-text-muted">Add your first agent or team member to get started.</p>
              </div>
              <button
                onClick={onAdd}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Add Member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
