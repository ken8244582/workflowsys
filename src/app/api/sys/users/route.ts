import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword, getUserMenuIds, updateUserMenus } from '@/lib/sys-data';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const users = await getAllUsers();

    // Get menu assignments for each user
    const usersWithMenus = await Promise.all(
      users.map(async (user) => {
        const menuIds = user.is_super_admin ? [] : await getUserMenuIds(user.id);
        return { ...user, menuIds };
      })
    );

    return NextResponse.json({ users: usersWithMenus });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询用户失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    const body = await request.json();
    const { username, display_name, is_active, menuIds } = body;

    if (!username) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    const user = await createUser(username, display_name || '', is_active !== false);

    // Set menu permissions if provided
    if (menuIds && Array.isArray(menuIds) && menuIds.length > 0) {
      await updateUserMenus(user.id, menuIds);
    }

    const userMenuIds = await getUserMenuIds(user.id);
    return NextResponse.json({ user: { ...user, menuIds: userMenuIds } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建用户失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
