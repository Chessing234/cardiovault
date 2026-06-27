import { cookies } from 'next/headers';
import type { Session } from './dynamodb';
import { getSession } from './dynamodb';
import { SESSION_COOKIE } from './session-constants';

export { SESSION_COOKIE } from './session-constants';

export async function readSession(): Promise<Session | null> {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  return getSession(sid);
}

export function walletsMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
