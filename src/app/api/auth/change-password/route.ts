import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { changePassword } from '@/lib/sys-data';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: '密码长度不能少于6位' }, { status: 400 });
    }

    await changePassword(session.userId, newPassword);

    // Create new session with mustChangePassword = false
    const { createSession } = await import('@/lib/auth');
    const newPayload = { ...session, mustChangePassword: false };
    const token = await createSession(newPayload);

    const response = NextResponse.json({ success: true });
    const { getSessionCookieName, getSessionMaxAge } = await import('@/lib/auth');
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: getSessionMaxAge(),
      path: '/',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '修改密码失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
