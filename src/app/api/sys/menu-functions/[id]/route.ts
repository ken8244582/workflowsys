import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateMenuFunction, deleteMenuFunction } from '@/lib/sys-data';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
    }

    if (!session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const func = await updateMenuFunction(parseInt(id), body);
    return NextResponse.json({ function: func });
  } catch (error) {
    console.error('更新菜单功能失败:', error);
    return NextResponse.json({ error: '更新菜单功能失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
    }

    if (!session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    const { id } = await params;
    await deleteMenuFunction(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除菜单功能失败:', error);
    return NextResponse.json({ error: '删除菜单功能失败' }, { status: 500 });
  }
}