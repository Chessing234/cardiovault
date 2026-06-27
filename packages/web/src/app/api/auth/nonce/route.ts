import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { generateNonce } from '@/lib/siwe';
import { sessionOptions, type SessionData } from '@/lib/session';
import { withCors } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/nonce — issue a fresh SIWE nonce bound to the sealed session cookie.
 */
export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const nonce = generateNonce();
  session.nonce = nonce;
  session.isAuthenticated = false;
  session.address = undefined;
  session.tokenId = undefined;
  session.role = undefined;
  await session.save();
  return withCors(NextResponse.json({ nonce }));
}
