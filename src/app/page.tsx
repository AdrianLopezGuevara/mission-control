'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import KanbanBoard from '@/components/KanbanBoard';
import ContentPipeline from '@/components/ContentPipeline';
import CalendarView from '@/components/CalendarView';
import TeamView from '@/components/TeamView';
import MemoryView from '@/components/MemoryView';
import OfficeView from '@/components/OfficeView';
import LoginScreen from '@/components/LoginScreen';
import TaskModal from '@/components/TaskModal';
import EventModal from '@/components/EventModal';
import MemberModal from '@/components/MemberModal';
import DashboardHome from '@/components/DashboardHome';
import ActivityFeed from '@/components/ActivityFeed';
import NotesView from '@/components/NotesView';
import ServicesView from '@/components/ServicesView';
import NotificationPanel from '@/components/NotificationPanel';

interface AppNotification {
  id: string;
  type: 'task' | 'calendar' | 'system' | 'mention';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

interface AppStats {
  tasks?: { total: number; backlog: number; inProgress: number; review: number; done: number };
  content?: { total: number; byStage: Record<string, number> };
  calendar?: { upcoming: unknown[]; today: unknown[] };
  team?: { total: number; active: number };
  timeStats?: { totalToday: number; avgPerTask: number; noEstimate: number };
  recentActivity?: unknown[];
}

export default function Home() {
  const [authState, setAuthState] = useState<'loading' | 'login' | 'setup' | 'ready'>('loading');
  const [view, setView] = useState('home');
  const [prevView, setPrevView] = useState('home');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [calendar, setCalendar] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [team, setTeam] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [memory, setMemory] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [officeAgents, setOfficeAgents] = useState<any[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState<AppStats>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // Modal state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [taskModal, setTaskModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editTask, setEditTask] = useState<Record<string, unknown> | null>(null);
  const [eventModal, setEventModal] = useState(false);
  const [editEvent, setEditEvent] = useState<Record<string, unknown> | null>(null);
  const [memberModal, setMemberModal] = useState(false);
  const [editMember, setEditMember] = useState<Record<string, unknown> | null>(null);

  const loadStats = useCallback(async () => {
    const r = await fetch('/api/stats');
    if (r.ok) setStats(await r.json());
  }, []);

  const loadNotifications = useCallback(async () => {
    const r = await fetch('/api/notifications');
    if (r.ok) setNotifications(await r.json());
  }, []);

  const loadAll = useCallback(async () => {
    const [t, c, cal, tm, mem, off] = await Promise.all([
      fetch('/api/tasks').then(r => r.ok ? r.json() : []),
      fetch('/api/content').then(r => r.ok ? r.json() : []),
      fetch('/api/calendar').then(r => r.ok ? r.json() : []),
      fetch('/api/team').then(r => r.ok ? r.json() : []),
      fetch('/api/memory').then(r => r.ok ? r.json() : []),
      fetch('/api/office').then(r => r.ok ? r.json() : []),
    ]);
    setTasks(t); setContent(c); setCalendar(cal); setTeam(tm); setMemory(mem); setOfficeAgents(off);
    loadStats();
    loadNotifications();
  }, [loadStats, loadNotifications]);

  useEffect(() => {
    fetch('/api/auth?action=status')
      .then(r => r.json())
      .then(data => {
        if (data.needsSetup) setAuthState('setup');
        else if (data.authenticated) { setAuthState('ready'); loadAll(); }
        else setAuthState('login');
      })
      .catch(() => { setAuthState('ready'); loadAll(); });
  }, [loadAll]);

  // Poll office status every 2s when on office view
  useEffect(() => {
    if (authState !== 'ready' || view !== 'office') return;
    const poll = setInterval(async () => {
      const r = await fetch('/api/office');
      if (r.ok) setOfficeAgents(await r.json());
    }, 2000);
    return () => clearInterval(poll);
  }, [authState, view]);

  // Refresh stats when on home view
  useEffect(() => {
    if (authState !== 'ready' || view !== 'home') return;
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [authState, view, loadStats]);

  useEffect(() => {
    if (authState !== 'ready') return;
    const es = new EventSource('/api/events');
    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);
    es.addEventListener('tasks', (e) => { setTasks(JSON.parse(e.data)); loadStats(); });
    es.addEventListener('content', (e) => { setContent(JSON.parse(e.data)); loadStats(); });
    es.addEventListener('calendar', (e) => { setCalendar(JSON.parse(e.data)); loadStats(); });
    es.addEventListener('team', (e) => { setTeam(JSON.parse(e.data)); });
    es.addEventListener('notifications', (e) => setNotifications(JSON.parse(e.data)));
    return () => { es.close(); setSseConnected(false); };
  }, [authState, loadStats]);

  function handleNav(newView: string) {
    setPrevView(view);
    setView(newView);
  }

  // CRUD helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function saveTask(task: any) {
    const method = task.id ? 'PUT' : 'POST';
    await fetch('/api/tasks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
  }
  async function deleteTask(id: string) {
    await fetch('/api/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function updateTaskDrag(task: any) {
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function updateContentDrag(item: any) {
    await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function saveEvent(ev: any) {
    const method = ev.id ? 'PUT' : 'POST';
    await fetch('/api/calendar', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) });
  }
  async function deleteEvent(id: string) {
    await fetch('/api/calendar', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function saveMember(m: any) {
    const method = m.id ? 'PUT' : 'POST';
    await fetch('/api/team', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) });
  }
  async function deleteMember(id: string) {
    await fetch('/api/team', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  }

  async function handleMarkNotifRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function handleMarkAllRead() {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function handleAuth() { setAuthState('ready'); loadAll(); }
  async function handleLogout() {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    setAuthState('login');
  }

  function openEventModalForDate(date: string) {
    setPrefillDate(date);
    setEditEvent(null);
    setEventModal(true);
  }

  if (authState === 'loading') return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted text-sm">Loading...</div>;
  if (authState === 'login' || authState === 'setup') return <LoginScreen needsSetup={authState === 'setup'} onAuth={handleAuth} />;

  const badges = {
    tasks: tasks.length,
    calendar: calendar.length,
    team: team.length,
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar
        active={view}
        onNav={handleNav}
        onLogout={handleLogout}
        sseConnected={sseConnected}
        badges={badges}
        notifCount={unreadNotifCount}
        onNotifClick={() => setNotifPanelOpen(o => !o)}
      />
      <main className="flex-1 overflow-hidden pb-14 md:pb-0">
        <div key={view} className="view-fade h-full">
          {view === 'home' && (
            <DashboardHome
              tasks={tasks}
              content={content}
              calendar={calendar}
              team={team}
              officeAgents={officeAgents}
              onNav={handleNav}
              stats={stats}
            />
          )}
          {view === 'tasks' && (
            <KanbanBoard
              tasks={tasks}
              onUpdate={updateTaskDrag}
              onAdd={() => { setEditTask(null); setTaskModal(true); }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onEdit={(task: any) => { setEditTask(task); setTaskModal(true); }}
            />
          )}
          {view === 'content' && (
            <ContentPipeline
              content={content}
              onUpdate={updateContentDrag}
              onAdd={() => {}}
            />
          )}
          {view === 'calendar' && (
            <CalendarView
              events={calendar}
              onAdd={() => { setPrefillDate(undefined); setEditEvent(null); setEventModal(true); }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onEdit={(ev: any) => { setEditEvent(ev); setEventModal(true); }}
              onDayClick={openEventModalForDate}
            />
          )}
          {view === 'team' && (
            <TeamView
              members={team}
              officeAgents={officeAgents}
              onAdd={() => { setEditMember(null); setMemberModal(true); }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onEdit={(m: any) => { setEditMember(m); setMemberModal(true); }}
            />
          )}
          {view === 'office' && <OfficeView agents={officeAgents} />}
          {view === 'services' && <ServicesView />}
          {view === 'notes' && <NotesView />}
          {view === 'activity' && <ActivityFeed />}
          {view === 'memory' && <MemoryView files={memory} />}
        </div>
      </main>

      {/* Notification Panel */}
      <NotificationPanel
        open={notifPanelOpen}
        onClose={() => setNotifPanelOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
        onMarkAllRead={handleMarkAllRead}
        onNav={handleNav}
      />

      {/* Modals */}
      <TaskModal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        onSave={saveTask}
        onDelete={deleteTask}
        task={editTask as never}
      />
      <EventModal
        open={eventModal}
        onClose={() => { setEventModal(false); setPrefillDate(undefined); }}
        onSave={saveEvent}
        onDelete={deleteEvent}
        event={editEvent as never}
        prefillDate={prefillDate}
      />
      <MemberModal
        open={memberModal}
        onClose={() => setMemberModal(false)}
        onSave={saveMember}
        onDelete={deleteMember}
        member={editMember as never}
      />
    </div>
  );
}
