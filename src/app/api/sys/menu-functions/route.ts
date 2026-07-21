import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMenuFunctions, createMenuFunction } from '@/lib/sys-data';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('menu_id');

    if (!menuId) {
      return NextResponse.json({ error: '缺少 menu_id 参数' }, { status: 400 });
    }

    const functions = await getMenuFunctions(parseInt(menuId, 10));
    return NextResponse.json({ functions });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询菜单功能失败';
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
    const { menu_id, function_code, function_name, sort_order } = body;

    if (!menu_id || !function_code || !function_name) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const func = await createMenuFunction({
      menu_id,
      function_code,
      function_name,
      sort_order: sort_order || 0,
    });

    return NextResponse.json({ success: true, function: func }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建菜单功能失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
