import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import { withCors } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/** GET /api/auth/session — current iron-session status. */
export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (session.isAuthenticated !== true || !session.address) {
    return withCors(NextResponse.json({ isAuthenticated: false }, { status: 401 }));
  }

  return withCors(
    NextResponse.json({
      isAuthenticated: true,
      address: session.address,
      role: session.role,
      tokenId: session.tokenId,
    }),
  );
}
