import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyMessage, getAddress, isAddress } from 'viem';
import { createSession, deleteSession, getSession, updateSession } from '@/lib/dynamodb';
import { errorJson, json, withCors } from '@/lib/api-helpers';
import { SESSION_COOKIE } from '@/lib/session-constants';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseSiweAddress(message: string): `0x${string}` | null {
  const lines = message.split('\n').map((l) => l.trim());
  for (const line of lines) {
    if (line.startsWith('0x') && isAddress(line)) {
      return getAddress(line);
    }
  }
  return null;
}

function parseNonce(message: string): string | null {
  const m = message.match(/nonce:\s*([^\n]+)/i);
  return m?.[1]?.trim() ?? null;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/** POST — SIWE sign-in: verify signature, create DynamoDB session, set httpOnly cookie. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string; signature?: `0x${string}` };
    const { message, signature } = body;
    if (!message || !signature) {
      return errorJson('message and signature are required', 400);
    }
    const address = parseSiweAddress(message);
    if (!address) {
      return errorJson('Could not parse wallet address from SIWE message', 400);
    }
    const valid = await verifyMessage({ address, message, signature });
    if (!valid) {
      return errorJson('Invalid SIWE signature', 401);
    }
    const nonce = parseNonce(message);
    if (!nonce) {
      return errorJson('SIWE message must include a nonce line', 400);
    }
    const sessionId = randomUUID();
    await createSession(sessionId, address, {
      nonce,
      riskScores: [],
      preferences: {},
    });
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    cookies().set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    return json({ sessionId, expiresAt, walletAddress: address }, 201);
  } catch (e) {
    console.error(e);
    return errorJson('Failed to create session', 500);
  }
}

/** GET — load session by query ?sessionId= or cookie. */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('sessionId');
    const sid = q || cookies().get(SESSION_COOKIE)?.value;
    if (!sid) {
      return errorJson('sessionId query or session cookie required', 400);
    }
    const session = await getSession(sid);
    if (!session) {
      return errorJson('Session not found or expired', 404);
    }
    return json({
      sessionId: session.sessionId,
      walletAddress: session.walletAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity,
      riskScores: session.riskScores,
      preferences: session.preferences,
    });
  } catch (e) {
    console.error(e);
    return errorJson('Failed to read session', 500);
  }
}

function resolveSessionId(request: NextRequest): string | null {
  return request.headers.get('x-session-id') || cookies().get(SESSION_COOKIE)?.value || null;
}

/** PUT — merge session fields (requires valid session). */
export async function PUT(request: NextRequest) {
  try {
    const sessionId = resolveSessionId(request);
    if (!sessionId) {
      return errorJson('Missing X-Session-Id header or session cookie', 401);
    }
    const existing = await getSession(sessionId);
    if (!existing) {
      return errorJson('Session not found or expired', 404);
    }
    const patch = (await request.json()) as Record<string, unknown>;
    const allowed: Partial<typeof existing> = {};
    if (Array.isArray(patch.riskScores)) allowed.riskScores = patch.riskScores as number[];
    if (patch.preferences && typeof patch.preferences === 'object')
      allowed.preferences = { ...existing.preferences, ...(patch.preferences as object) };
    if (typeof patch.nonce === 'string') allowed.nonce = patch.nonce;
    await updateSession(sessionId, allowed);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return errorJson('Failed to update session', 500);
  }
}

/** DELETE — logout. */
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = resolveSessionId(request);
    if (!sessionId) {
      return errorJson('Missing X-Session-Id header or session cookie', 401);
    }
    await deleteSession(sessionId);
    cookies().set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return errorJson('Failed to delete session', 500);
  }
}
