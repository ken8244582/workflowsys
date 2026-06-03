import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  status: string;
}

const DATA_PATH = path.join(process.cwd(), 'public', 'flow-data.json');
const REVISION_PATH = path.join(process.cwd(), 'public', 'revision-records.json');

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

function readData(): FlowItem[] {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: FlowItem[]): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function readRevisions(): RevisionRecord[] {
  try {
    const raw = fs.readFileSync(REVISION_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeRevisions(data: RevisionRecord[]): void {
  fs.writeFileSync(REVISION_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function recordRevision(params: Omit<RevisionRecord, 'id' | 'revisionDate'>): RevisionRecord {
  const revisions = readRevisions();
  const maxId = revisions.reduce((max, r) => Math.max(max, r.id || 0), 0);
  const record: RevisionRecord = {
    id: maxId + 1,
    revisionDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
    ...params,
  };
  revisions.push(record);
  writeRevisions(revisions);
  return record;
}

// GET /api/flows - List with optional filtering
export async function GET(request: NextRequest) {
  const data = readData();
  const { searchParams } = new URL(request.url);

  let filtered = data;

  const l1Domain = searchParams.get('l1Domain');
  const l2Group = searchParams.get('l2Group');
  const l3Segment = searchParams.get('l3Segment');
  const category = searchParams.get('category');
  const format = searchParams.get('format');
  const itCoverage = searchParams.get('itCoverage');
  const search = searchParams.get('search');
  const hasL4 = searchParams.get('hasL4');

  if (l1Domain) filtered = filtered.filter(item => item.l1Domain === l1Domain);
  if (l2Group) filtered = filtered.filter(item => item.l2Group === l2Group);
  if (l3Segment) filtered = filtered.filter(item => item.l3Segment === l3Segment);
  if (category) filtered = filtered.filter(item => item.category === category);
  if (format) filtered = filtered.filter(item => item.format === format);
  if (itCoverage) filtered = filtered.filter(item => item.itCoverage === itCoverage);
  if (hasL4 === 'true') filtered = filtered.filter(item => item.l4Process !== '');
  if (hasL4 === 'false') filtered = filtered.filter(item => item.l4Process === '');
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(item =>
      item.l4Process.toLowerCase().includes(s) ||
      item.processCode.toLowerCase().includes(s) ||
      item.l4Owner.toLowerCase().includes(s) ||
      item.l3Segment.toLowerCase().includes(s) ||
      item.l2Group.toLowerCase().includes(s)
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

// POST /api/flows - Create new flow item
export async function POST(request: NextRequest) {
  const data = readData();
  const body: FlowItem = await request.json();

  const maxId = data.reduce((max, item) => Math.max(max, item.id || 0), 0);
  const newItem: FlowItem = {
    id: maxId + 1,
    l1Domain: body.l1Domain || '',
    l1Owner: body.l1Owner || '',
    l2Group: body.l2Group || '',
    l2Owner: body.l2Owner || '',
    l3Segment: body.l3Segment || '',
    l3Owner: body.l3Owner || '',
    processCode: body.processCode || '',
    l4Process: body.l4Process || '',
    version: body.version || '',
    department: body.department || '',
    l4Owner: body.l4Owner || '',
    format: body.format || '',
    category: body.category || '',
    itCoverage: body.itCoverage || '',
    itSubCategory: body.itSubCategory || '',
    itScore: body.itScore ?? 0,
    status: body.status || '试运行',
  };

  data.push(newItem);
  writeData(data);

  // Record to revision records if this is a new L4 process
  if (newItem.l4Process) {
    recordRevision({
      processCode: newItem.processCode,
      l4Process: newItem.l4Process,
      version: newItem.version,
      l1Domain: newItem.l1Domain,
      l2Group: newItem.l2Group,
      l3Segment: newItem.l3Segment,
      revisionType: '新增',
      description: '新增流程',
      operator: '',
    });
  }

  return NextResponse.json(newItem, { status: 201 });
}
