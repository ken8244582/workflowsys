import { NextRequest, NextResponse } from 'next/server';
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
}

const DATA_PATH = path.join(process.cwd(), 'public', 'flow-data.json');

// POST /api/flows/import - Import from Excel file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Try to find the right sheet
    const sheetName = workbook.SheetNames.find(n =>
      n.includes('流程文件清单') || n.includes('流程清单')
    ) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: (string | number | null)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Find header row
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.some(cell => String(cell || '').includes('业务域') || String(cell || '').includes('L1'))) {
        headerRowIndex = i;
        break;
      }
    }

    const existingData: FlowItem[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const maxId = existingData.reduce((max, item) => Math.max(max, item.id || 0), 0);

    const importedItems: FlowItem[] = [];
    let newId = maxId + 1;

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[0]) continue;

      const item: FlowItem = {
        id: newId++,
        l1Domain: String(row[1] || ''),
        l1Owner: String(row[2] || ''),
        l2Group: String(row[3] || ''),
        l2Owner: String(row[4] || ''),
        l3Segment: String(row[5] || ''),
        l3Owner: String(row[6] || ''),
        processCode: String(row[7] || ''),
        l4Process: String(row[8] || ''),
        version: String(row[9] || ''),
        department: String(row[10] || ''),
        l4Owner: String(row[11] || ''),
        format: String(row[12] || ''),
        category: String(row[13] || ''),
        itCoverage: String(row[14] || ''),
        itSubCategory: String(row[15] || ''),
      };
      importedItems.push(item);
    }

    // Replace all data with imported data
    writeData(importedItems);

    return NextResponse.json({
      success: true,
      imported: importedItems.length,
      total: importedItems.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function writeData(data: FlowItem[]): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}
