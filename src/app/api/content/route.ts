import { NextRequest, NextResponse } from 'next/server';
import { getContent, saveContent, broadcastSSE } from '@/lib/data';
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
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const content = getContent();
  const idx = content.findIndex((c: { id: string }) => c.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  content[idx] = { ...content[idx], ...body, updatedAt: new Date().toISOString() };
  saveContent(content);
  broadcastSSE('content', content);
  return NextResponse.json(content[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let content = getContent();
  content = content.filter((c: { id: string }) => c.id !== id);
  saveContent(content);
  broadcastSSE('content', content);
  return NextResponse.json({ ok: true });
}
