import { NextRequest, NextResponse } from 'next/server';
import { getTeam, saveTeam, broadcastSSE, logActivity } from '@/lib/data';
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
  logActivity({ type: 'team', action: 'created', title: member.name || 'Team member', agent: 'system' });
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
  logActivity({ type: 'team', action: 'updated', title: team[idx].name || 'Team member', agent: 'system' });
  return NextResponse.json(team[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let team = getTeam();
  const member = team.find((m: { id: string }) => m.id === id);
  team = team.filter((m: { id: string }) => m.id !== id);
  saveTeam(team);
  broadcastSSE('team', team);
  if (member) logActivity({ type: 'team', action: 'deleted', title: member.name || 'Team member', agent: 'system' });
  return NextResponse.json({ ok: true });
}
