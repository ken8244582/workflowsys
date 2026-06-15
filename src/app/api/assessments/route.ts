import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import { getAssessments, createAssessment, copyAssessment, seedStandardsIfNeeded } from '@/lib/assessment-data';

// GET /api/assessments - List all assessments
export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    await seedStandardsIfNeeded();
    const assessments = await getAssessments();
    return NextResponse.json(assessments);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '查询自评列表失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/assessments - Create a new assessment (or copy from existing)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const body = await request.json();
    const { name, period, copyFromId } = body;
    if (!name || !period) {
      return NextResponse.json({ error: '名称和周期不能为空' }, { status: 400 });
    }

    if (copyFromId) {
      // Copy from an existing assessment
      const assessment = await copyAssessment(copyFromId, name, period, authResult.username);
      return NextResponse.json(assessment);
    }

    const assessment = await createAssessment(name, period, authResult.username);
    return NextResponse.json(assessment);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '创建自评失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
