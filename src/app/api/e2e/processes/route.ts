import { NextRequest, NextResponse } from 'next/server';
import { getProcesses, createProcess } from '@/lib/e2e-store';

export async function GET() {
  try {
    const processes = getProcesses();
    return NextResponse.json(processes);
  } catch (error) {
    console.error('Failed to get processes:', error);
    return NextResponse.json({ error: '获取流程列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, owner, department, responsiblePerson, currentProgress, targetProgress, status, startDate, completedDate, description } = body;

    if (!name || !owner || !department || !responsiblePerson) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const newProcess = createProcess({
      name,
      owner,
      department,
      responsiblePerson,
      currentProgress: currentProgress ?? 0,
      targetProgress: targetProgress ?? 100,
      status: status ?? 'not_started',
      startDate: startDate ?? '',
      completedDate: completedDate ?? '',
      description: description ?? '',
    });

    return NextResponse.json(newProcess, { status: 201 });
  } catch (error) {
    console.error('Failed to create process:', error);
    return NextResponse.json({ error: '创建流程失败' }, { status: 500 });
  }
}
