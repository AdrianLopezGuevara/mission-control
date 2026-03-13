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

export default function Home() {
  const [authState, setAuthState] = useState<'loading' | 'login' | 'setup' | 'ready'>('loading');
  const [view, setView] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [content, setContent] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [team, setTeam] = useState([]);
  const [memory, setMemory] = useState([]);
  const [officeAgents, setOfficeAgents] = useState([]);

  // Modal state
  const [taskModal, setTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<Record<string, unknown> | null>(null);
  const [eventModal, setEventModal] = useState(false);
  const [editEvent, setEditEvent] = useState<Record<string, unknown> | null>(null);
  const [memberModal, setMemberModal] = useState(false);
  const [editMember, setEditMember] = useState<Record<string, unknown> | null>(null);

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
  }, []);

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

  useEffect(() => {
    if (authState !== 'ready') return;
    const es = new EventSource('/api/events');
    es.addEventListener('tasks', (e) => setTasks(JSON.parse(e.data)));
    es.addEventListener('content', (e) => setContent(JSON.parse(e.data)));
    es.addEventListener('calendar', (e) => setCalendar(JSON.parse(e.data)));
    es.addEventListener('team', (e) => setTeam(JSON.parse(e.data)));
    return () => es.close();
  }, [authState]);

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

  async function handleAuth() { setAuthState('ready'); loadAll(); }
  async function handleLogout() {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    setAuthState('login');
  }

  if (authState === 'loading') return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted text-sm">Loading...</div>;
  if (authState === 'login' || authState === 'setup') return <LoginScreen needsSetup={authState === 'setup'} onAuth={handleAuth} />;

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar active={view} onNav={setView} onLogout={handleLogout} />
      <main className="flex-1 overflow-hidden pb-14 md:pb-0">
        {view === 'tasks' && (
          <KanbanBoard
            tasks={tasks}
            onUpdate={updateTaskDrag}
            onAdd={() => { setEditTask(null); setTaskModal(true); }}
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
            onAdd={() => { setEditEvent(null); setEventModal(true); }}
            onEdit={(ev: any) => { setEditEvent(ev); setEventModal(true); }}
          />
        )}
        {view === 'team' && (
          <TeamView
            members={team}
            onAdd={() => { setEditMember(null); setMemberModal(true); }}
            onEdit={(m: any) => { setEditMember(m); setMemberModal(true); }}
          />
        )}
        {view === 'office' && <OfficeView agents={officeAgents} />}
        {view === 'memory' && <MemoryView files={memory} />}
      </main>

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
        onClose={() => setEventModal(false)}
        onSave={saveEvent}
        onDelete={deleteEvent}
        event={editEvent as never}
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
