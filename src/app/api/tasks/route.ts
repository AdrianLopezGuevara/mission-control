import { NextRequest, NextResponse } from 'next/server';
import { getTasks, saveTasks, broadcastSSE, logActivity } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

interface TaskRecord {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  timeSpent?: number;
  timeEstimate?: number;
  statusHistory?: { status: string; timestamp: string }[];
  updatedAt?: string;
}

function calculateTimeSpent(history: { status: string; timestamp: string }[]): number {
  // Count time spent in non-backlog, non-done statuses
  const activeStatuses = new Set(['in-progress', 'review']);
  let total = 0;
  for (let i = 0; i < history.length - 1; i++) {
    if (activeStatuses.has(history[i].status)) {
      const start = new Date(history[i].timestamp).getTime();
      const end = new Date(history[i + 1].timestamp).getTime();
      total += Math.max(0, end - start);
    }
  }
  // If currently in active status, count from last entry to now
  if (history.length > 0 && activeStatuses.has(history[history.length - 1].status)) {
    const start = new Date(history[history.length - 1].timestamp).getTime();
    total += Math.max(0, Date.now() - start);
  }
  return Math.floor(total / 60000); // Convert to minutes
}

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(getTasks());
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const tasks = getTasks();
  const task: TaskRecord = {
    id: crypto.randomUUID(),
    ...body,
    statusHistory: [{ status: body.status || 'backlog', timestamp: new Date().toISOString() }],
    timeSpent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveTasks(tasks);
  broadcastSSE('tasks', tasks);
  logActivity({
    type: 'task',
    action: 'created',
    title: task.title,
    agent: body.assignee || 'system',
  });
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const tasks = getTasks();
  const idx = tasks.findIndex((t: TaskRecord) => t.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const old = tasks[idx] as TaskRecord;
  const now = new Date().toISOString();

  // Track status changes
  let statusHistory = old.statusHistory || [{ status: old.status, timestamp: old.updatedAt || now }];
  if (body.status && body.status !== old.status) {
    statusHistory = [...statusHistory, { status: body.status, timestamp: now }];
  }

  const updated: TaskRecord = {
    ...old,
    ...body,
    statusHistory,
    updatedAt: now,
  };
  // Recalculate time spent
  updated.timeSpent = calculateTimeSpent(updated.statusHistory || []);

  tasks[idx] = updated;
  saveTasks(tasks);
  broadcastSSE('tasks', tasks);

  // Log activity
  if (body.status && body.status !== old.status) {
    const action = body.status === 'done' ? 'completed' : 'moved';
    logActivity({
      type: 'task',
      action,
      title: updated.title,
      description: `${old.status} → ${body.status}`,
      agent: updated.assignee || 'system',
      metadata: { oldStatus: old.status, newStatus: body.status },
    });
  } else {
    logActivity({
      type: 'task',
      action: 'updated',
      title: updated.title,
      agent: updated.assignee || 'system',
    });
  }

  return NextResponse.json(tasks[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let tasks = getTasks();
  const task = tasks.find((t: TaskRecord) => t.id === id);
  tasks = tasks.filter((t: TaskRecord) => t.id !== id);
  saveTasks(tasks);
  broadcastSSE('tasks', tasks);
  if (task) {
    logActivity({
      type: 'task',
      action: 'deleted',
      title: task.title,
      agent: task.assignee || 'system',
    });
  }
  return NextResponse.json({ ok: true });
}
