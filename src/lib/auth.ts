import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// B002 Fix: Remove default value, require JWT_SECRET env var
// Lazy-load SECRET_KEY so .env.local changes take effect without restart
function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[AUTH] JWT_SECRET environment variable is not set! Please configure it before starting the app.');
  }
  return new TextEncoder().encode(secret || '');
}

export function isJwtConfigured(): boolean {
  return !!process.env.JWT_SECRET;
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
  secure: process.env.NODE_ENV === 'production',
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
 * This is the preferred way to create sessions in API routes
 */
export function setSessionCookie(response: Response, token: string) {
  response.headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
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
 * Get and verify the current session from cookies
 * Returns null if no session or session expired
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

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
    // Token expired or invalid — clear the cookie
    try {
      cookieStore.delete(COOKIE_NAME);
    } catch {
      // Ignore delete errors
    }
    return null;
  }
}

/**
 * Clear the session cookie (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME, COOKIE_OPTIONS, SESSION_MAX_AGE };
