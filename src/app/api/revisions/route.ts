import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapRevisionRow } from '@/lib/db';

// GET /api/revisions - List revision records with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const conditions: string[] = [];
  const params: unknown[] = [];

  const revisionType = searchParams.get('revisionType');
  const l1Domain = searchParams.get('l1Domain');
  const search = searchParams.get('search');

  if (revisionType) { conditions.push('revision_type = ?'); params.push(revisionType); }
  if (l1Domain) { conditions.push('l1_domain = ?'); params.push(l1Domain); }
  if (search) {
    conditions.push('(l4_process LIKE ? OR process_code LIKE ? OR description LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count
  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM revision_records ${whereClause}`).get(...params) as { cnt: number };
  const total = countRow.cnt;

  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(`SELECT * FROM revision_records ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Record<string, unknown>[];

  return NextResponse.json({
    items: rows.map(mapRevisionRow),
    total,
    page,
    pageSize,
    totalPages,
  });
}
