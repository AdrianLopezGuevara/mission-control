import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, saveNotifications, broadcastSSE, AppNotification } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(getNotifications());
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const notifications = getNotifications() as AppNotification[];
  const notif: AppNotification = {
    id: crypto.randomUUID(),
    type: body.type || 'system',
    title: body.title || '',
    message: body.message || '',
    read: false,
    actionUrl: body.actionUrl,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(notif);
  if (notifications.length > 100) notifications.splice(100);
  saveNotifications(notifications);
  broadcastSSE('notifications', notifications);
  return NextResponse.json(notif, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const notifications = getNotifications() as AppNotification[];

  if (body.markAllRead) {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
    broadcastSSE('notifications', updated);
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    const idx = notifications.findIndex(n => n.id === body.id);
    if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
    notifications[idx] = { ...notifications[idx], ...body };
    saveNotifications(notifications);
    broadcastSSE('notifications', notifications);
    return NextResponse.json(notifications[idx]);
  }

  return NextResponse.json({ error: 'bad request' }, { status: 400 });
}
