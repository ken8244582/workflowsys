import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as XLSX from 'xlsx';

// GET /api/flows/export - Export all flows as Excel
export async function GET() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map database rows to export format matching the initialization template headers
  const exportRows = (data || []).map((row: Record<string, unknown>, index: number) => ({
    '序号': index + 1,
    'L1-业务域': row.l1_domain || '',
    'L1流程所有者': row.l1_owner || '',
    'L2-业务组': row.l2_group || '',
    'L2流程所有者': row.l2_owner || '',
    'L3-业务段': row.l3_segment || '',
    'L3流程所有者': row.l3_owner || '',
    '流程编码': row.process_code || '',
    'L4职能流程': row.l4_process || '',
    '最新版本号': row.version || '',
    '流程所属部门': row.department || '',
    'L4流程所有者': row.l4_owner || '',
    '格式': row.format || '',
    '分类': row.category || '',
    '是否IT覆盖': row.it_coverage || '',
    'IT支撑分类': row.it_sub_category || '',
    'IT支撑分': row.it_score || 0,
    '状态': row.status || '',
  }));

  // Create workbook with title row
  const wb = XLSX.utils.book_new();

  // Add title row
  const titleData = [['L1-L4流程文件清单']];
  const ws = XLSX.utils.aoa_to_sheet(titleData);

  // Add data rows starting from row 2
  XLSX.utils.sheet_add_json(ws, exportRows, { origin: 'A2', skipHeader: false });

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },   // 序号
    { wch: 20 },  // L1-业务域
    { wch: 12 },  // L1流程所有者
    { wch: 16 },  // L2-业务组
    { wch: 12 },  // L2流程所有者
    { wch: 16 },  // L3-业务段
    { wch: 12 },  // L3流程所有者
    { wch: 22 },  // 流程编码
    { wch: 28 },  // L4职能流程
    { wch: 10 },  // 最新版本号
    { wch: 14 },  // 流程所属部门
    { wch: 12 },  // L4流程所有者
    { wch: 10 },  // 格式
    { wch: 8 },   // 分类
    { wch: 10 },  // 是否IT覆盖
    { wch: 12 },  // IT支撑分类
    { wch: 10 },  // IT支撑分
    { wch: 10 },  // 状态
  ];

  // Merge title row across all columns
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } }];

  XLSX.utils.book_append_sheet(wb, ws, 'L1-L4流程文件清单');

  // Generate Excel buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=flows_export.xlsx',
    },
  });
}
