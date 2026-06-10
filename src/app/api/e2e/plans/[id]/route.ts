import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import {
  updatePlan,
  deletePlan,
} from '@/lib/e2e-store';

// PUT /api/e2e/plans/[id] - Update e2e plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  const { id } = await params;
  try {
    const body = await request.json();
    const plan = await updatePlan(id, body, session.username);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Failed to update e2e plan:', error);
    return NextResponse.json({ error: '更新端到端计划失败' }, { status: 500 });
  }
}

// DELETE /api/e2e/plans/[id] - Delete e2e plan
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id } = await params;
  try {
    await deletePlan(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete e2e plan:', error);
    return NextResponse.json({ error: '删除端到端计划失败' }, { status: 500 });
  }
}
