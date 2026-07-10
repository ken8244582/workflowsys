import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth, isSession } from '@/lib/api-auth';

// GET /api/assessments/export - Export assessment list as Excel
export async function GET(_request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  try {
    const supabase = getSupabaseClient();
    const { data: rows, error } = await supabase
      .from('assessments')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // Resolve created_by username -> display_name
    const { data: users } = await supabase.from('sys_users').select('username, display_name');
    const nameMap = new Map<string, string>();
    if (users) {
      for (const u of users) {
        nameMap.set(u.username, u.display_name || u.username);
      }
    }

    // Use xlsx to generate Excel
    const XLSX = await import('xlsx');
    const data = (rows as Record<string, unknown>[]).map((row) => ({
      '自评名称': row.name as string,
      '评价周期': row.period as string,
      '状态': row.status as string,
      '总得分': row.total_score as string,
      '机制建设得分': row.mechanism_score as string,
      '运行效果得分': row.operation_score as string,
      'IT覆盖得分': row.it_score as string,
      '创建人': nameMap.get(row.created_by as string) || (row.created_by as string),
      '创建时间': row.created_at_ts as string,
      '更新人': nameMap.get(row.updated_by as string) || (row.updated_by as string),
      '更新时间': row.updated_at_ts as string,
      '备注': row.remarks as string,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '自评列表');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=assessment-list.xlsx',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
