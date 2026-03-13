'use client';
import { LayoutDashboard, Activity, Clock, CheckSquare, CalendarDays, Users, Timer, ArrowRight } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface TaskStats {
  total: number;
  backlog: number;
  inProgress: number;
  review: number;
  done: number;
}
interface CalendarStats {
  upcoming: CalEvent[];
  today: CalEvent[];
}
interface CalEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type?: string;
}
interface TeamStats {
  total: number;
  active: number;
}
interface TimeStats {
  totalToday: number;
  avgPerTask: number;
  noEstimate: number;
}
interface ActivityEntry {
  id: string;
  type: string;
  action: string;
  title: string;
  description?: string;
  agent?: string;
  timestamp: string;
}
interface TaskItem {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  priority?: string;
  timeSpent?: number;
  timeEstimate?: number;
}
interface OfficeAgent {
  id: string;
  name: string;
  state?: string;
}

interface DashboardStats {
  tasks?: TaskStats;
  calendar?: { upcoming: unknown[]; today: unknown[] };
  team?: TeamStats;
  timeStats?: TimeStats;
  recentActivity?: unknown[];
}

interface Props {
  tasks: TaskItem[];
  calendar: CalEvent[];
  team: unknown[];
  officeAgents: OfficeAgent[];
  onNav: (view: string) => void;
  stats?: DashboardStats;
}

const ACTIVITY_ICONS: Record<string, string> = {
  task: '✓',
  content: '🎬',
  calendar: '📅',
  team: '👤',
  note: '📝',
  system: '⚙️',
};

const ACTION_COLORS: Record<string, string> = {
  created: 'text-emerald-400',
  updated: 'text-blue-400',
  deleted: 'text-red-400',
  moved: 'text-amber-400',
  completed: 'text-emerald-400',
};

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatCard({ label, value, sub, color, icon: Icon, onClick }: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2 text-left hover:border-border-hover hover:shadow-md hover:shadow-black/20 transition-all group"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted font-medium uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.8} />
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-text-muted">{sub}</div>}
    </button>
  );
}

export default function DashboardHome({ tasks, calendar, team, officeAgents, onNav, stats }: Props) {
  const taskStats = stats?.tasks;
  const timeStats = stats?.timeStats;
  const recentActivity = (stats?.recentActivity as ActivityEntry[] | undefined) || [];
  const calStats = stats?.calendar;

  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = calendar.filter(e => e.date === today);
  const activeAgents = officeAgents.filter(a => a.state && a.state !== 'idle' && a.state !== 'offline');

  const upcomingEvents: CalEvent[] = (calStats?.upcoming as CalEvent[] | undefined) || calendar
    .filter(e => e.date && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <LayoutDashboard className="w-5 h-5 text-accent-hover" strokeWidth={1.8} />
        <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
        <span className="text-xs text-text-muted ml-auto">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </header>

      <div className="flex-1 p-4 md:p-6 flex flex-col gap-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="Tasks"
            value={taskStats?.total ?? tasks.length}
            sub={taskStats ? `${taskStats.inProgress} active` : `${inProgressTasks.length} active`}
            color="text-violet-400"
            icon={CheckSquare}
            onClick={() => onNav('tasks')}
          />
          <StatCard
            label="Today's Events"
            value={todayEvents.length}
            sub={upcomingEvents.length > 0 ? `${upcomingEvents.length} upcoming` : 'None upcoming'}
            color="text-amber-400"
            icon={CalendarDays}
            onClick={() => onNav('calendar')}
          />
          <StatCard
            label="Active Agents"
            value={activeAgents.length}
            sub={`${team.length} total team`}
            color="text-emerald-400"
            icon={Users}
            onClick={() => onNav('office')}
          />
        </div>

        {/* Time stats card */}
        {timeStats && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-accent-hover" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold">Time Stats</h2>
              <button onClick={() => onNav('tasks')} className="ml-auto text-xs text-text-muted hover:text-accent-hover transition-colors flex items-center gap-1">
                Tasks <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-violet-400">{formatMinutes(timeStats.totalToday)}</div>
                <div className="text-[0.65rem] text-text-muted mt-0.5">tracked today</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-sky-400">{formatMinutes(timeStats.avgPerTask)}</div>
                <div className="text-[0.65rem] text-text-muted mt-0.5">avg per task</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-400">{timeStats.noEstimate}</div>
                <div className="text-[0.65rem] text-text-muted mt-0.5">no estimate</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Tasks in progress */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-hover" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold">In Progress</h2>
              <span className="ml-auto text-xs text-text-muted">{inProgressTasks.length} tasks</span>
              <button onClick={() => onNav('tasks')} className="text-xs text-text-muted hover:text-accent-hover transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {inProgressTasks.length === 0 ? (
              <p className="text-xs text-text-muted py-2 text-center">No tasks in progress</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {inProgressTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-surface2 border border-border">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-xs flex-1 min-w-0 truncate">{task.title}</span>
                    {task.timeSpent && task.timeSpent > 0 && (
                      <span className="text-[0.6rem] text-text-muted bg-surface border border-border px-1.5 py-0.5 rounded flex-shrink-0">
                        {formatMinutes(task.timeSpent)}
                      </span>
                    )}
                    {task.assignee && (
                      <span className="text-[0.65rem] text-text-muted flex-shrink-0">{task.assignee}</span>
                    )}
                  </div>
                ))}
                {inProgressTasks.length > 5 && (
                  <button onClick={() => onNav('tasks')} className="text-xs text-text-muted hover:text-accent-hover text-center py-1 transition-colors">
                    +{inProgressTasks.length - 5} more
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Upcoming events */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-hover" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold">Upcoming (7 days)</h2>
              <button onClick={() => onNav('calendar')} className="ml-auto text-xs text-text-muted hover:text-accent-hover transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-text-muted py-2 text-center">No upcoming events</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {upcomingEvents.slice(0, 5).map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-surface2 border border-border">
                    <div className="flex-shrink-0 text-center min-w-[32px]">
                      <div className="text-[0.6rem] text-text-muted">{new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
                      <div className="text-xs font-bold text-accent-hover leading-none">{new Date(ev.date + 'T12:00:00').getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{ev.title}</div>
                      {ev.time && <div className="text-[0.6rem] text-text-muted">{ev.time}</div>}
                    </div>
                    {ev.type && (
                      <span className="text-[0.6rem] text-text-muted bg-surface border border-border px-1.5 py-0.5 rounded flex-shrink-0">{ev.type}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-accent-hover" strokeWidth={1.8} />
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <button onClick={() => onNav('activity')} className="ml-auto text-xs text-text-muted hover:text-accent-hover transition-colors flex items-center gap-1">
              All activity <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">No activity yet — create something!</p>
          ) : (
            <div className="flex flex-col gap-0">
              {recentActivity.slice(0, 10).map((entry, idx) => (
                <div key={entry.id} className={`flex items-start gap-3 py-2 ${idx < recentActivity.slice(0,10).length - 1 ? 'border-b border-border' : ''}`}>
                  <span className="text-sm flex-shrink-0 w-5 text-center">{ACTIVITY_ICONS[entry.type] || '•'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className={`text-[0.7rem] font-semibold ${ACTION_COLORS[entry.action] || 'text-text-muted'}`}>{entry.action}</span>
                      <span className="text-xs truncate">{entry.title}</span>
                    </div>
                    {entry.description && (
                      <span className="text-[0.65rem] text-text-muted">{entry.description}</span>
                    )}
                  </div>
                  <span className="text-[0.6rem] text-text-muted flex-shrink-0 whitespace-nowrap">{timeAgo(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task progress bar */}
        {taskStats && taskStats.total > 0 && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-dim">Task Progress</span>
              <span className="text-xs text-text-muted">{taskStats.done}/{taskStats.total} done</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-surface2 gap-px">
              {taskStats.done > 0 && (
                <div className="bg-emerald-500 transition-all" style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }} />
              )}
              {taskStats.review > 0 && (
                <div className="bg-amber-500 transition-all" style={{ width: `${(taskStats.review / taskStats.total) * 100}%` }} />
              )}
              {taskStats.inProgress > 0 && (
                <div className="bg-blue-500 transition-all" style={{ width: `${(taskStats.inProgress / taskStats.total) * 100}%` }} />
              )}
              {taskStats.backlog > 0 && (
                <div className="bg-zinc-600 transition-all" style={{ width: `${(taskStats.backlog / taskStats.total) * 100}%` }} />
              )}
            </div>
            <div className="flex gap-3 mt-2">
              {[
                { label: 'Done', count: taskStats.done, color: 'bg-emerald-500' },
                { label: 'Review', count: taskStats.review, color: 'bg-amber-500' },
                { label: 'Active', count: taskStats.inProgress, color: 'bg-blue-500' },
                { label: 'Backlog', count: taskStats.backlog, color: 'bg-zinc-600' },
              ].map(s => s.count > 0 && (
                <div key={s.label} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-[0.65rem] text-text-muted">{s.label}: {s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
