'use client';
import { useState, useEffect, useCallback } from 'react';
import { Activity, CheckSquare, Clapperboard, Calendar, Users, FileText, Settings, ChevronDown } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface ActivityEntry {
  id: string;
  type: 'task' | 'content' | 'calendar' | 'team' | 'note' | 'system';
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'completed';
  title: string;
  description?: string;
  agent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  task: CheckSquare,
  content: Clapperboard,
  calendar: Calendar,
  team: Users,
  note: FileText,
  system: Settings,
};

const TYPE_COLORS: Record<string, string> = {
  task: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  content: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  calendar: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  team: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  note: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  system: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

const ACTION_COLORS: Record<string, string> = {
  created: 'text-emerald-400',
  updated: 'text-blue-400',
  deleted: 'text-red-400',
  moved: 'text-amber-400',
  completed: 'text-emerald-400',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'task', label: 'Tasks' },
  { id: 'content', label: 'Content' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'note', label: 'Notes' },
  { id: 'system', label: 'System' },
];

const PAGE_SIZE = 20;

export default function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const loadActivity = useCallback(async (f: string, p: number) => {
    setLoading(true);
    try {
      const limit = p * PAGE_SIZE;
      const url = f === 'all' ? `/api/activity?limit=${limit}` : `/api/activity?type=${f}&limit=${limit}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        setEntries(data);
        setTotal(data.length); // approx
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity(filter, page);
  }, [filter, page, loadActivity]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  // SSE real-time updates
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.addEventListener('activity', (e) => {
      const entry = JSON.parse(e.data) as ActivityEntry;
      setEntries(prev => {
        if (filter !== 'all' && entry.type !== filter) return prev;
        return [entry, ...prev];
      });
    });
    return () => es.close();
  }, [filter]);

  const filtered = entries;

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent-hover" strokeWidth={1.8} />
          <h1 className="text-lg font-semibold tracking-tight">Activity</h1>
        </div>
        <div className="flex bg-surface rounded-lg p-0.5 border border-border overflow-x-auto flex-shrink-0">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                filter === f.id ? 'bg-accent/20 text-accent-hover' : 'text-text-muted hover:text-text-dim'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Activity className="w-8 h-8 text-text-muted" strokeWidth={1.2} />
            <p className="text-sm text-text-muted">No activity yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

            <div className="flex flex-col gap-0">
              {filtered.map((entry, idx) => {
                const Icon = TYPE_ICONS[entry.type] || Settings;
                const iconColor = TYPE_COLORS[entry.type] || TYPE_COLORS.system;
                const isLast = idx === filtered.length - 1;
                return (
                  <div key={entry.id} className={`flex gap-4 ${isLast ? 'pb-0' : 'pb-4'}`}>
                    {/* Icon dot */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center z-10 ${iconColor}`}>
                      <Icon className="w-4 h-4" strokeWidth={1.8} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1 pb-4 border-b border-border last:border-b-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-[0.72rem] font-semibold uppercase tracking-wide ${ACTION_COLORS[entry.action] || 'text-text-muted'}`}>
                          {entry.action}
                        </span>
                        <span className="text-sm font-medium">{entry.title}</span>
                      </div>
                      {entry.description && (
                        <p className="text-xs text-text-muted mt-0.5">{entry.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {entry.agent && (
                          <span className="text-[0.65rem] text-text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded">
                            {entry.agent}
                          </span>
                        )}
                        <span className="text-[0.65rem] text-text-muted">{timeAgo(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {entries.length >= page * PAGE_SIZE && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs text-text-muted border border-border rounded-lg hover:border-border-hover hover:text-text transition-all"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
