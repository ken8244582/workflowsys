import { NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAllProcesses, getAllPlans } from '@/lib/e2e-store';

// GET /api/dashboard - Aggregated dashboard statistics
export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const supabase = getSupabaseClient();

  try {
    // 1. Revision plan stats
    const { data: plans } = await supabase
      .from('revision_plans')
      .select('id, plan_month, status, task_count, completed_count')
      .order('plan_month', { ascending: true });

    const revisionPlans = plans || [];
    const totalPlans = revisionPlans.length;
    const publishedPlans = revisionPlans.filter((p: Record<string, unknown>) => p.status === '已下发').length;
    const completedPlans = revisionPlans.filter((p: Record<string, unknown>) => p.status === '已归档').length;
    const totalTasks = revisionPlans.reduce((s: number, p: Record<string, unknown>) => s + (p.task_count as number || 0), 0);
    const totalCompleted = revisionPlans.reduce((s: number, p: Record<string, unknown>) => s + (p.completed_count as number || 0), 0);
    const revisionCompletionRate = totalTasks > 0 ? ((totalCompleted / totalTasks) * 100).toFixed(1) : '0';

    // Monthly trend for last 12 months
    const monthlyTrend = revisionPlans.map((p: Record<string, unknown>) => ({
      month: p.plan_month as string,
      totalTasks: p.task_count as number || 0,
      completed: p.completed_count as number || 0,
    }));

    // 2. Current month task status distribution
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentPlan = revisionPlans.find((p: Record<string, unknown>) => p.plan_month === currentMonth);

    let taskStatusDist: { status: string; count: number }[] = [];
    if (currentPlan) {
      const { data: tasks } = await supabase
        .from('plan_tasks')
        .select('status')
        .eq('plan_id', currentPlan.id);
      
      if (tasks) {
        const statusMap = new Map<string, number>();
        for (const t of tasks) {
          const s = (t as Record<string, unknown>).status as string || '未知';
          statusMap.set(s, (statusMap.get(s) || 0) + 1);
        }
        taskStatusDist = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
      }
    }

    // 3. E2E stats
    const e2eProcesses = await getAllProcesses();
    const e2ePlans = await getAllPlans();

    const e2eTotal = e2eProcesses.length;
    const e2eCompleted = e2eProcesses.filter((p) => p.status === 'completed').length;
    const e2eInProgress = e2eProcesses.filter((p) => p.status === 'in_progress').length;
    const avgE2EProgress = e2eTotal > 0
      ? Math.round(e2eProcesses.reduce((s, d) => s + d.current_progress, 0) / e2eTotal)
      : 0;

    // E2E plan stats
    const e2ePlanTotal = e2ePlans.length;
    const e2ePlanCompleted = e2ePlans.filter((p) => p.status === 'completed').length;
    const e2ePlanInProgress = e2ePlans.filter((p) => p.status === 'in_progress').length;
    const e2ePlanPlanned = e2ePlans.filter((p) => p.status === 'planned').length;
    const e2ePlanCompletionRate = e2ePlanTotal > 0
      ? ((e2ePlanCompleted / e2ePlanTotal) * 100).toFixed(1)
      : '0';

    const avgPlanProgress = e2ePlanTotal > 0
      ? (e2ePlans.reduce((s, p) => s + p.plan_progress, 0) / e2ePlanTotal).toFixed(1)
      : '0';
    const avgActualProgress = e2ePlanTotal > 0
      ? (e2ePlans.reduce((s, p) => s + p.actual_progress, 0) / e2ePlanTotal).toFixed(1)
      : '0';

    // E2E plan status distribution
    const e2ePlanStatusDist = [
      { status: '已完成', count: e2ePlanCompleted },
      { status: '进行中', count: e2ePlanInProgress },
      { status: '计划中', count: e2ePlanPlanned },
    ].filter((d) => d.count > 0);

    // E2E plan progress comparison by process
    const processPlanProgress = e2eProcesses.map((proc) => {
      const procPlans = e2ePlans.filter((p) => p.process_id === proc.id);
      const avgPlan = procPlans.length > 0
        ? Math.round(procPlans.reduce((s, p) => s + p.plan_progress, 0) / procPlans.length)
        : 0;
      const avgActual = procPlans.length > 0
        ? Math.round(procPlans.reduce((s, p) => s + p.actual_progress, 0) / procPlans.length)
        : 0;
      return {
        name: proc.name,
        planProgress: avgPlan,
        actualProgress: avgActual,
      };
    });

    return NextResponse.json({
      revision: {
        totalPlans,
        publishedPlans,
        completedPlans,
        totalTasks,
        totalCompleted,
        completionRate: revisionCompletionRate,
        monthlyTrend,
        currentMonthTaskStatus: taskStatusDist,
        currentMonth,
      },
      e2e: {
        total: e2eTotal,
        completed: e2eCompleted,
        inProgress: e2eInProgress,
        avgProgress: avgE2EProgress,
        processes: e2eProcesses.map((p) => ({
          id: p.id,
          name: p.name,
          owner: p.owner,
          department: p.department,
          currentProgress: p.current_progress,
          targetProgress: p.target_progress,
          status: p.status,
        })),
        planTotal: e2ePlanTotal,
        planCompleted: e2ePlanCompleted,
        planInProgress: e2ePlanInProgress,
        planCompletionRate: e2ePlanCompletionRate,
        avgPlanProgress,
        avgActualProgress,
        planStatusDist: e2ePlanStatusDist,
        processPlanProgress,
      },
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
