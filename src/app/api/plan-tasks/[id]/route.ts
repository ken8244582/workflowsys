import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function mapTaskRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    planId: row.plan_id,
    flowItemId: row.flow_item_id,
    processCode: row.process_code,
    processName: row.process_name,
    department: row.department,
    l2Group: row.l2_group,
    l3Segment: row.l3_segment,
    version: row.version,
    format: row.format,
    category: row.category,
    itCoverage: row.it_coverage,
    itScore: row.it_score,
    flowStatus: row.flow_status,
    taskType: row.task_type,
    description: row.description,
    status: row.status,
    completedAt: row.completed_at,
    carriedFromPlanId: row.carried_from_plan_id,
    carriedToPlanId: row.carried_to_plan_id,
    sortOrder: row.sort_order,
    remarks: row.remarks,
    createdAt: row.created_at,
  };
}

// PUT /api/plan-tasks/[id] - Update task status (start/complete/revoke/carryover)
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const numId = parseInt(id);
  const body = await request.json();
  const action = body._action;

  const task = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  if (action === 'start') {
    if (task.status !== '待执行') {
      return NextResponse.json({ error: '只有待执行状态才能开始' }, { status: 400 });
    }
    db.prepare("UPDATE plan_tasks SET status = '进行中' WHERE id = ?").run(numId);
  } else if (action === 'complete') {
    if (task.status !== '进行中' && task.status !== '待执行') {
      return NextResponse.json({ error: '只有进行中或待执行状态才能标记完成' }, { status: 400 });
    }
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare("UPDATE plan_tasks SET status = '已完成', completed_at = ? WHERE id = ?").run(now, numId);

    // === 同步流程清单信息 + 生成修订记录 ===
    const flowItemId = task.flow_item_id as number | null;
    const taskType = task.task_type as string;

    if (flowItemId) {
      const flowItem = db.prepare('SELECT * FROM flow_items WHERE id = ?').get(flowItemId) as Record<string, unknown> | undefined;
      if (flowItem) {
        const oldVersion = flowItem.version as string;

        // 根据任务类型同步流程清单
        if (taskType === '新增流程') {
          // 新增流程：更新状态为"试运行"，版本设为C1.0
          db.prepare("UPDATE flow_items SET status = '试运行', version = 'C1.0' WHERE id = ?").run(flowItemId);
          // 生成新增修订记录
          db.prepare(`
            INSERT INTO revision_records (flow_item_id, process_code, process_name, department, revision_type, before_version, after_version, description, plan_month, completion_time)
            VALUES (?, ?, ?, ?, '新增', '', 'C1.0', ?, ?, ?)
          `).run(flowItemId, flowItem.process_code, flowItem.l4_process, flowItem.l1_domain, 
                task.description || '新增流程', '', now);
        } else if (taskType === '内容修订') {
          // 内容修订：版本号升级（C x.0 → C x+1.0），状态设为试运行
          const newVersion = upgradeVersion(oldVersion);
          db.prepare("UPDATE flow_items SET status = '试运行', version = ? WHERE id = ?").run(newVersion, flowItemId);
          // 生成修订记录
          db.prepare(`
            INSERT INTO revision_records (flow_item_id, process_code, process_name, department, revision_type, before_version, after_version, description, plan_month, completion_time)
            VALUES (?, ?, ?, ?, '修订', ?, ?, ?, ?, ?)
          `).run(flowItemId, flowItem.process_code, flowItem.l4_process, flowItem.l1_domain,
                oldVersion, newVersion, task.description || '内容修订', '', now);
        } else if (taskType === '格式修订') {
          // 格式修订：格式改为"集团模板"，版本号升级
          const newVersion = upgradeVersion(oldVersion);
          db.prepare("UPDATE flow_items SET format = '集团模板', version = ?, status = '试运行' WHERE id = ?").run(newVersion, flowItemId);
          // 生成修订记录
          db.prepare(`
            INSERT INTO revision_records (flow_item_id, process_code, process_name, department, revision_type, before_version, after_version, description, plan_month, completion_time)
            VALUES (?, ?, ?, ?, '修订', ?, ?, ?, ?, ?)
          `).run(flowItemId, flowItem.process_code, flowItem.l4_process, flowItem.l1_domain,
                oldVersion, newVersion, task.description || '格式修订', '', now);
        }

        // 同步plan_tasks中的流程信息
        const updatedFlow = db.prepare('SELECT * FROM flow_items WHERE id = ?').get(flowItemId) as Record<string, unknown>;
        db.prepare(`UPDATE plan_tasks SET version = ?, format = ?, flow_status = ? WHERE id = ?`)
          .run(updatedFlow.version, updatedFlow.format, updatedFlow.status, numId);
      }
    }
  } else if (action === 'revoke') {
    if (task.status !== '已完成') {
      return NextResponse.json({ error: '只有已完成状态才能撤回' }, { status: 400 });
    }
    db.prepare("UPDATE plan_tasks SET status = '进行中', completed_at = NULL WHERE id = ?").run(numId);
    // TODO: 可选 - 撤回时回退流程清单和修订记录（暂不实现，留后续）
  } else if (action === 'carryover') {
    if (task.status !== '待执行' && task.status !== '进行中') {
      return NextResponse.json({ error: '只有待执行或进行中状态才能顺延' }, { status: 400 });
    }

    const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(task.plan_id) as Record<string, unknown>;
    if (!plan) {
      return NextResponse.json({ error: '计划不存在' }, { status: 404 });
    }

    // Calculate next month
    const currentMonth = plan.plan_month as string;
    const [year, month] = currentMonth.split('-').map(Number);
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

    // Create next month plan if not exists
    let nextPlan = db.prepare('SELECT * FROM revision_plans WHERE plan_month = ?').get(nextMonth) as Record<string, unknown> | undefined;
    if (!nextPlan) {
      const nextName = `${nextMonth.replace('-', '年')}月流程修订计划`;
      db.prepare('INSERT INTO revision_plans (plan_month, plan_name) VALUES (?, ?)').run(nextMonth, nextName);
      nextPlan = db.prepare('SELECT * FROM revision_plans WHERE plan_month = ?').get(nextMonth) as Record<string, unknown>;
    }

    const nextPlanId = nextPlan.id as number;

    // Mark current task as carried over
    db.prepare("UPDATE plan_tasks SET status = '已顺延', carried_to_plan_id = ? WHERE id = ?").run(nextPlanId, numId);

    // Create task in next month plan
    const maxSort = db.prepare('SELECT MAX(sort_order) as maxSort FROM plan_tasks WHERE plan_id = ?').get(nextPlanId) as Record<string, unknown>;
    const sortOrder = ((maxSort.maxSort as number | null) || 0) + 1;

    db.prepare(`
      INSERT INTO plan_tasks (plan_id, flow_item_id, process_code, process_name, department, l2_group, l3_segment, version, format, category, it_coverage, it_score, flow_status, task_type, description, status, carried_from_plan_id, sort_order, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '待执行', ?, ?, ?)
    `).run(
      nextPlanId,
      task.flow_item_id,
      task.process_code,
      task.process_name,
      task.department,
      task.l2_group,
      task.l3_segment,
      task.version,
      task.format,
      task.category,
      task.it_coverage,
      task.it_score,
      task.flow_status,
      task.task_type,
      task.description,
      task.plan_id,
      sortOrder,
      `顺延自${currentMonth}`
    );

    // Update next plan task count
    const nextTaskCount = db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(nextPlanId) as Record<string, unknown>;
    db.prepare('UPDATE revision_plans SET task_count = ? WHERE id = ?').run(nextTaskCount.cnt, nextPlanId);
  } else if (action === 'batchStart') {
    // Batch start - body contains taskIds
    const taskIds = body.taskIds as number[];
    if (!taskIds || !taskIds.length) {
      return NextResponse.json({ error: 'taskIds is required' }, { status: 400 });
    }
    const placeholders = taskIds.map(() => '?').join(',');
    db.prepare(`UPDATE plan_tasks SET status = '进行中' WHERE id IN (${placeholders}) AND status = '待执行'`).run(...taskIds);
    return NextResponse.json({ success: true, updatedCount: taskIds.length });
  } else if (action === 'batchComplete') {
    // Batch complete - body contains taskIds + optional sync info
    const taskIds = body.taskIds as number[];
    if (!taskIds || !taskIds.length) {
      return NextResponse.json({ error: 'taskIds is required' }, { status: 400 });
    }
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const placeholders = taskIds.map(() => '?').join(',');
    db.prepare(`UPDATE plan_tasks SET status = '已完成', completed_at = ? WHERE id IN (${placeholders}) AND status IN ('待执行', '进行中')`).run(now, ...taskIds);

    // Sync each task to flow list + generate revision records
    for (const tid of taskIds) {
      const t = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(tid) as Record<string, unknown> | undefined;
      if (!t || !t.flow_item_id) continue;

      const flowItemId = t.flow_item_id as number;
      const flowItem = db.prepare('SELECT * FROM flow_items WHERE id = ?').get(flowItemId) as Record<string, unknown> | undefined;
      if (!flowItem) continue;

      const oldVersion = flowItem.version as string;
      const taskType = t.task_type as string;

      if (taskType === '新增流程') {
        db.prepare("UPDATE flow_items SET status = '试运行', version = 'C1.0' WHERE id = ?").run(flowItemId);
        db.prepare(`
          INSERT INTO revision_records (flow_item_id, process_code, process_name, department, revision_type, before_version, after_version, description, plan_month, completion_time)
          VALUES (?, ?, ?, ?, '新增', '', 'C1.0', ?, ?, ?)
        `).run(flowItemId, flowItem.process_code, flowItem.l4_process, flowItem.l1_domain,
              t.description || '新增流程', '', now);
      } else if (taskType === '内容修订') {
        const newVersion = upgradeVersion(oldVersion);
        db.prepare("UPDATE flow_items SET status = '试运行', version = ? WHERE id = ?").run(newVersion, flowItemId);
        db.prepare(`
          INSERT INTO revision_records (flow_item_id, process_code, process_name, department, revision_type, before_version, after_version, description, plan_month, completion_time)
          VALUES (?, ?, ?, ?, '修订', ?, ?, ?, ?, ?)
        `).run(flowItemId, flowItem.process_code, flowItem.l4_process, flowItem.l1_domain,
              oldVersion, newVersion, t.description || '内容修订', '', now);
      } else if (taskType === '格式修订') {
        const newVersion = upgradeVersion(oldVersion);
        db.prepare("UPDATE flow_items SET format = '集团模板', version = ?, status = '试运行' WHERE id = ?").run(newVersion, flowItemId);
        db.prepare(`
          INSERT INTO revision_records (flow_item_id, process_code, process_name, department, revision_type, before_version, after_version, description, plan_month, completion_time)
          VALUES (?, ?, ?, ?, '修订', ?, ?, ?, ?, ?)
        `).run(flowItemId, flowItem.process_code, flowItem.l4_process, flowItem.l1_domain,
              oldVersion, newVersion, t.description || '格式修订', '', now);
      }

      // Sync plan task flow info
      const updatedFlow = db.prepare('SELECT * FROM flow_items WHERE id = ?').get(flowItemId) as Record<string, unknown>;
      db.prepare(`UPDATE plan_tasks SET version = ?, format = ?, flow_status = ? WHERE id = ?`)
        .run(updatedFlow.version, updatedFlow.format, updatedFlow.status, tid);
    }

    return NextResponse.json({ success: true, completedCount: taskIds.length });
  } else if (action === 'batchCarryover') {
    // Batch carryover
    const taskIds = body.taskIds as number[];
    if (!taskIds || !taskIds.length) {
      return NextResponse.json({ error: 'taskIds is required' }, { status: 400 });
    }

    // Get the plan for these tasks
    const firstTask = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(taskIds[0]) as Record<string, unknown>;
    const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(firstTask.plan_id) as Record<string, unknown>;
    const currentMonth = plan.plan_month as string;
    const [year, month] = currentMonth.split('-').map(Number);
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

    // Create next month plan if not exists
    let nextPlan = db.prepare('SELECT * FROM revision_plans WHERE plan_month = ?').get(nextMonth) as Record<string, unknown> | undefined;
    if (!nextPlan) {
      const nextName = `${nextMonth.replace('-', '年')}月流程修订计划`;
      db.prepare('INSERT INTO revision_plans (plan_month, plan_name) VALUES (?, ?)').run(nextMonth, nextName);
      nextPlan = db.prepare('SELECT * FROM revision_plans WHERE plan_month = ?').get(nextMonth) as Record<string, unknown>;
    }
    const nextPlanId = nextPlan.id as number;

    const maxSort = db.prepare('SELECT MAX(sort_order) as maxSort FROM plan_tasks WHERE plan_id = ?').get(nextPlanId) as Record<string, unknown>;
    let sortOrder = (maxSort.maxSort as number | null) || 0;

    for (const tid of taskIds) {
      const t = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(tid) as Record<string, unknown> | undefined;
      if (!t || (t.status !== '待执行' && t.status !== '进行中')) continue;

      // Mark as carried over
      db.prepare("UPDATE plan_tasks SET status = '已顺延', carried_to_plan_id = ? WHERE id = ?").run(nextPlanId, tid);

      // Create in next plan
      sortOrder++;
      db.prepare(`
        INSERT INTO plan_tasks (plan_id, flow_item_id, process_code, process_name, department, l2_group, l3_segment, version, format, category, it_coverage, it_score, flow_status, task_type, description, status, carried_from_plan_id, sort_order, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '待执行', ?, ?, ?)
      `).run(
        nextPlanId,
        t.flow_item_id,
        t.process_code,
        t.process_name,
        t.department,
        t.l2_group,
        t.l3_segment,
        t.version,
        t.format,
        t.category,
        t.it_coverage,
        t.it_score,
        t.flow_status,
        t.task_type,
        t.description,
        t.plan_id,
        sortOrder,
        `顺延自${currentMonth}`
      );
    }

    // Update next plan task count
    const nextTaskCount = db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(nextPlanId) as Record<string, unknown>;
    db.prepare('UPDATE revision_plans SET task_count = ? WHERE id = ?').run(nextTaskCount.cnt, nextPlanId);

    return NextResponse.json({ success: true, carriedCount: taskIds.length });
  }

  // Update plan counts
  const planId = task.plan_id as number;
  const taskCount = db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(planId) as Record<string, unknown>;
  const completedCount = db.prepare("SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ? AND status = '已完成'").get(planId) as Record<string, unknown>;
  db.prepare('UPDATE revision_plans SET task_count = ?, completed_count = ? WHERE id = ?')
    .run(taskCount.cnt, completedCount.cnt, planId);

  const updatedTask = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(numId) as Record<string, unknown>;
  return NextResponse.json(mapTaskRow(updatedTask));
}

// DELETE /api/plan-tasks/[id] - Delete a task
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const numId = parseInt(id);

  const task = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  const planId = task.plan_id as number;
  db.prepare('DELETE FROM plan_tasks WHERE id = ?').run(numId);

  // Update plan counts
  const taskCount = db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(planId) as Record<string, unknown>;
  const completedCount = db.prepare("SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ? AND status = '已完成'").get(planId) as Record<string, unknown>;
  db.prepare('UPDATE revision_plans SET task_count = ?, completed_count = ? WHERE id = ?')
    .run(taskCount.cnt, completedCount.cnt, planId);

  return NextResponse.json({ success: true });
}

// Version upgrade helper: C5.0 → C6.0
function upgradeVersion(version: string): string {
  if (!version) return 'C1.0';
  const match = version.match(/^C(\d+)\.(\d+)$/);
  if (match) {
    const major = parseInt(match[1]) + 1;
    return `C${major}.0`;
  }
  return version;
}
