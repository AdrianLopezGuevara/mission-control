import { NextRequest, NextResponse } from 'next/server';
import { getTeam, saveTeam, broadcastSSE } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(getTeam());
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const team = getTeam();
  const member = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
  team.push(member);
  saveTeam(team);
  broadcastSSE('team', team);
  return NextResponse.json(member, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const team = getTeam();
  const idx = team.findIndex((m: { id: string }) => m.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  team[idx] = { ...team[idx], ...body };
  saveTeam(team);
  broadcastSSE('team', team);
  return NextResponse.json(team[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let team = getTeam();
  team = team.filter((m: { id: string }) => m.id !== id);
  saveTeam(team);
  broadcastSSE('team', team);
  return NextResponse.json({ ok: true });
}
