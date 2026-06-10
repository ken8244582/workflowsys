import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import {
  getAllProcesses,
  createProcess,
} from '@/lib/e2e-store';

// GET /api/e2e/processes - List all e2e processes
export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const processes = await getAllProcesses();
    return NextResponse.json(processes);
  } catch (error) {
    console.error('Failed to get e2e processes:', error);
    return NextResponse.json({ error: '获取端到端流程列表失败' }, { status: 500 });
  }
}

// POST /api/e2e/processes - Create a new e2e process
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  try {
    const body = await request.json();
    const process = await createProcess({
      name: body.name || '',
      owner: body.owner || '',
      department: body.department || '',
      responsible_person: body.responsible_person || '',
      current_progress: body.current_progress ?? 0,
      target_progress: body.target_progress ?? 100,
      status: body.status || 'not_started',
      start_date: body.start_date || '',
      completed_date: body.completed_date || '',
      description: body.description || '',
      created_by: session.username,
      updated_by: session.username,
    }, session.username);
    return NextResponse.json(process);
  } catch (error) {
    console.error('Failed to create e2e process:', error);
    return NextResponse.json({ error: '创建端到端流程失败' }, { status: 500 });
  }
}
