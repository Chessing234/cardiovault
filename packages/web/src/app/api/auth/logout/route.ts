import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import { withCors } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — destroy iron-session. */
export async function POST() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.destroy();
  return withCors(NextResponse.json({ success: true }));
}
