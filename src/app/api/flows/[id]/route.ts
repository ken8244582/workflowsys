import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapFlowRow } from '@/lib/db';

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
  const db = getDb();
  const row = db.prepare('SELECT * FROM flows WHERE id = ?').get(parseInt(id)) as Record<string, unknown> | undefined;
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(mapFlowRow(row));
}

// PUT /api/flows/[id] - Update flow item or perform revision action
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const numId = parseInt(id);

  const existing = db.prepare('SELECT * FROM flows WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const action = body._action;

  const insertRevision = db.prepare(`
    INSERT INTO revision_records (revision_date, process_code, l4_process, version,
      l1_domain, l2_group, l3_segment, revision_type, description, operator)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Revision actions
  if (action === 'abolish') {
    // 废止: set status to 已废止, record revision
    db.prepare('UPDATE flows SET status = ? WHERE id = ?').run('已废止', numId);

    insertRevision.run(
      new Date().toISOString().replace('T', ' ').slice(0, 19),
      existing.process_code as string,
      existing.l4_process as string,
      existing.version as string,
      existing.l1_domain as string,
      existing.l2_group as string,
      existing.l3_segment as string,
      '废止',
      body._description || '流程废止',
      ''
    );

    const updated = db.prepare('SELECT * FROM flows WHERE id = ?').get(numId) as Record<string, unknown>;
    return NextResponse.json(mapFlowRow(updated));
  }

  if (action === 'upgrade') {
    // 版本升级: bump version, set status to 试运行, record revision
    const oldVersion = existing.version as string;
    const newVersion = bumpVersion(oldVersion);
    db.prepare('UPDATE flows SET version = ?, status = ? WHERE id = ?').run(newVersion, '试运行', numId);

    insertRevision.run(
      new Date().toISOString().replace('T', ' ').slice(0, 19),
      existing.process_code as string,
      existing.l4_process as string,
      newVersion,
      existing.l1_domain as string,
      existing.l2_group as string,
      existing.l3_segment as string,
      '修订',
      body._description || `版本从 ${oldVersion} 升级到 ${newVersion}`,
      ''
    );

    const updated = db.prepare('SELECT * FROM flows WHERE id = ?').get(numId) as Record<string, unknown>;
    return NextResponse.json(mapFlowRow(updated));
  }

  if (action === 'restore') {
    // 恢复运行: set status to 试运行, bump version, record revision
    const oldVersion = existing.version as string;
    const newVersion = bumpVersion(oldVersion);
    db.prepare('UPDATE flows SET status = ?, version = ? WHERE id = ?').run('试运行', newVersion, numId);

    insertRevision.run(
      new Date().toISOString().replace('T', ' ').slice(0, 19),
      existing.process_code as string,
      existing.l4_process as string,
      newVersion,
      existing.l1_domain as string,
      existing.l2_group as string,
      existing.l3_segment as string,
      '恢复',
      body._description || `流程恢复运行，版本从 ${oldVersion} 升级到 ${newVersion}`,
      ''
    );

    const updated = db.prepare('SELECT * FROM flows WHERE id = ?').get(numId) as Record<string, unknown>;
    return NextResponse.json(mapFlowRow(updated));
  }

  // Normal update
  const { _action: _, ...updateData } = body;
  const setClauses: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, string> = {
    l1Domain: 'l1_domain', l1Owner: 'l1_owner',
    l2Group: 'l2_group', l2Owner: 'l2_owner',
    l3Segment: 'l3_segment', l3Owner: 'l3_owner',
    processCode: 'process_code', l4Process: 'l4_process',
    version: 'version', department: 'department',
    l4Owner: 'l4_owner', format: 'format', category: 'category',
    itCoverage: 'it_coverage', itSubCategory: 'it_sub_category',
    itScore: 'it_score', status: 'status',
  };

  for (const [key, dbCol] of Object.entries(fieldMap)) {
    if (key in updateData) {
      setClauses.push(`${dbCol} = ?`);
      values.push(updateData[key]);
    }
  }

  if (setClauses.length > 0) {
    values.push(numId);
    db.prepare(`UPDATE flows SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare('SELECT * FROM flows WHERE id = ?').get(numId) as Record<string, unknown>;
  return NextResponse.json(mapFlowRow(updated));
}

// DELETE /api/flows/[id] - Delete flow item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const numId = parseInt(id);

  const existing = db.prepare('SELECT * FROM flows WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  db.prepare('DELETE FROM flows WHERE id = ?').run(numId);
  return NextResponse.json(mapFlowRow(existing));
}
