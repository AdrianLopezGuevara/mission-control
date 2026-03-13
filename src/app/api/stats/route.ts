import { NextResponse } from 'next/server';
import { getTasks, getContent, getCalendar, getTeam, getActivity } from '@/lib/data';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tasks = getTasks();
  const content = getContent();
  const calendar = getCalendar();
  const team = getTeam();
  const activity = getActivity();

  // Task stats
  const taskStats = {
    total: tasks.length,
    backlog: tasks.filter((t: { status: string }) => t.status === 'backlog').length,
    inProgress: tasks.filter((t: { status: string }) => t.status === 'in-progress').length,
    review: tasks.filter((t: { status: string }) => t.status === 'review').length,
    done: tasks.filter((t: { status: string }) => t.status === 'done').length,
  };

  // Content stats
  const byStage: Record<string, number> = {};
  for (const c of content) {
    const stage = (c as { stage?: string }).stage || 'unknown';
    byStage[stage] = (byStage[stage] || 0) + 1;
  }

  // Calendar stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayEvents = calendar.filter((e: { date?: string }) => e.date === todayStr);
  const upcomingEvents = calendar.filter((e: { date?: string }) => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d >= today && d <= in7Days;
  }).sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));

  // Team stats
  interface TeamMember { status?: string }
  const activeMembers = team.filter((m: TeamMember) => m.status === 'active' || m.status === 'online').length;

  // Time stats (today)
  const todayStart = today.getTime();
  interface TaskWithTime {
    timeSpent?: number;
    timeEstimate?: number;
    status: string;
    statusHistory?: { status: string; timestamp: string }[];
    updatedAt?: string;
  }
  const tasksWithTime = tasks.filter((t: TaskWithTime) => (t.timeSpent || 0) > 0);
  const totalTimeToday = tasks.reduce((sum: number, t: TaskWithTime) => {
    // Count time added today
    const history = t.statusHistory || [];
    const activeStatuses = new Set(['in-progress', 'review']);
    let todayTime = 0;
    for (let i = 0; i < history.length - 1; i++) {
      if (activeStatuses.has(history[i].status)) {
        const start = Math.max(new Date(history[i].timestamp).getTime(), todayStart);
        const end = new Date(history[i + 1].timestamp).getTime();
        if (end > todayStart) todayTime += Math.max(0, end - start);
      }
    }
    if (history.length > 0 && activeStatuses.has(history[history.length - 1].status)) {
      const start = Math.max(new Date(history[history.length - 1].timestamp).getTime(), todayStart);
      todayTime += Math.max(0, Date.now() - start);
    }
    return sum + Math.floor(todayTime / 60000);
  }, 0);

  const tasksWithEstimate = tasks.filter((t: TaskWithTime) => (t.timeEstimate || 0) > 0).length;
  const tasksNoEstimate = tasks.length - tasksWithEstimate;
  const avgTimePerTask = tasksWithTime.length > 0
    ? Math.round(tasksWithTime.reduce((s: number, t: TaskWithTime) => s + (t.timeSpent || 0), 0) / tasksWithTime.length)
    : 0;

  return NextResponse.json({
    tasks: taskStats,
    content: { total: content.length, byStage },
    calendar: { upcoming: upcomingEvents.slice(0, 10), today: todayEvents },
    team: { total: team.length, active: activeMembers },
    timeStats: {
      totalToday: totalTimeToday,
      avgPerTask: avgTimePerTask,
      noEstimate: tasksNoEstimate,
    },
    recentActivity: activity.slice(0, 20),
  });
}
