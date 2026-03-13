import { NextRequest, NextResponse } from 'next/server';
import { getNotes, saveNotes, logActivity } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export async function GET(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase();
  let notes = getNotes() as Note[];
  if (q) {
    notes = notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const notes = getNotes() as Note[];
  const now = new Date().toISOString();
  const note: Note = {
    id: crypto.randomUUID(),
    title: body.title || 'Untitled',
    content: body.content || '',
    category: body.category || 'general',
    tags: body.tags || [],
    pinned: body.pinned || false,
    createdAt: now,
    updatedAt: now,
    createdBy: body.createdBy || 'system',
  };
  notes.unshift(note);
  saveNotes(notes);
  logActivity({ type: 'note', action: 'created', title: note.title, agent: note.createdBy });
  return NextResponse.json(note, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const notes = getNotes() as Note[];
  const idx = notes.findIndex(n => n.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  notes[idx] = { ...notes[idx], ...body, updatedAt: new Date().toISOString() };
  saveNotes(notes);
  logActivity({ type: 'note', action: 'updated', title: notes[idx].title, agent: notes[idx].createdBy });
  return NextResponse.json(notes[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let notes = getNotes() as Note[];
  const note = notes.find(n => n.id === id);
  notes = notes.filter(n => n.id !== id);
  saveNotes(notes);
  if (note) logActivity({ type: 'note', action: 'deleted', title: note.title, agent: note.createdBy });
  return NextResponse.json({ ok: true });
}
