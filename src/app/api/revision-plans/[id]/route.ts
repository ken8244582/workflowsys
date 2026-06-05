import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapPlanRow } from '@/lib/db';

// GET /api/revision-plans/[id] - Get single plan with stats
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(parseInt(id)) as Record<string, unknown> | undefined;
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Get owner (L4所有者) progress
  const ownerRows = db.prepare(`
    SELECT department as owner,
      COUNT(*) as total,
      SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = '待执行' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = '进行中' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = '已顺延' THEN 1 ELSE 0 END) as carried_over
    FROM plan_tasks WHERE plan_id = ? GROUP BY department ORDER BY department
  `).all(parseInt(id)) as { owner: string; total: number; completed: number; pending: number; in_progress: number; carried_over: number }[];

  const ownerProgress = ownerRows.map(d => ({
    owner: d.owner,
    total: d.total,
    completed: d.completed,
    pending: d.pending,
    inProgress: d.in_progress,
    carriedOver: d.carried_over,
    completionRate: d.total > 0 ? Math.round((d.completed / d.total) * 1000) / 10 : 0,
  }));

  return NextResponse.json({
    ...mapPlanRow(row),
    ownerProgress,
  });
}

// PUT /api/revision-plans/[id] - Update plan (change status, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const numId = parseInt(id);

  const existing = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const action = body._action;

  if (action === 'publish') {
    // 发布/下发计划
    db.prepare("UPDATE revision_plans SET status = '已下发', updated_at = datetime('now','localtime') WHERE id = ?").run(numId);
    const updated = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown>;
    return NextResponse.json(mapPlanRow(updated));
  }

  if (action === 'withdraw') {
    // 撤回计划到草稿状态
    const currentStatus = existing.status as string;
    if (currentStatus !== '已下发') {
      return NextResponse.json({ error: '只能撤回已下发的计划' }, { status: 400 });
    }
    db.prepare("UPDATE revision_plans SET status = '草稿', updated_at = datetime('now','localtime') WHERE id = ?").run(numId);
    const updated = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown>;
    return NextResponse.json(mapPlanRow(updated));
  }

  if (action === 'archive') {
    // 归档计划
    db.prepare("UPDATE revision_plans SET status = '已归档', updated_at = datetime('now','localtime') WHERE id = ?").run(numId);
    const updated = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown>;
    return NextResponse.json(mapPlanRow(updated));
  }

  // General update
  const planName = body.planName || existing.plan_name;
  db.prepare('UPDATE revision_plans SET plan_name = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(planName, numId);
  const updated = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown>;
  return NextResponse.json(mapPlanRow(updated));
}

// DELETE /api/revision-plans/[id] - Delete plan and its tasks
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const numId = parseInt(id);

  const existing = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Only allow deleting draft plans
  if (existing.status !== '草稿') {
    return NextResponse.json({ error: '只能删除草稿状态的计划' }, { status: 400 });
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM plan_tasks WHERE plan_id = ?').run(numId);
    db.prepare('DELETE FROM revision_plans WHERE id = ?').run(numId);
  });
  transaction();

  return NextResponse.json({ success: true });
}
