import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapPlanRow } from '@/lib/db';

// GET /api/revision-plans - List revision plans
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const conditions: string[] = [];
  const params: unknown[] = [];

  const status = searchParams.get('status');
  if (status) { conditions.push('status = ?'); params.push(status); }

  const planMonth = searchParams.get('planMonth');
  if (planMonth) { conditions.push('plan_month = ?'); params.push(planMonth); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(
    `SELECT * FROM revision_plans ${whereClause} ORDER BY plan_month DESC`
  ).all(...params) as Record<string, unknown>[];

  // Recalculate counts for each plan
  const plans = rows.map(row => {
    const planId = row.id as number;
    const taskCount = (db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(planId) as { cnt: number }).cnt;
    const completedCount = (db.prepare("SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ? AND status = '已完成'").get(planId) as { cnt: number }).cnt;
    // Update the plan's cached counts
    db.prepare('UPDATE revision_plans SET task_count = ?, completed_count = ? WHERE id = ?').run(taskCount, completedCount, planId);
    return {
      ...mapPlanRow(row),
      taskCount,
      completedCount,
    };
  });

  return NextResponse.json({ items: plans });
}

// POST /api/revision-plans - Create a new revision plan
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const planMonth = body.planMonth as string;
  if (!planMonth) {
    return NextResponse.json({ error: 'planMonth is required' }, { status: 400 });
  }

  // Check if plan for this month already exists
  const existing = db.prepare('SELECT id FROM revision_plans WHERE plan_month = ?').get(planMonth);
  if (existing) {
    return NextResponse.json({ error: '该月份已存在修订计划' }, { status: 409 });
  }

  const planName = body.planName || `${planMonth.replace('-', '年')}月流程修订计划`;
  const status = body.status || '草稿';

  const result = db.prepare(
    `INSERT INTO revision_plans (plan_month, plan_name, status) VALUES (?, ?, ?)`
  ).run(planMonth, planName, status);

  const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  return NextResponse.json(mapPlanRow(plan), { status: 201 });
}
