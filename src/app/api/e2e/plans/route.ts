import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import {
  getPlansByProcessId,
  getAllPlans,
  createPlan,
} from '@/lib/e2e-store';

// GET /api/e2e/plans - List e2e plans (optionally filtered by process_id)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const processId = searchParams.get('process_id');

  try {
    const plans = processId
      ? await getPlansByProcessId(processId)
      : await getAllPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Failed to get e2e plans:', error);
    return NextResponse.json({ error: '获取端到端计划失败' }, { status: 500 });
  }
}

// POST /api/e2e/plans - Create a new e2e plan
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  try {
    const body = await request.json();
    const plan = await createPlan({
      process_id: body.process_id || '',
      plan_type: body.plan_type || 'monthly',
      year: body.year || 0,
      period: body.period || 0,
      plan_content: body.plan_content || '',
      plan_progress: body.plan_progress ?? 100,
      actual_progress: body.actual_progress ?? 0,
      status: body.status || 'planned',
      notes: body.notes || '',
      created_by: session.username,
      updated_by: session.username,
    }, session.username);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Failed to create e2e plan:', error);
    return NextResponse.json({ error: '创建端到端计划失败' }, { status: 500 });
  }
}
