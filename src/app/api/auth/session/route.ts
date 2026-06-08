import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserAccessibleMenus, getUserById, seedInitialData } from '@/lib/sys-data';

let seeded = false;

export async function GET() {
  try {
    if (!seeded) {
      await seedInitialData();
      seeded = true;
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    const userRecord = await getUserById(session.userId);
    const menus = await getUserAccessibleMenus(session.userId, session.isSuperAdmin);

    return NextResponse.json({
      authenticated: true,
      user: {
        userId: session.userId,
        username: session.username,
        displayName: userRecord?.display_name || session.username,
        isSuperAdmin: session.isSuperAdmin,
        mustChangePassword: session.mustChangePassword,
      },
      menus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取会话失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
