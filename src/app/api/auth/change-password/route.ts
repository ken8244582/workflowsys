import { NextResponse } from 'next/server';
import { getSession, generateSessionToken, setSessionCookie } from '@/lib/auth';
import { changePassword, verifyUserPassword } from '@/lib/sys-data';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '旧密码和新密码不能为空' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度不能少于6位' }, { status: 400 });
    }

    // Verify old password
    const verified = await verifyUserPassword(session.userId, oldPassword);
    if (!verified) {
      return NextResponse.json({ error: '旧密码不正确' }, { status: 400 });
    }

    await changePassword(session.userId, newPassword);

    // If must_change_password was true, update the session token to reflect the change
    const response = NextResponse.json({ success: true });
    if (session.mustChangePassword) {
      const newToken = await generateSessionToken({
        ...session,
        mustChangePassword: false,
      });
      setSessionCookie(response, newToken);
    }
    return response;
  } catch (error) {
    console.error('[auth/change-password] Error:', error);
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
  }
}
