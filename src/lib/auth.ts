import { cookies, headers } from 'next/headers';
import { validSession, getApiKey } from './data';

export async function requireAuth(): Promise<boolean> {
  // Localhost exempt
  const hdrs = await headers();
  const host = hdrs.get('host') || '';
  const forwarded = hdrs.get('x-forwarded-for') || '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1') ||
      forwarded.startsWith('127.0.0.1') || forwarded.startsWith('::1')) {
    return true;
  }

  // API key
  const authHeader = hdrs.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const key = getApiKey();
    if (key && authHeader.slice(7) === key) return true;
  }

  // Session cookie
  const cookieStore = await cookies();
  const session = cookieStore.get('dash_session')?.value;
  if (session && validSession(session)) return true;

  return false;
}
