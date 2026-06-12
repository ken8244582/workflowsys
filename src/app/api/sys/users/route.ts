import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword, getUserMenuPermissions, updateUserMenus, getAllMenus, type MenuPermissionInput } from '@/lib/sys-data';

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
        const permissions = await getUserMenuPermissions(user.id);
        // Transform permissions to include menu info
        const menuPermissions = permissions.map(p => {
          const menu = allMenus.find(m => m.id === p.menu_id);
          return {
            menu_id: p.menu_id,
            menu_name: menu?.name || '',
            can_view: p.can_view,
            can_add: p.can_add,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
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
    const { username, display_name, is_active, menuPermissions } = body;

    if (!username) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    const user = await createUser(username, display_name || '', is_active !== false);

    // Set menu permissions if provided
    if (menuPermissions && Array.isArray(menuPermissions) && menuPermissions.length > 0) {
      const permissions: MenuPermissionInput[] = menuPermissions.map(p => ({
        menu_id: p.menu_id,
        can_view: p.can_view ?? true,
        can_add: p.can_add ?? false,
        can_edit: p.can_edit ?? false,
        can_delete: p.can_delete ?? false,
      }));
      await updateUserMenus(user.id, permissions);
    }

    const userPermissions = await getUserMenuPermissions(user.id);
    return NextResponse.json({ user: { ...user, menuPermissions: userPermissions } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建用户失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
