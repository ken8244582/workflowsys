import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const result = db.prepare('DELETE FROM revision_records WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '修订记录已删除' });
  } catch (error) {
    console.error('Delete revision error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
