import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateUser, deleteUser, resetUserPassword, getUserMenuIds, updateUserMenus } from '@/lib/sys-data';

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
    const { display_name, is_active, menuIds } = body;

    await updateUser(userId, { display_name, is_active });

    if (menuIds && Array.isArray(menuIds)) {
      await updateUserMenus(userId, menuIds);
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

    await deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除用户失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
