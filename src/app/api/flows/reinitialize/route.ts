import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { confirmText } = body;
    
    if (confirmText !== '数据初始化') {
      return NextResponse.json({ error: '确认文字不匹配' }, { status: 400 });
    }

    const db = getDb() as unknown as Database.Database;
    
    // Clear all existing flow data
    db.prepare('DELETE FROM flow_items').run();
    
    // Read and import from flow-data.json
    const jsonPath = path.join(process.cwd(), 'public', 'flow-data.json');
    
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: 'flow-data.json 文件不存在' }, { status: 500 });
    }

    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const flowData = JSON.parse(rawData);
    
    const stmt = db.prepare(`
      INSERT INTO flow_items (
        l1_domain, l1_owner, l2_group, l2_owner, l3_segment, l3_owner,
        process_code, l4_process, version, department, l4_owner,
        format, category, it_coverage, it_sub_category, it_score, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    for (const item of flowData) {
      if (item.l4Process) {
        stmt.run(
          item.l1Domain || '', item.l1Owner || '',
          item.l2Group || '', item.l2Owner || '',
          item.l3Segment || '', item.l3Owner || '',
          item.processCode || '', item.l4Process || '',
          item.version || '', item.department || '',
          item.l4Owner || '', item.format || '',
          item.category || '', item.itCoverage || '',
          item.itSubCategory || '', item.itScore || 0,
          item.status || '正式运行'
        );
        imported++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `数据初始化完成，共导入 ${imported} 条记录`,
      imported 
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
