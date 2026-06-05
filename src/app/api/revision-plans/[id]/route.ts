import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/revision-plans/[id] - Get plan detail with department progress
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const numId = parseInt(id);

  const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId);
  if (!plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  // Get department progress
  const deptProgress = db.prepare(`
    SELECT 
      department,
      COUNT(*) as total,
      SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = '待执行' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = '进行中' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN status = '已顺延' THEN 1 ELSE 0 END) as carriedOver
    FROM plan_tasks 
    WHERE plan_id = ?
    GROUP BY department
    ORDER BY total DESC
  `).all(numId);

  const departmentProgress = (deptProgress as Record<string, unknown>[]).map((d) => ({
    department: d.department as string,
    total: d.total as number,
    completed: d.completed as number,
    pending: d.pending as number,
    inProgress: d.inProgress as number,
    carriedOver: d.carriedOver as number,
    completionRate: (d.total as number) > 0 ? Math.round(((d.completed as number) / (d.total as number)) * 1000) / 10 : 0,
  }));

  // Update counts
  const taskCount = db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(numId) as Record<string, unknown>;
  const completedCount = db.prepare("SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ? AND status = '已完成'").get(numId) as Record<string, unknown>;

  db.prepare('UPDATE revision_plans SET task_count = ?, completed_count = ? WHERE id = ?')
    .run(taskCount.cnt as number, completedCount.cnt as number, numId);

  const updatedPlan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown> | undefined;

  return NextResponse.json({
    ...(updatedPlan || {}),
    departmentProgress,
  });
}

// PUT /api/revision-plans/[id] - Update plan (publish/revoke)
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const numId = parseInt(id);
  const body = await request.json();
  const action = body._action;

  const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  if (action === 'publish') {
    if (plan.status !== '草稿') {
      return NextResponse.json({ error: '只有草稿状态才能下发' }, { status: 400 });
    }
    db.prepare("UPDATE revision_plans SET status = '已下发' WHERE id = ?").run(numId);
  } else if (action === 'revoke') {
    if (plan.status !== '已下发') {
      return NextResponse.json({ error: '只有已下发状态才能撤回' }, { status: 400 });
    }
    db.prepare("UPDATE revision_plans SET status = '草稿' WHERE id = ?").run(numId);
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const updatedPlan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId);
  return NextResponse.json(updatedPlan);
}

// DELETE /api/revision-plans/[id] - Delete a draft plan
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const numId = parseInt(id);

  const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  if (plan.status !== '草稿') {
    return NextResponse.json({ error: '只能删除草稿状态的计划' }, { status: 400 });
  }

  db.prepare('DELETE FROM plan_tasks WHERE plan_id = ?').run(numId);
  db.prepare('DELETE FROM revision_plans WHERE id = ?').run(numId);

  return NextResponse.json({ success: true });
}
