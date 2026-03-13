import { NextRequest, NextResponse } from 'next/server';
import { getTasks, saveTasks, broadcastSSE } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(getTasks());
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const tasks = getTasks();
  const task = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  tasks.push(task);
  saveTasks(tasks);
  broadcastSSE('tasks', tasks);
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const tasks = getTasks();
  const idx = tasks.findIndex((t: { id: string }) => t.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  tasks[idx] = { ...tasks[idx], ...body, updatedAt: new Date().toISOString() };
  saveTasks(tasks);
  broadcastSSE('tasks', tasks);
  return NextResponse.json(tasks[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let tasks = getTasks();
  tasks = tasks.filter((t: { id: string }) => t.id !== id);
  saveTasks(tasks);
  broadcastSSE('tasks', tasks);
  return NextResponse.json({ ok: true });
}
