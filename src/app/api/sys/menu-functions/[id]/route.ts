import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteMenuFunction } from '@/lib/sys-data';

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
    const funcId = parseInt(id, 10);

    await deleteMenuFunction(funcId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除菜单功能失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
