import { NextResponse } from 'next/server';
import { loginUser, seedInitialData, getUserById } from '@/lib/sys-data';
import { generateSessionToken, setSessionCookie, isJwtConfigured } from '@/lib/auth';

// Seed on first request
let seeded = false;

export async function POST(request: Request) {
  try {
    // Check JWT configuration
    if (!isJwtConfigured()) {
      return NextResponse.json({ error: '系统配置错误：JWT_SECRET 未配置，请联系管理员' }, { status: 500 });
    }

    // Seed initial data if not done
    if (!seeded) {
      try {
        await seedInitialData();
      } catch (seedError) {
        console.error('[auth/login] seedInitialData failed:', seedError);
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

    // Generate JWT token and set on response cookie
    const token = await generateSessionToken({
      userId: result.payload.userId,
      username: result.payload.username,
      displayName: userRecord?.display_name || result.payload.username,
      isSuperAdmin: result.payload.isSuperAdmin,
      mustChangePassword: userRecord?.must_change_password || false,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        userId: result.payload.userId,
        username: result.payload.username,
        displayName: userRecord?.display_name || result.payload.username,
        isSuperAdmin: result.payload.isSuperAdmin,
        mustChangePassword: userRecord?.must_change_password || false,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('[auth/login] Error:', error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
