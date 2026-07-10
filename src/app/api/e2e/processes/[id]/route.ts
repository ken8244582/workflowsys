import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import {
  getProcessById,
  updateProcess,
  deleteProcess,
} from '@/lib/e2e-store';

// GET /api/e2e/processes/[id] - Get single e2e process
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id } = await params;
  try {
    const process = await getProcessById(id);
    if (!process) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(process);
  } catch (error) {
    console.error('Failed to get e2e process:', error);
    return NextResponse.json({ error: '获取端到端流程失败' }, { status: 500 });
  }
}

// PUT /api/e2e/processes/[id] - Update e2e process
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
    const process = await updateProcess(id, body, session.username);
    return NextResponse.json(process);
  } catch (error) {
    console.error('Failed to update e2e process:', error);
    return NextResponse.json({ error: '更新端到端流程失败' }, { status: 500 });
  }
}

// DELETE /api/e2e/processes/[id] - Delete e2e process
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id } = await params;
  try {
    await deleteProcess(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete e2e process:', error);
    return NextResponse.json({ error: '删除端到端流程失败' }, { status: 500 });
  }
}
