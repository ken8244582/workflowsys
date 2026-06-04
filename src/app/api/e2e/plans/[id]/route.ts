import { NextRequest, NextResponse } from 'next/server';
import { updatePlan, deletePlan } from '@/lib/e2e-store';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updatePlan(id, body);
    if (!updated) {
      return NextResponse.json({ error: '计划不存在' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update plan:', error);
    return NextResponse.json({ error: '更新计划失败' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deletePlan(id);
    if (!deleted) {
      return NextResponse.json({ error: '计划不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete plan:', error);
    return NextResponse.json({ error: '删除计划失败' }, { status: 500 });
  }
}
