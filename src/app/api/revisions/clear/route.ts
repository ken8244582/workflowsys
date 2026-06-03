import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE() {
  try {
    const db = getDb();
    db.prepare('DELETE FROM revision_records').run();
    return NextResponse.json({ success: true, message: '所有修订记录已清空' });
  } catch (error) {
    console.error('Clear revisions error:', error);
    return NextResponse.json({ error: '清空失败' }, { status: 500 });
  }
}
