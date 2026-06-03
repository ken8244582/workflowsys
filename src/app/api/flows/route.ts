import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapFlowRow, mapRevisionRow } from '@/lib/db';

// GET /api/flows - List with optional filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const conditions: string[] = [];
  const params: unknown[] = [];

  const l1Domain = searchParams.get('l1Domain');
  const l2Group = searchParams.get('l2Group');
  const l3Segment = searchParams.get('l3Segment');
  const category = searchParams.get('category');
  const format = searchParams.get('format');
  const itCoverage = searchParams.get('itCoverage');
  const search = searchParams.get('search');
  const hasL4 = searchParams.get('hasL4');

  if (l1Domain) { conditions.push('l1_domain = ?'); params.push(l1Domain); }
  if (l2Group) { conditions.push('l2_group = ?'); params.push(l2Group); }
  if (l3Segment) { conditions.push('l3_segment = ?'); params.push(l3Segment); }
  if (category) { conditions.push('category = ?'); params.push(category); }
  if (format) { conditions.push('format = ?'); params.push(format); }
  if (itCoverage) { conditions.push('it_coverage = ?'); params.push(itCoverage); }
  if (hasL4 === 'true') { conditions.push('l4_process != ?'); params.push(''); }
  if (hasL4 === 'false') { conditions.push('l4_process = ?'); params.push(''); }
  if (search) {
    conditions.push('(l4_process LIKE ? OR process_code LIKE ? OR l4_owner LIKE ? OR l3_segment LIKE ? OR l2_group LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count
  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM flows ${whereClause}`).get(...params) as { cnt: number };
  const total = countRow.cnt;

  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(`SELECT * FROM flows ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Record<string, unknown>[];

  return NextResponse.json({
    items: rows.map(mapFlowRow),
    total,
    page,
    pageSize,
    totalPages,
  });
}

// POST /api/flows - Create new flow item
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const stmt = db.prepare(`
    INSERT INTO flows (l1_domain, l1_owner, l2_group, l2_owner, l3_segment, l3_owner,
      process_code, l4_process, version, department, l4_owner, format, category,
      it_coverage, it_sub_category, it_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    body.l1Domain || '',
    body.l1Owner || '',
    body.l2Group || '',
    body.l2Owner || '',
    body.l3Segment || '',
    body.l3Owner || '',
    body.processCode || '',
    body.l4Process || '',
    body.version || '',
    body.department || '',
    body.l4Owner || '',
    body.format || '',
    body.category || '',
    body.itCoverage || '',
    body.itSubCategory || '',
    body.itScore ?? 0,
    body.status || '试运行'
  );

  const newId = result.lastInsertRowid;

  // Record to revision records if this is a new L4 process
  if (body.l4Process) {
    db.prepare(`
      INSERT INTO revision_records (revision_date, process_code, l4_process, version,
        l1_domain, l2_group, l3_segment, revision_type, description, operator)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString().replace('T', ' ').slice(0, 19),
      body.processCode || '',
      body.l4Process || '',
      body.version || '',
      body.l1Domain || '',
      body.l2Group || '',
      body.l3Segment || '',
      '新增',
      '新增流程',
      ''
    );
  }

  const newRow = db.prepare('SELECT * FROM flows WHERE id = ?').get(newId) as Record<string, unknown>;
  return NextResponse.json(mapFlowRow(newRow), { status: 201 });
}
