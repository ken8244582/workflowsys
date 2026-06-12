import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, createUser, getUserMenuPermissions, getAllMenus, type MenuPermissionInput } from '@/lib/sys-data';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const users = await getAllUsers();
    const allMenus = await getAllMenus();

    // Get menu assignments with permissions for each user
    const usersWithMenus = await Promise.all(
      users.map(async (user) => {
        if (user.is_super_admin) {
          return { ...user, menuPermissions: [] };
        }
        const perms = await getUserMenuPermissions(user.id);
        // Transform permissions to include menu info
        const menuPermissions = perms.map(p => {
          const menu = allMenus.find(m => m.id === p.menu_id);
          const supportedActions = menu?.supported_actions ? JSON.parse(menu.supported_actions) : [];
          return {
            menu_id: p.menu_id,
            menu_name: menu?.name || '',
            path: menu?.path || null,
            supported_actions: supportedActions,
            permissions: p.permissions || {},
          };
        });
        return { ...user, menuPermissions };
      })
    );

    return NextResponse.json({ users: usersWithMenus, menus: allMenus });
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
    const { username, display_name, is_active, permissions } = body;

    if (!username) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    const user = await createUser(username, display_name || '', is_active !== false);

    // Set menu permissions if provided
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permsInput: MenuPermissionInput[] = permissions.map(p => ({
        menu_id: p.menu_id,
        permissions: p.permissions || { view: true },
      }));
      // Import updateUserMenus at top and call it
      const { updateUserMenus } = await import('@/lib/sys-data');
      await updateUserMenus(user.id, permsInput);
    }

    const userPermissions = await getUserMenuPermissions(user.id);
    return NextResponse.json({ user: { ...user, menuPermissions: userPermissions } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建用户失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
