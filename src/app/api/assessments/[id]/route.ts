import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import {
  getAssessmentWithDetails,
  saveAssessmentDetails,
  submitAssessment,
  deleteAssessment,
  updateAssessment,
  generateComparisonReport,
} from '@/lib/assessment-data';
import { getSupabaseClient } from '@/storage/database/supabase-client';

async function resolveDisplayName(username: string): Promise<string> {
  const client = getSupabaseClient();
  const { data } = await client.from('sys_users').select('display_name').eq('username', username).maybeSingle();
  return data?.display_name || username;
}

// GET /api/assessments/[id] - Get assessment with details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const { id } = await params;
    const assessmentId = parseInt(id);
    if (isNaN(assessmentId)) {
      return NextResponse.json({ error: '无效的ID' }, { status: 400 });
    }
    const assessment = await getAssessmentWithDetails(assessmentId);
    if (!assessment) {
      return NextResponse.json({ error: '自评不存在' }, { status: 404 });
    }
    // Resolve display names
    const createdByDn = await resolveDisplayName(assessment.created_by as string);
    const updatedByDn = await resolveDisplayName(assessment.updated_by as string);
    return NextResponse.json({ ...assessment, created_by: createdByDn, updated_by: updatedByDn });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '查询自评失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/assessments/[id] - Save details / submit / update info
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const { id } = await params;
    const assessmentId = parseInt(id);
    if (isNaN(assessmentId)) {
      return NextResponse.json({ error: '无效的ID' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;
    const displayName = authResult.displayName || authResult.username;

    if (action === 'save') {
      // Save assessment details
      const { details } = body;
      if (!Array.isArray(details)) {
        return NextResponse.json({ error: '明细数据格式错误' }, { status: 400 });
      }
      const assessment = await saveAssessmentDetails(assessmentId, details, displayName);
      return NextResponse.json(assessment);
    }

    if (action === 'submit') {
      const assessment = await submitAssessment(assessmentId, displayName);
      return NextResponse.json(assessment);
    }

    if (action === 'update') {
      const { name, period, remarks } = body;
      const assessment = await updateAssessment(assessmentId, { name, period, remarks }, displayName);
      return NextResponse.json(assessment);
    }

    // Compare with another assessment
    if (action === 'compare') {
      const { compareAssessmentId } = body;
      if (!compareAssessmentId) {
        return NextResponse.json({ error: '请指定对比的自评ID' }, { status: 400 });
      }
      const report = await generateComparisonReport(assessmentId, compareAssessmentId);
      return NextResponse.json(report);
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '操作失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/assessments/[id] - Delete assessment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const { id } = await params;
    const assessmentId = parseInt(id);
    if (isNaN(assessmentId)) {
      return NextResponse.json({ error: '无效的ID' }, { status: 400 });
    }
    await deleteAssessment(assessmentId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '删除自评失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
