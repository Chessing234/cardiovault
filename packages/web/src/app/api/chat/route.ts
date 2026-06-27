import { NextRequest, NextResponse } from 'next/server';

import { rateLimitChat } from '@/lib/chat-rate-limit';
import { askMedicalQuestion } from '@/lib/rag-chain';

export const runtime = 'nodejs';

function clientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || request.ip || 'unknown';
}

/**
 * POST /api/chat
 * Body: `{ "message": string }`
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limited = rateLimitChat(`chat:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.', retryAfterMs: limited.retryAfterMs },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } },
    );
  }

  try {
    const body = (await request.json()) as { message?: unknown };
    const message = body.message;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (trimmed.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 });
    }

    const { answer, sources } = await askMedicalQuestion(trimmed);
    return NextResponse.json({ answer, sources });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
