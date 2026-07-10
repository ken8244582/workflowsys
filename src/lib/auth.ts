import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// JWT_SECRET is required for signing tokens.
// Fallback: use COZE_SUPABASE_SERVICE_ROLE_KEY if JWT_SECRET is not configured (production).
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    console.error('[AUTH] Neither JWT_SECRET nor COZE_SUPABASE_SERVICE_ROLE_KEY is set!');
  }
  return secret || '';
}

function getSecretKey() {
  return new TextEncoder().encode(getJwtSecret());
}

export function isJwtConfigured(): boolean {
  return !!(process.env.JWT_SECRET || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY);
}

export interface SessionPayload {
  userId: number;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
  mustChangePassword?: boolean;
}

const COOKIE_NAME = 'session_token';
// Session expires in 1 hour (3600 seconds)
const SESSION_MAX_AGE = 3600;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COZE_PROJECT_ENV === 'PROD',
  sameSite: 'lax' as const,
  path: '/',
  // Session cookie: no maxAge/persistent storage — browser closes = cookie gone
  // Server-side still validates 1-hour expiry via JWT exp claim
};

/**
 * Generate a JWT session token
 */
export async function generateSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE} sec`)
    .sign(getSecretKey());
}

/**
 * Create a JWT session and set it as a cookie on the response
 * Uses Next.js cookies() API for reliable cross-environment cookie handling
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Legacy method: Create a session using next/headers cookies()
 * Use generateSessionToken + setSessionCookie instead for reliability
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await generateSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Verify a JWT token and return the session payload, or null if invalid
 */
async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      displayName: payload.displayName as string,
      isSuperAdmin: payload.isSuperAdmin as boolean,
      mustChangePassword: payload.mustChangePassword as boolean | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Get and verify the current session.
 * Checks Authorization header first (Bearer token for iframe/preview), then falls back to cookie.
 * Returns null if no session or session expired
 */
export async function getSession(): Promise<SessionPayload | null> {
  // 1. Try Authorization header (for iframe preview where third-party cookies are blocked)
  const { headers } = await import('next/headers');
  const authHeader = (await headers()).get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (payload) return payload;
  }

  // 2. Fall back to cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) {
    // Token expired or invalid — clear the cookie
    try { cookieStore.delete(COOKIE_NAME); } catch { /* ignore */ }
  }
  return payload;
}

/**
 * Clear the session cookie (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME, COOKIE_OPTIONS, SESSION_MAX_AGE };
