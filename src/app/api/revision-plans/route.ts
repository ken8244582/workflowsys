import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/revision-plans - List all plans
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const planMonth = searchParams.get('planMonth');

  let query = 'SELECT * FROM revision_plans';
  const params: string[] = [];

  if (planMonth) {
    query += ' WHERE plan_month = ?';
    params.push(planMonth);
  }

  query += ' ORDER BY plan_month DESC';

  const items = db.prepare(query).all(...params);
  return NextResponse.json({ items });
}

// POST /api/revision-plans - Create a new plan
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { planMonth, planName } = body;

  if (!planMonth) {
    return NextResponse.json({ error: 'planMonth is required' }, { status: 400 });
  }

  const name = planName || `${planMonth.replace('-', '年')}月流程修订计划`;

  try {
    const result = db.prepare(
      'INSERT INTO revision_plans (plan_month, plan_name) VALUES (?, ?)'
    ).run(planMonth, name);

    const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(plan, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: '该月份计划已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// DELETE /api/revision-plans - Delete a plan (query param id)
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const numId = parseInt(id);
  const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  // Only allow deleting draft plans
  if (plan.status !== '草稿') {
    return NextResponse.json({ error: '只能删除草稿状态的计划' }, { status: 400 });
  }

  // Delete all tasks in this plan first
  db.prepare('DELETE FROM plan_tasks WHERE plan_id = ?').run(numId);
  db.prepare('DELETE FROM revision_plans WHERE id = ?').run(numId);

  return NextResponse.json({ success: true });
}
