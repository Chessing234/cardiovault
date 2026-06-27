import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './session';

export async function getIronAuthSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function requireIronAuth(): Promise<SessionData & { address: `0x${string}` }> {
  const session = await getIronAuthSession();
  if (session.isAuthenticated !== true || !session.address) {
    throw new Error('Unauthorized');
  }
  return session as SessionData & { address: `0x${string}` };
}
