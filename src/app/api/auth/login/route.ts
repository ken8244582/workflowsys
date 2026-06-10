import { NextResponse } from 'next/server';
import { loginUser, seedInitialData, getUserById } from '@/lib/sys-data';
import { getSessionCookieName, getSessionMaxAge } from '@/lib/auth';

// Seed on first request
let seeded = false;

export async function POST(request: Request) {
  try {
    // Seed initial data if not done
    if (!seeded) {
      try {
        await seedInitialData();
      } catch (seedError) {
        console.error('[auth/login] seedInitialData failed:', seedError);
        // Continue with login even if seeding fails
      }
      seeded = true;
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    const result = await loginUser(username, password);
    if (!result) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const userRecord = await getUserById(result.payload.userId);

    const response = NextResponse.json({
      success: true,
      user: {
        userId: result.payload.userId,
        username: result.payload.username,
        displayName: userRecord?.display_name || result.payload.username,
        isSuperAdmin: result.payload.isSuperAdmin,
        mustChangePassword: result.payload.mustChangePassword,
      },
    });

    response.cookies.set(getSessionCookieName(), result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: getSessionMaxAge(),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[auth/login] Error:', error);
    const message = error instanceof Error ? error.message : '登录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
