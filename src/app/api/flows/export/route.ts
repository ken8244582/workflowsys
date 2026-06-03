import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

interface FlowItem {
  id: number;
  l1Domain: string;
  l1Owner: string;
  l2Group: string;
  l2Owner: string;
  l3Segment: string;
  l3Owner: string;
  processCode: string;
  l4Process: string;
  version: string;
  department: string;
  l4Owner: string;
  format: string;
  category: string;
  itCoverage: string;
  itSubCategory: string;
  itScore: number;
}

const DATA_PATH = path.join(process.cwd(), 'public', 'flow-data.json');

// GET /api/flows/export - Export to Excel file
export async function GET() {
  try {
    const data: FlowItem[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

    const header = [
      '序号', 'L1-业务域', 'L1流程所有者', 'L2-业务组', 'L2流程所有者',
      'L3-业务段', 'L3流程所有者', '流程编码', 'L4职能流程', '最新版本号',
      '流程所属部门', 'L4流程所有者', '格式', '分类', '是否IT覆盖', 'IT支撑分'
    ];

    const rows = data.map(item => [
      item.id, item.l1Domain, item.l1Owner, item.l2Group, item.l2Owner,
      item.l3Segment, item.l3Owner, item.processCode, item.l4Process, item.version,
      item.department, item.l4Owner, item.format, item.category, item.itCoverage, item.itScore ?? 0
    ]);

    const wsData = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 10 },
      { wch: 18 }, { wch: 10 }, { wch: 22 }, { wch: 28 }, { wch: 10 },
      { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'L1-L4流程文件清单');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': "attachment; filename*=UTF-8''L1-L4%E6%B5%81%E7%A8%8B%E6%96%87%E4%BB%B6%E6%B8%85%E5%8D%95.xlsx",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
