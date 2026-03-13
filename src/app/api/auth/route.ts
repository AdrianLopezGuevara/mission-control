import { NextRequest, NextResponse } from 'next/server';
import { getAuth, saveAuth, hashPassword, createSession, deleteSession, validSession } from '@/lib/data';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'status';
  const auth = getAuth();
  
  if (action === 'status') {
    if (!auth) return NextResponse.json({ needsSetup: true });
    const cookieStore = await cookies();
    const session = cookieStore.get('dash_session')?.value;
    if (session && validSession(session)) return NextResponse.json({ authenticated: true });
    return NextResponse.json({ authenticated: false });
  }
  
  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, password } = body;
  
  if (action === 'setup') {
    if (getAuth()) return NextResponse.json({ error: 'already setup' }, { status: 400 });
    const { hash, salt } = hashPassword(password);
    saveAuth({ hash, salt });
    const sessionId = createSession();
    const res = NextResponse.json({ ok: true });
    res.cookies.set('dash_session', sessionId, { httpOnly: true, sameSite: 'lax', maxAge: 604800, path: '/' });
    return res;
  }
  
  if (action === 'login') {
    const auth = getAuth();
    if (!auth) return NextResponse.json({ error: 'not setup' }, { status: 400 });
    const { hash } = hashPassword(password, auth.salt);
    if (hash !== auth.hash) return NextResponse.json({ error: 'wrong password' }, { status: 401 });
    const sessionId = createSession();
    const res = NextResponse.json({ ok: true });
    res.cookies.set('dash_session', sessionId, { httpOnly: true, sameSite: 'lax', maxAge: 604800, path: '/' });
    return res;
  }
  
  if (action === 'logout') {
    const cookieStore = await cookies();
    const session = cookieStore.get('dash_session')?.value;
    if (session) deleteSession(session);
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('dash_session');
    return res;
  }
  
  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
