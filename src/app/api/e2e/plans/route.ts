import { NextRequest, NextResponse } from 'next/server';
import { getPlans, createPlan } from '@/lib/e2e-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');
    const plans = getPlans();
    const filtered = processId ? plans.filter((p) => p.processId === processId) : plans;
    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Failed to get plans:', error);
    return NextResponse.json({ error: '获取计划列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { processId, planType, year, period, planContent, planProgress, actualProgress, status, notes } = body;

    if (!processId || !planType || !year || !period || !planContent) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const newPlan = createPlan({
      processId,
      planType,
      year,
      period,
      planContent,
      planProgress: planProgress ?? 100,
      actualProgress: actualProgress ?? 0,
      status: status ?? 'planned',
      notes: notes ?? '',
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error) {
    console.error('Failed to create plan:', error);
    return NextResponse.json({ error: '创建计划失败' }, { status: 500 });
  }
}
