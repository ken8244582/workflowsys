import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { beijingNow } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const body = await req.json();
    const { field, oldValue, newValue, l1Domain, l2Group, extraFields } = body;

    if (!field || !oldValue) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const now = beijingNow();
    const username = authResult.username || 'system';

    // Build filter conditions
    let query = supabase.from('flows').update({
      [field]: newValue ?? oldValue,
      ...(extraFields || {}),
      updated_by: username,
      updated_at_ts: now,
    });

    // Apply filters
    query = query.eq(field, oldValue);
    if (l1Domain) {
      query = query.eq('l1_domain', l1Domain);
    }
    if (l2Group) {
      query = query.eq('l2_group', l2Group);
    }

    const { error } = await query;

    if (error) {
      console.error('[batch-update] Error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[batch-update] Exception:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
