import { NextResponse } from 'next/server';

const DEFAULT_ORIGIN = '*';

export function corsHeaders(): HeadersInit {
  const origin = process.env.CORS_ORIGIN ?? DEFAULT_ORIGIN;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Session-Id, X-Requested-With, X-Wallet-Address, X-Wallet-Signature',
    'Access-Control-Max-Age': '86400',
  };
}

export function withCors<T extends NextResponse | Response>(res: T): T {
  const h = corsHeaders();
  Object.entries(h).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export function json(data: unknown, init?: number | ResponseInit) {
  const status = typeof init === 'number' ? init : (init?.status ?? 200);
  const res = NextResponse.json(data, typeof init === 'number' ? { status } : { ...init, status });
  return withCors(res);
}

export function errorJson(message: string, status: number, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}
