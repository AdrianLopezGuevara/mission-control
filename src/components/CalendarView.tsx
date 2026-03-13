'use client';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';

interface CalEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: string;
  recurring?: string;
  completed?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  event: 'bg-blue-500/15 text-blue-400',
  cron: 'bg-emerald-500/15 text-emerald-400',
  reminder: 'bg-amber-500/15 text-amber-400',
  deadline: 'bg-red-500/15 text-red-400',
};

const TYPE_FILTERS = ['all', 'event', 'cron', 'reminder'];

export default function CalendarView({ events, onAdd, onEdit }: {
  events: CalEvent[];
  onAdd: () => void;
  onEdit?: (ev: CalEvent) => void;
}) {
  const [filter, setFilter] = useState('all');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const title = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
  function today() { setYear(now.getFullYear()); setMonth(now.getMonth()); }

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const cells: { date: number; month: number; year: number; isOther: boolean }[] = [];
    for (let i = startDay - 1; i >= 0; i--) cells.push({ date: prevMonthDays - i, month: month - 1, year, isOther: true });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: d, month, year, isOther: false });
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) cells.push({ date: d, month: month + 1, year, isOther: true });
    return cells;
  }, [year, month]);

  function getEventsForDay(d: number, m: number, y: number) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(y, m, d).getDay();
    return events.filter(ev => {
      if (filter !== 'all' && ev.type !== filter) return false;
      if (ev.date === dateStr) return true;
      if (ev.recurring === 'daily') return new Date(ev.date) <= new Date(dateStr);
      if (ev.recurring === 'weekly') return new Date(ev.date).getDay() === dayOfWeek && new Date(ev.date) <= new Date(dateStr);
      if (ev.recurring === 'monthly') return new Date(ev.date).getDate() === d && new Date(ev.date) <= new Date(dateStr);
      return false;
    });
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Cron events for sidebar
  const cronEvents = events.filter(e => e.type === 'cron');

  return (
    <div className="flex flex-col h-full">
      {/* Header — stacks vertically on mobile */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-1.5 rounded-lg border border-border hover:bg-surface2 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base md:text-lg font-semibold tracking-tight min-w-[150px] md:min-w-[180px] text-center">{title}</h1>
          <button onClick={next} className="p-1.5 rounded-lg border border-border hover:bg-surface2 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={today} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-surface2 transition-colors text-text-dim">
            Today
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex bg-surface rounded-lg p-0.5 border border-border overflow-x-auto">
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 md:px-2.5 py-1.5 text-xs font-medium rounded-md transition-all capitalize whitespace-nowrap ${
                  filter === f ? 'bg-accent/20 text-accent-hover' : 'text-text-muted hover:text-text-dim'
                }`}
              >
                {f === 'all' ? 'All' : f + 's'}
              </button>
            ))}
          </div>
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Event
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-2 md:p-4 flex flex-col overflow-y-auto">
          <div className="grid grid-cols-7 gap-px mb-px">
            {/* Show short names on mobile */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[0.6rem] md:text-[0.65rem] font-semibold text-text-muted uppercase tracking-wider py-1 md:py-2">
                <span className="md:hidden">{d}</span>
                <span className="hidden md:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
            {days.map((day, i) => {
              const dateStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const dayEvents = getEventsForDay(day.date, day.month, day.year);
              return (
                <div
                  key={i}
                  className={`bg-surface border border-border rounded p-1 md:p-1.5 min-h-0 overflow-hidden transition-colors hover:border-border-hover ${
                    day.isOther ? 'opacity-20' : ''
                  } ${isToday ? 'border-accent! bg-accent-glow' : ''}`}
                >
                  <div className={`text-[0.65rem] md:text-[0.7rem] font-semibold mb-0.5 ${isToday ? 'text-accent-hover' : 'text-text-muted'}`}>
                    {day.date}
                  </div>
                  {/* On mobile: just show a dot per event type, not full pills */}
                  <div className="hidden md:block">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div key={ev.id + dateStr}
                        onClick={(e) => { e.stopPropagation(); onEdit?.(ev); }}
                        className={`text-[0.55rem] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 ${TYPE_COLORS[ev.type] || 'bg-zinc-500/10 text-zinc-400'}`}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[0.5rem] text-text-muted font-semibold px-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                  {/* Mobile: colored dots */}
                  {dayEvents.length > 0 && (
                    <div className="md:hidden flex flex-wrap gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id + dateStr}
                          onClick={(e) => { e.stopPropagation(); onEdit?.(ev); }}
                          className={`w-1.5 h-1.5 rounded-full cursor-pointer ${
                            ev.type === 'event' ? 'bg-blue-400' :
                            ev.type === 'cron' ? 'bg-emerald-400' :
                            ev.type === 'reminder' ? 'bg-amber-400' :
                            ev.type === 'deadline' ? 'bg-red-400' : 'bg-zinc-400'
                          }`}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[0.45rem] text-text-muted leading-none">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* Cron Sidebar — hidden on mobile */}
        <div className="hidden md:flex w-[260px] flex-shrink-0 border-l border-border bg-surface overflow-y-auto p-4 flex-col">
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Scheduled Jobs
          </h3>
          <div className="flex flex-col gap-2">
            {cronEvents.length === 0 && <div className="text-xs text-text-muted">No cron events</div>}
            {cronEvents.map(ev => (
              <div key={ev.id} className="bg-surface2 border border-border rounded-lg p-3">
                <div className="text-xs font-medium mb-1">{ev.title}</div>
                <div className="flex items-center gap-2">
                  {ev.recurring && (
                    <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-mono">{ev.recurring}</span>
                  )}
                  {ev.time && (
                    <span className="text-[0.6rem] text-text-muted">{ev.time}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
