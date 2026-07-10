import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllMenus, createMenu, updateMenu, deleteMenu } from '@/lib/sys-data';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const menus = await getAllMenus();
    return NextResponse.json({ menus });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询菜单失败';
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
    const { name, path, icon, parent_id, sort_order, is_visible } = body;

    if (!name) {
      return NextResponse.json({ error: '菜单名称不能为空' }, { status: 400 });
    }

    const menu = await createMenu({
      name,
      path: path || null,
      icon: icon || null,
      parent_id: parent_id || null,
      sort_order: sort_order || 0,
      is_visible: is_visible !== false,
      supported_actions: '["view"]', // Default to view only
    });

    return NextResponse.json({ success: true, menu }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建菜单失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
