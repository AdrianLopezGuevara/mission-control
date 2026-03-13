'use client';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, X } from 'lucide-react';
import { getWeekNumber } from '@/lib/utils';

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

const TYPE_DOT: Record<string, string> = {
  event: 'bg-blue-400',
  cron: 'bg-emerald-400',
  reminder: 'bg-amber-400',
  deadline: 'bg-red-400',
};

const TYPE_FILTERS = ['all', 'event', 'cron', 'reminder'];

export default function CalendarView({ events, onAdd, onEdit, onDayClick }: {
  events: CalEvent[];
  onAdd: () => void;
  onEdit?: (ev: CalEvent) => void;
  onDayClick?: (date: string) => void;
}) {
  const [filter, setFilter] = useState('all');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const title = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); }

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

  // Split days into 6 weeks
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < 42; i += 7) w.push(days.slice(i, i + 7));
    return w;
  }, [days]);

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
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const timeLinePercent = (currentHour / 24) * 100;

  // Cron events for sidebar
  const cronEvents = events.filter(e => e.type === 'cron');

  // Selected day events
  const selectedEvents = selectedDate
    ? getEventsForDay(
        parseInt(selectedDate.split('-')[2]),
        parseInt(selectedDate.split('-')[1]) - 1,
        parseInt(selectedDate.split('-')[0])
      )
    : [];

  function handleDayClick(day: { date: number; month: number; year: number; isOther: boolean }) {
    const dateStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
    if (selectedDate === dateStr) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
    }
  }

  function handleDayDoubleClick(day: { date: number; month: number; year: number; isOther: boolean }) {
    const dateStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
    onDayClick?.(dateStr);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-1.5 rounded-lg border border-border hover:bg-surface2 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base md:text-lg font-semibold tracking-tight min-w-[150px] md:min-w-[180px] text-center">{title}</h1>
          <button onClick={next} className="p-1.5 rounded-lg border border-border hover:bg-surface2 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-surface2 transition-colors text-text-dim">
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
          {/* Day headers with week col */}
          <div className="grid gap-px mb-px" style={{ gridTemplateColumns: '28px repeat(7, 1fr)' }}>
            <div className="text-center text-[0.5rem] text-text-muted py-1 md:py-2 font-semibold uppercase tracking-wider opacity-40">W</div>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[0.6rem] md:text-[0.65rem] font-semibold text-text-muted uppercase tracking-wider py-1 md:py-2">
                <span className="md:hidden">{d}</span>
                <span className="hidden md:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</span>
              </div>
            ))}
          </div>

          {/* Week rows */}
          <div className="flex-1 flex flex-col gap-px">
            {weeks.map((week, wi) => {
              const firstDay = week[0];
              const wkNum = getWeekNumber(firstDay.date, firstDay.month, firstDay.year);
              return (
                <div key={wi} className="grid gap-px flex-1" style={{ gridTemplateColumns: '28px repeat(7, 1fr)' }}>
                  {/* Week number */}
                  <div className="flex items-start justify-center pt-1">
                    <span className="text-[0.48rem] text-text-muted opacity-40 font-mono">{wkNum}</span>
                  </div>
                  {week.map((day, di) => {
                    const dateStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    const dayEvents = getEventsForDay(day.date, day.month, day.year);
                    return (
                      <div
                        key={di}
                        className={`relative bg-surface border rounded p-1 md:p-1.5 min-h-0 overflow-hidden transition-all cursor-pointer hover:border-border-hover ${
                          day.isOther ? 'opacity-25' : ''
                        } ${isToday ? 'today-pulse border-accent!' : 'border-border'} ${
                          isSelected && !isToday ? 'border-accent/40 bg-accent-glow' : ''
                        }`}
                        onClick={() => handleDayClick(day)}
                        onDoubleClick={() => handleDayDoubleClick(day)}
                        title="Click to see events · Double-click to add"
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`text-[0.65rem] md:text-[0.7rem] font-semibold ${isToday ? 'text-accent-hover' : 'text-text-muted'}`}>
                            {day.date}
                          </span>
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-hover flex-shrink-0 sse-pulse" />
                          )}
                        </div>

                        {/* Current time indicator on today's cell */}
                        {isToday && (
                          <div
                            className="absolute left-0 right-0 h-px bg-accent/60 pointer-events-none z-10"
                            style={{ top: `${timeLinePercent}%` }}
                          >
                            <div className="absolute -left-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
                          </div>
                        )}

                        {/* Desktop: event pills */}
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
                                className={`w-1.5 h-1.5 rounded-full cursor-pointer ${TYPE_DOT[ev.type] || 'bg-zinc-400'}`}
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
              );
            })}
          </div>
        </div>

        {/* Sidebar — crons + selected day panel */}
        <div className="hidden md:flex w-[260px] flex-shrink-0 border-l border-border bg-surface overflow-y-auto p-4 flex-col gap-4">
          {/* Selected day panel */}
          {selectedDate && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDayClick?.(selectedDate)}
                    className="text-[0.6rem] px-2 py-1 bg-accent/10 text-accent-hover rounded hover:bg-accent/20 transition-colors border border-accent/20 flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" /> Add
                  </button>
                  <button onClick={() => setSelectedDate(null)} className="p-0.5 text-text-muted hover:text-text transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {selectedEvents.length === 0 ? (
                <p className="text-[0.72rem] text-text-muted italic">No events this day.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {selectedEvents.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => onEdit?.(ev)}
                      className="text-left bg-surface2 border border-border rounded-lg p-2.5 hover:border-border-hover transition-colors"
                    >
                      <div className="text-[0.75rem] font-medium">{ev.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[0.6rem] px-1.5 py-0.5 rounded ${TYPE_COLORS[ev.type]}`}>{ev.type}</span>
                        {ev.time && <span className="text-[0.6rem] text-text-muted">{ev.time}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-border mt-4" />
            </div>
          )}

          {/* Cron jobs */}
          <div>
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

      {/* Mobile: selected day slide-up panel */}
      {selectedDate && (
        <div className="md:hidden border-t border-border bg-surface p-4 flex-shrink-0 max-h-[40vh] overflow-y-auto"
          style={{ transition: 'all 0.2s ease-out' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDayClick?.(selectedDate)}
                className="text-[0.65rem] px-2.5 py-1 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add event
              </button>
              <button onClick={() => setSelectedDate(null)} className="p-1 text-text-muted hover:text-text">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-text-muted">No events. Double-tap day or use Add event.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => onEdit?.(ev)}
                  className="text-left bg-surface2 border border-border rounded-lg p-3 hover:border-border-hover transition-colors"
                >
                  <div className="text-sm font-medium">{ev.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[0.65rem] px-1.5 py-0.5 rounded ${TYPE_COLORS[ev.type]}`}>{ev.type}</span>
                    {ev.time && <span className="text-xs text-text-muted">{ev.time}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
