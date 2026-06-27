import type { SessionOptions } from 'iron-session';

export interface SessionData {
  nonce?: string;
  address?: `0x${string}`;
  /** Present and true when SIWE verification succeeded. */
  isAuthenticated?: boolean;
  tokenId?: number;
  role?: 'patient' | 'provider' | 'admin';
}

/** Cookie name for iron-session (must match middleware checks). */
export const IRON_SESSION_COOKIE_NAME = 'cardiovault-session';

const rawSecret = process.env.SESSION_SECRET ?? '';
const password =
  rawSecret.length >= 32 ? rawSecret : rawSecret.padEnd(32, 'cv-session-secret!');

if (!process.env.SESSION_SECRET) {
  console.warn('[session] SESSION_SECRET is not set; using a dev-only padded secret. Set SESSION_SECRET in production.');
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: IRON_SESSION_COOKIE_NAME,
  ttl: 60 * 60 * 24,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 - 60,
    path: '/',
  },
};
