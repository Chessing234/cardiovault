import type { NextRequest } from 'next/server';
import { errorJson, json } from '@/lib/api-helpers';
import { getIronAuthSession } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

function pinataHeaders(): Record<string, string> | null {
  const jwt = process.env.PINATA_JWT?.trim();
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }
  const key = process.env.PINATA_API_KEY?.trim();
  const secret = process.env.PINATA_SECRET_KEY?.trim();
  if (key && secret) {
    return {
      pinata_api_key: key,
      pinata_secret_api_key: secret,
    };
  }
  return null;
}

/** DELETE ?cid= — unpin from Pinata (requires server Pinata credentials). */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getIronAuthSession();
    if (session.isAuthenticated !== true || !session.address) {
      return errorJson('Unauthorized', 401);
    }

    const cid = request.nextUrl.searchParams.get('cid')?.trim();
    if (!cid) {
      return errorJson('cid is required', 400);
    }

    const headers = pinataHeaders();
    if (!headers) {
      return errorJson('Pinata is not configured', 503);
    }

    const res = await fetch(`https://api.pinata.cloud/pinning/unpin/${encodeURIComponent(cid)}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      console.error('Pinata unpin', res.status, text);
      return errorJson(`Pinata unpin failed: ${res.statusText}`, 502);
    }

    return json({ ok: true, cid });
  } catch (e) {
    console.error(e);
    return errorJson('Unpin failed', 500);
  }
}
