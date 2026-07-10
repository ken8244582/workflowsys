import { getSession, type SessionPayload } from './auth';
import { NextResponse } from 'next/server';

/**
 * Require authentication for API routes.
 * Returns session payload if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录或会话已过期，请重新登录' }, { status: 401 });
  }
  return session;
}

/**
 * Require super admin for API routes.
 * Returns session payload if authorized, or a 403 NextResponse if not.
 */
export async function requireSuperAdmin(): Promise<SessionPayload | NextResponse> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  if (!authResult.isSuperAdmin) {
    return NextResponse.json({ error: '无权限操作，需要超级管理员权限' }, { status: 403 });
  }
  return authResult;
}

/**
 * Type guard: check if the result is a session (not an error response)
 */
export function isSession(result: SessionPayload | NextResponse): result is SessionPayload {
  return !(result instanceof NextResponse);
}
