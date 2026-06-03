import { NextRequest, NextResponse } from 'next/server';
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

function writeData(data: RevisionRecord[]): void {
  fs.writeFileSync(REVISION_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/revisions - List with optional filtering
export async function GET(request: NextRequest) {
  const data = readData();
  const { searchParams } = new URL(request.url);

  let filtered = data;

  const revisionType = searchParams.get('revisionType');
  const l1Domain = searchParams.get('l1Domain');
  const search = searchParams.get('search');

  if (revisionType) filtered = filtered.filter(item => item.revisionType === revisionType);
  if (l1Domain) filtered = filtered.filter(item => item.l1Domain === l1Domain);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(item =>
      item.l4Process.toLowerCase().includes(s) ||
      item.processCode.toLowerCase().includes(s) ||
      item.description.toLowerCase().includes(s)
    );
  }

  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages,
  });
}
