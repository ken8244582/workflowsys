import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapPlanTaskRow } from '@/lib/db';

// PUT /api/plan-tasks/[id] - Update a task (mark complete, carry over, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const numId = parseInt(id);

  const existing = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const action = body._action;

  if (action === 'complete') {
    // 标记完成
    db.prepare("UPDATE plan_tasks SET status = '已完成', completed_at = datetime('now','localtime') WHERE id = ?").run(numId);
  } else if (action === 'start') {
    // 标记进行中
    db.prepare("UPDATE plan_tasks SET status = '进行中' WHERE id = ?").run(numId);
  } else if (action === 'undo_complete') {
    // 撤销完成
    db.prepare("UPDATE plan_tasks SET status = '进行中', completed_at = NULL WHERE id = ?").run(numId);
  } else if (action === 'carry_over') {
    // 顺延到下月
    const targetPlanId = body.targetPlanId;
    if (!targetPlanId) {
      return NextResponse.json({ error: 'targetPlanId is required' }, { status: 400 });
    }

    const targetPlan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(targetPlanId) as Record<string, unknown> | undefined;
    if (!targetPlan) {
      return NextResponse.json({ error: 'Target plan not found' }, { status: 404 });
    }

    const transaction = db.transaction(() => {
      // Mark current task as carried over
      db.prepare("UPDATE plan_tasks SET status = '已顺延', carried_to_plan_id = ? WHERE id = ?").run(targetPlanId, numId);

      // Create new task in target plan
      const maxSort = (db.prepare('SELECT MAX(sort_order) as max_sort FROM plan_tasks WHERE plan_id = ?').get(targetPlanId) as { max_sort: number | null }).max_sort || 0;

      db.prepare(`
        INSERT INTO plan_tasks (plan_id, flow_item_id, process_code, process_name, department,
          task_type, description, status, sort_order, remarks, carried_from_plan_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        targetPlanId,
        existing.flow_item_id,
        existing.process_code,
        existing.process_name,
        existing.department,
        existing.task_type,
        existing.description,
        '待执行',
        maxSort + 1,
        existing.remarks,
        existing.plan_id
      );

      // Update both plans' counts
      for (const pid of [existing.plan_id as number, targetPlanId]) {
        const taskCount = (db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(pid) as { cnt: number }).cnt;
        const completedCount = (db.prepare("SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ? AND status = '已完成'").get(pid) as { cnt: number }).cnt;
        db.prepare('UPDATE revision_plans SET task_count = ?, completed_count = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(taskCount, completedCount, pid);
      }
    });

    transaction();
  } else {
    // General update
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.taskType !== undefined) { updates.push('task_type = ?'); values.push(body.taskType); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.remarks !== undefined) { updates.push('remarks = ?'); values.push(body.remarks); }
    if (body.processName !== undefined) { updates.push('process_name = ?'); values.push(body.processName); }
    if (body.department !== undefined) { updates.push('department = ?'); values.push(body.department); }

    if (updates.length > 0) {
      values.push(numId);
      db.prepare(`UPDATE plan_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
  }

  const updated = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(numId) as Record<string, unknown>;
  return NextResponse.json(mapPlanTaskRow(updated));
}

// DELETE /api/plan-tasks/[id] - Delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const numId = parseInt(id);

  const existing = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const planId = existing.plan_id as number;

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM plan_tasks WHERE id = ?').run(numId);
    // Update plan counts
    const taskCount = (db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(planId) as { cnt: number }).cnt;
    const completedCount = (db.prepare("SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ? AND status = '已完成'").get(planId) as { cnt: number }).cnt;
    db.prepare('UPDATE revision_plans SET task_count = ?, completed_count = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(taskCount, completedCount, planId);
  });

  transaction();

  return NextResponse.json({ success: true });
}
