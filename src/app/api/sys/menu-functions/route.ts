import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMenuFunctions, getAllMenuFunctions, createMenuFunction } from '@/lib/sys-data';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('menu_id');

    const functions = menuId
      ? await getMenuFunctions(parseInt(menuId))
      : await getAllMenuFunctions();

    return NextResponse.json({ functions });
  } catch (error) {
    console.error('获取菜单功能失败:', error);
    return NextResponse.json({ error: '获取菜单功能失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
    }

    // 只有超管可以配置功能
    if (!session.isSuperAdmin) {
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
      sort_order: sort_order || 0
    });

    return NextResponse.json({ function: func });
  } catch (error) {
    console.error('创建菜单功能失败:', error);
    return NextResponse.json({ error: '创建菜单功能失败' }, { status: 500 });
  }
}