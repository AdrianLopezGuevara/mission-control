import { NextRequest, NextResponse } from 'next/server';
import { getMemoryFiles, searchMemory } from '@/lib/data';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const q = req.nextUrl.searchParams.get('q');
  if (q) return NextResponse.json(searchMemory(q));
  return NextResponse.json(getMemoryFiles());
}
