import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapFlowRow } from '@/lib/db';

// POST /api/flows/import - Import flows from Excel file
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    // Clear existing data and re-import
    db.prepare('DELETE FROM flows').run();

    const insertStmt = db.prepare(`
      INSERT INTO flows (l1_domain, l1_owner, l2_group, l2_owner, l3_segment, l3_owner,
        process_code, l4_process, version, department, l4_owner, format, category,
        it_coverage, it_sub_category, it_score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (const row of data) {
      const l4Process = String(row['L4职能流程'] || row['l4Process'] || '');
      const itCoverage = String(row['IT覆盖'] || row['itCoverage'] || '');
      const version = String(row['版本'] || row['version'] || '');

      // Determine status
      let status = '';
      if (!l4Process) {
        status = '';
      } else if (itCoverage === '是' || itCoverage === '已覆盖') {
        status = '正式运行';
      } else {
        status = '试运行';
      }

      insertStmt.run(
        String(row['L1业务域'] || row['l1Domain'] || ''),
        String(row['L1所有者'] || row['l1Owner'] || ''),
        String(row['L2业务组'] || row['l2Group'] || ''),
        String(row['L2所有者'] || row['l2Owner'] || ''),
        String(row['L3业务段'] || row['l3Segment'] || ''),
        String(row['L3所有者'] || row['l3Owner'] || ''),
        String(row['流程编码'] || row['processCode'] || ''),
        l4Process,
        version,
        String(row['部门'] || row['department'] || ''),
        String(row['L4所有者'] || row['l4Owner'] || ''),
        String(row['格式'] || row['format'] || ''),
        String(row['分类'] || row['category'] || ''),
        itCoverage,
        String(row['IT支撑分'] || row['itSubCategory'] || ''),
        Number(row['IT支撑分'] || row['itScore'] || 0),
        status
      );
      count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: '导入失败' }, { status: 500 });
  }
}
