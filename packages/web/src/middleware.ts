import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-constants';
import { corsHeaders } from '@/lib/api-helpers';

const WINDOW_MS = 60_000;
const MAX_REQ = 100;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown'
  );
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || now > e.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (e.count >= MAX_REQ) return false;
  e.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const cors = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: cors });
    }

    const ip = clientIp(request);
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: 60 },
        { status: 429, headers: { ...cors, 'Retry-After': '60' } },
      );
    }

    const needsLegacyDynamoCookie =
      pathname === '/api/session' && (request.method === 'PUT' || request.method === 'DELETE');

    if (needsLegacyDynamoCookie && !request.cookies.get(SESSION_COOKIE)?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: cors });
    }

    const res = NextResponse.next();
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
