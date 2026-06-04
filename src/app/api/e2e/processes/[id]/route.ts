import { NextRequest, NextResponse } from 'next/server';
import { getProcessById, updateProcess, deleteProcess } from '@/lib/e2e-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const process = getProcessById(id);
    if (!process) {
      return NextResponse.json({ error: '流程不存在' }, { status: 404 });
    }
    return NextResponse.json(process);
  } catch (error) {
    console.error('Failed to get process:', error);
    return NextResponse.json({ error: '获取流程失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updateProcess(id, body);
    if (!updated) {
      return NextResponse.json({ error: '流程不存在' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update process:', error);
    return NextResponse.json({ error: '更新流程失败' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteProcess(id);
    if (!deleted) {
      return NextResponse.json({ error: '流程不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete process:', error);
    return NextResponse.json({ error: '删除流程失败' }, { status: 500 });
  }
}
