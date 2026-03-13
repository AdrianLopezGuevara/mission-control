import { NextRequest, NextResponse } from 'next/server';
import { getActivity } from '@/lib/data';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const type = url.searchParams.get('type');
  let activity = getActivity();
  if (type && type !== 'all') {
    activity = activity.filter((a: { type: string }) => a.type === type);
  }
  return NextResponse.json(activity.slice(0, limit));
}
