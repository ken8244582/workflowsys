import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as XLSX from 'xlsx';

function mapRowToDb(row: Record<string, string>) {
  return {
    l1_domain: row['L1业务域'] || row['l1_domain'] || row['l1Domain'] || '',
    l1_owner: row['L1所有者'] || row['l1_owner'] || row['l1Owner'] || '',
    l2_group: row['L2业务组'] || row['l2_group'] || row['l2Group'] || '',
    l2_owner: row['L2所有者'] || row['l2_owner'] || row['l2Owner'] || '',
    l3_segment: row['L3业务段'] || row['l3_segment'] || row['l3Segment'] || '',
    l3_owner: row['L3所有者'] || row['l3_owner'] || row['l3Owner'] || '',
    process_code: row['流程编码'] || row['process_code'] || row['processCode'] || '',
    l4_process: row['L4职能流程'] || row['l4_process'] || row['l4Process'] || '',
    version: row['版本号'] || row['version'] || '',
    department: row['所属部门'] || row['department'] || '',
    l4_owner: row['L4所有者'] || row['l4_owner'] || row['l4Owner'] || '',
    format: row['格式'] || row['format'] || '',
    category: row['分类'] || row['category'] || '',
    it_coverage: row['IT覆盖'] || row['it_coverage'] || row['itCoverage'] || '',
    it_sub_category: row['IT支撑分类'] || row['it_sub_category'] || row['itSubCategory'] || '',
    it_score: parseInt(row['IT支撑分'] || row['it_score'] || row['itScore'] || '0') || 0,
    status: row['状态'] || row['status'] || '',
  };
}

// POST /api/flows/import - Import flows from Excel or JSON
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: '未选择文件' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();
  let rows: Record<string, string>[] = [];

  if (fileName.endsWith('.json')) {
    // Parse JSON file
    try {
      const jsonData = JSON.parse(buffer.toString('utf-8'));
      if (!Array.isArray(jsonData)) {
        return NextResponse.json({ error: 'JSON文件格式错误，需要数组格式' }, { status: 400 });
      }
      rows = jsonData;
    } catch {
      return NextResponse.json({ error: 'JSON文件解析失败' }, { status: 400 });
    }
  } else {
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: '文件为空' }, { status: 400 });
  }

  // Filter out completely empty rows (all key fields are empty)
  const insertRows = rows
    .map(mapRowToDb)
    .filter(row => row.process_code || row.l4_process || row.l1_domain);

  if (insertRows.length === 0) {
    return NextResponse.json({ error: '没有有效的流程数据' }, { status: 400 });
  }

  // Delete all existing and insert new
  const { error: deleteError } = await supabase.from('flows').delete().neq('id', 0);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insert in batches of 100
  const batchSize = 100;
  let totalInserted = 0;
  for (let i = 0; i < insertRows.length; i += batchSize) {
    const batch = insertRows.slice(i, i + batchSize);
    const { data, error: insertError } = await supabase
      .from('flows')
      .insert(batch)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    totalInserted += data?.length || 0;
  }

  return NextResponse.json({ count: totalInserted });
}
