import { NextRequest, NextResponse } from 'next/server';
import { getContent, saveContent, broadcastSSE, logActivity } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(getContent());
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const content = getContent();
  const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  content.push(item);
  saveContent(content);
  broadcastSSE('content', content);
  logActivity({ type: 'content', action: 'created', title: item.title || 'Content', agent: 'system' });
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const content = getContent();
  const idx = content.findIndex((c: { id: string }) => c.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const old = content[idx];
  content[idx] = { ...old, ...body, updatedAt: new Date().toISOString() };
  saveContent(content);
  broadcastSSE('content', content);
  if (body.stage && body.stage !== old.stage) {
    logActivity({ type: 'content', action: 'moved', title: content[idx].title || 'Content', description: `${old.stage} → ${body.stage}`, agent: 'system' });
  } else {
    logActivity({ type: 'content', action: 'updated', title: content[idx].title || 'Content', agent: 'system' });
  }
  return NextResponse.json(content[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let content = getContent();
  const item = content.find((c: { id: string }) => c.id === id);
  content = content.filter((c: { id: string }) => c.id !== id);
  saveContent(content);
  broadcastSSE('content', content);
  if (item) logActivity({ type: 'content', action: 'deleted', title: item.title || 'Content', agent: 'system' });
  return NextResponse.json({ ok: true });
}
