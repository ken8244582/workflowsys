import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as XLSX from 'xlsx';
import { requireAuth, isSession } from '@/lib/api-auth';
import { beijingNow } from '@/lib/utils';

function mapRowToTask(row: Record<string, string>, planId: number, sortOrder: number, username: string) {
  const now = beijingNow();
  return {
    plan_id: planId,
    flow_item_id: null,
    process_code: row['流程编码'] || row['process_code'] || row['processCode'] || '',
    process_name: row['流程名称'] || row['L4职能流程'] || row['l4_process'] || row['processName'] || row['l4Process'] || '',
    owner: row['L4流程所有者'] || row['L4所有者'] || row['l4_owner'] || row['owner'] || row['l4Owner'] || '',
    department: row['流程所属部门'] || row['所属部门'] || row['department'] || '',
    task_type: row['任务类型'] || row['task_type'] || row['taskType'] || '修订流程',
    description: row['修订要求'] || row['修订说明'] || row['description'] || '',
    status: row['状态'] || row['status'] || '待执行',
    completed_at: row['完成时间'] || row['completed_at'] || null,
    carried_from_plan_id: null,
    carried_to_plan_id: null,
    sort_order: sortOrder,
    remarks: row['备注'] || row['remarks'] || '',
    version: row['版本号'] || row['最新版本号'] || row['version'] || '',
    format: row['格式'] || row['format'] || '',
    category: row['分类'] || row['category'] || '',
    created_at: now,
    created_by: username,
    updated_by: username,
    updated_at_ts: now,
  };
}

/**
 * Detect if the first row is a merged title row (not a data header).
 */
function detectTitleRow(rows: Record<string, string>[]): boolean {
  if (rows.length === 0) return false;
  const firstKey = Object.keys(rows[0])[0] || '';
  const hasEmptyKeys = Object.keys(rows[0]).some(k => k.startsWith('__EMPTY'));
  return hasEmptyKeys && !firstKey.includes('流程编码') && !firstKey.includes('流程名称') && !firstKey.includes('序号');
}

// Helper to update plan counts
async function updatePlanCounts(planId: number, username?: string) {
  const supabase = getSupabaseClient();
  const { data: tasks } = await supabase
    .from('plan_tasks')
    .select('status')
    .eq('plan_id', planId);

  const taskCount = tasks?.length || 0;
  const completedCount = tasks?.filter((t: Record<string, unknown>) => t.status === '已完成').length || 0;

  const now = beijingNow();
  await supabase
    .from('revision_plans')
    .update({ task_count: taskCount, completed_count: completedCount, updated_at: now, updated_by: username || '' })
    .eq('id', planId);
}

// POST /api/revision-plans/[id]/reinitialize - Reinitialize all tasks for a plan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  const { id } = await params;
  const planId = parseInt(id);
  if (isNaN(planId)) {
    return NextResponse.json({ error: '无效的计划ID' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Check plan exists
  const { data: plan } = await supabase
    .from('revision_plans')
    .select('id, status')
    .eq('id', planId)
    .single();

  if (!plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: '未选择文件' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();
  let rows: Record<string, string>[] = [];

  if (fileName.endsWith('.json')) {
    try {
      const jsonData = JSON.parse(buffer.toString('utf-8'));
      if (!Array.isArray(jsonData)) {
        return NextResponse.json({ error: 'JSON文件格式错误' }, { status: 400 });
      }
      rows = jsonData;
    } catch {
      return NextResponse.json({ error: 'JSON文件解析失败' }, { status: 400 });
    }
  } else {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const testRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    const hasTitleRow = detectTitleRow(testRows);

    const dataStartRow = hasTitleRow ? 1 : 0;
    rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: '',
      range: dataStartRow,
    });

    rows = rows.map(row => {
      const mapped: Record<string, string> = {};
      Object.entries(row).forEach(([k, v]) => {
        mapped[k] = String(v ?? '');
      });
      return mapped;
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: '文件为空' }, { status: 400 });
  }

  const insertRows = rows
    .map((row, idx) => mapRowToTask(row, planId, idx + 1, session.username))
    .filter(row => row.process_code || row.process_name);

  if (insertRows.length === 0) {
    return NextResponse.json({ error: '没有有效的任务数据' }, { status: 400 });
  }

  // Delete all existing tasks for this plan
  const { error: deleteError } = await supabase
    .from('plan_tasks')
    .delete()
    .eq('plan_id', planId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insert in batches
  const batchSize = 100;
  let totalInserted = 0;
  for (let i = 0; i < insertRows.length; i += batchSize) {
    const batch = insertRows.slice(i, i + batchSize);
    const { data, error: insertError } = await supabase
      .from('plan_tasks')
      .insert(batch)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    totalInserted += data?.length || 0;
  }

  // Update plan counts
  await updatePlanCounts(planId, session.username);

  return NextResponse.json({ success: true, count: totalInserted });
}
