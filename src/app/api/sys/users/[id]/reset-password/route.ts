import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resetUserPassword } from '@/lib/sys-data';

export async function POST(
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

    await resetUserPassword(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '重置密码失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
