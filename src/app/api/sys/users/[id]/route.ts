import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateUser, deleteUser, getUserMenuPermissions, updateUserMenus, type MenuPermissionInput } from '@/lib/sys-data';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    const body = await request.json();
    const { display_name, is_active, menuPermissions } = body;

    await updateUser(userId, { display_name, is_active });

    if (menuPermissions && Array.isArray(menuPermissions)) {
      const permissions: MenuPermissionInput[] = menuPermissions.map(p => ({
        menu_id: p.menu_id,
        can_view: p.can_view ?? true,
        can_add: p.can_add ?? false,
        can_edit: p.can_edit ?? false,
        can_delete: p.can_delete ?? false,
      }));
      await updateUserMenus(userId, permissions);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新用户失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    // B008 Fix: Prevent super admin from deleting their own account
    if (session.userId === userId) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
    }

    await deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除用户失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
