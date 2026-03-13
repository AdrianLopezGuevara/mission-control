import { NextRequest, NextResponse } from 'next/server';
import { getCalendar, saveCalendar, broadcastSSE } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(getCalendar());
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const cal = getCalendar();
  const event = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  cal.push(event);
  saveCalendar(cal);
  broadcastSSE('calendar', cal);
  return NextResponse.json(event, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const cal = getCalendar();
  const idx = cal.findIndex((e: { id: string }) => e.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  cal[idx] = { ...cal[idx], ...body, updatedAt: new Date().toISOString() };
  saveCalendar(cal);
  broadcastSSE('calendar', cal);
  return NextResponse.json(cal[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let cal = getCalendar();
  cal = cal.filter((e: { id: string }) => e.id !== id);
  saveCalendar(cal);
  broadcastSSE('calendar', cal);
  return NextResponse.json({ ok: true });
}
