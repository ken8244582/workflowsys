import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface RevisionRecord {
  id: number;
  revisionDate: string;
  processCode: string;
  l4Process: string;
  version: string;
  l1Domain: string;
  l2Group: string;
  l3Segment: string;
  revisionType: string;
  description: string;
  operator: string;
}

const REVISION_PATH = path.join(process.cwd(), 'public', 'revision-records.json');

function readData(): RevisionRecord[] {
  try {
    const raw = fs.readFileSync(REVISION_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// GET /api/revisions/export - Export all revision records as Excel
export async function GET() {
  try {
    const data = readData();

    // Use xlsx library
    const XLSX = await import('xlsx');
    const exportData = data.map(item => ({
      '修订日期': item.revisionDate,
      '流程编码': item.processCode,
      'L4职能流程': item.l4Process,
      '修订后版本': item.version,
      '所属业务域': item.l1Domain,
      '业务组': item.l2Group,
      '业务段': item.l3Segment,
      '修订类型': item.revisionType,
      '修订描述': item.description,
      '操作人': item.operator,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 20 }, { wch: 25 }, { wch: 35 }, { wch: 10 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 40 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '修订记录');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=revision-records-${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
