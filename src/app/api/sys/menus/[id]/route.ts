import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateMenu, deleteMenu } from '@/lib/sys-data';

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
    const menuId = parseInt(id, 10);
    const body = await request.json();
    const { name, path, icon, parent_id, sort_order, is_visible } = body;

    await updateMenu(menuId, {
      name,
      path,
      icon,
      parent_id,
      sort_order,
      is_visible,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新菜单失败';
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
    const menuId = parseInt(id, 10);

    await deleteMenu(menuId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除菜单失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
