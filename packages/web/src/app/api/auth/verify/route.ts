import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SiweMessage } from 'siwe';
import { verifySIWEMessage } from '@/lib/siwe';
import { sessionOptions, type SessionData } from '@/lib/session';
import { withCors } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/verify — verify SIWE and establish iron-session.
 * Body: { message: string, signature: `0x${string}` }
 */
export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  try {
    const body = (await request.json()) as { message?: string; signature?: `0x${string}` };
    const { message, signature } = body;
    if (!message || !signature) {
      return withCors(NextResponse.json({ error: 'message and signature required' }, { status: 400 }));
    }

    const { valid, address, error } = await verifySIWEMessage(message, signature);
    if (!valid || !address) {
      return withCors(NextResponse.json({ error: error ?? 'Invalid signature' }, { status: 401 }));
    }

    const siweMessage = new SiweMessage(message);
    if (!session.nonce || siweMessage.nonce !== session.nonce) {
      return withCors(NextResponse.json({ error: 'Invalid nonce' }, { status: 401 }));
    }

    session.isAuthenticated = true;
    session.address = address;
    session.nonce = undefined;
    session.role = 'patient';
    await session.save();

    return withCors(
      NextResponse.json({
        success: true,
        address,
        role: session.role,
      }),
    );
  } catch (err: unknown) {
    console.error('Auth verification error:', err);
    return withCors(NextResponse.json({ error: 'Authentication failed' }, { status: 500 }));
  }
}
