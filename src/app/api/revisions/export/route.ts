import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/revisions/export - Export revision records as Excel
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data: rows, error } = await supabase
      .from('revision_records')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // Use xlsx to generate Excel
    const XLSX = await import('xlsx');
    const data = (rows as Record<string, unknown>[]).map((row) => ({
      '修订日期时间': row.revision_date as string,
      '流程编码': row.process_code as string,
      'L4职能流程': row.l4_process as string,
      '修订后版本号': row.version as string,
      '所属业务域': row.l1_domain as string,
      '所属业务组': row.l2_group as string,
      '所属业务段': row.l3_segment as string,
      '修订类型': row.revision_type as string,
      '修订描述': row.description as string,
      '操作人': row.operator as string,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 10 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 10 },
      { wch: 40 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '修订记录');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=revision-records.xlsx',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
