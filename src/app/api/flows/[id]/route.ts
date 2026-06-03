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
}

const DATA_PATH = path.join(process.cwd(), 'public', 'flow-data.json');

function readData(): FlowItem[] {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: FlowItem[]): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
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

// PUT /api/flows/[id] - Update flow item
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

  const body: Partial<FlowItem> = await request.json();
  data[index] = { ...data[index], ...body, id: data[index].id };
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
