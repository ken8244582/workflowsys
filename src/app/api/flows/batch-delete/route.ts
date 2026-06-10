import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const body = await req.json();
    const { field, value, l1Domain, l2Group } = body as {
      field: string;
      value: string;
      l1Domain?: string;
      l2Group?: string;
    };

    if (!field || !value) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Build filter map
    const filters: Record<string, string> = { [field]: value };
    if (l1Domain) filters['l1_domain'] = l1Domain;
    if (l2Group) filters['l2_group'] = l2Group;

    // Apply filters one by one to avoid deep type instantiation
    let query = supabase.from('flows').delete();
    for (const [key, val] of Object.entries(filters)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).eq(key, val);
    }

    const { error } = await query;

    if (error) {
      console.error('[batch-delete] Error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[batch-delete] Exception:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
