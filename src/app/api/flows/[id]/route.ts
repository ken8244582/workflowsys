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

const DATA_PATH = path.join(process.cwd(), 'public', 'flow-data.json');
const REVISION_PATH = path.join(process.cwd(), 'public', 'revision-records.json');

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

// Bump version: C1.0 -> C2.0, C2.0 -> C3.0, etc.
function bumpVersion(version: string): string {
  const match = version.match(/^C(\d+)\.(\d+)$/);
  if (match) {
    const major = parseInt(match[1]) + 1;
    return `C${major}.0`;
  }
  return version;
}

// GET /api/flows/[id] - Get single flow item
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = readData();
  const item = data.find(d => d.id === parseInt(id));
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(item);
}

// PUT /api/flows/[id] - Update flow item or perform revision action
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = readData();
  const index = data.findIndex(d => d.id === parseInt(id));
  if (index === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const action = body._action;

  // Revision actions
  if (action === 'abolish') {
    // 废止: set status to 已废止, record revision
    data[index].status = '已废止';
    writeData(data);
    recordRevision({
      processCode: data[index].processCode,
      l4Process: data[index].l4Process,
      version: data[index].version,
      l1Domain: data[index].l1Domain,
      l2Group: data[index].l2Group,
      l3Segment: data[index].l3Segment,
      revisionType: '废止',
      description: body.reason || '流程废止',
      operator: '',
    });
    return NextResponse.json(data[index]);
  }

  if (action === 'upgrade') {
    // 版本升级: bump version, record revision
    const oldVersion = data[index].version;
    const newVersion = bumpVersion(oldVersion);
    data[index].version = newVersion;
    data[index].status = '试运行';
    writeData(data);
    recordRevision({
      processCode: data[index].processCode,
      l4Process: data[index].l4Process,
      version: newVersion,
      l1Domain: data[index].l1Domain,
      l2Group: data[index].l2Group,
      l3Segment: data[index].l3Segment,
      revisionType: '修订',
      description: body.description || `版本从 ${oldVersion} 升级到 ${newVersion}`,
      operator: '',
    });
    return NextResponse.json(data[index]);
  }

  // Normal update
  const { _action: _, ...updateData } = body;
  data[index] = { ...data[index], ...updateData, id: data[index].id };
  writeData(data);

  return NextResponse.json(data[index]);
}

// DELETE /api/flows/[id] - Delete flow item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = readData();
  const index = data.findIndex(d => d.id === parseInt(id));
  if (index === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const deleted = data.splice(index, 1)[0];
  writeData(data);

  return NextResponse.json(deleted);
}
