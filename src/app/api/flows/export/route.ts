import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/flows/export - Export flows as Excel
export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM flows ORDER BY id ASC').all() as Record<string, unknown>[];

    const XLSX = await import('xlsx');
    const data = rows.map((row) => ({
      'L1业务域': row.l1_domain as string,
      'L1所有者': row.l1_owner as string,
      'L2业务组': row.l2_group as string,
      'L2所有者': row.l2_owner as string,
      'L3业务段': row.l3_segment as string,
      'L3所有者': row.l3_owner as string,
      '流程编码': row.process_code as string,
      'L4职能流程': row.l4_process as string,
      '版本': row.version as string,
      '部门': row.department as string,
      'L4所有者': row.l4_owner as string,
      '格式': row.format as string,
      '分类': row.category as string,
      'IT覆盖': row.it_coverage as string,
      'IT支撑分': row.it_score as number,
      '状态': row.status as string,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 10 }, { wch: 22 }, { wch: 25 },
      { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '流程清单');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=flow-list.xlsx',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
