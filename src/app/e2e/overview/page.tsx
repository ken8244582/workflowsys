'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { E2EProcess, E2EPlan } from '@/lib/e2e-store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const CHART_COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4'];

const STATUS_LABEL: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
};

const STATUS_COLOR: Record<string, string> = {
  not_started: '#94a3b8',
  in_progress: '#3b82f6',
  completed: '#10b981',
};

// ---- 指标卡片 ----
function StatCard({ title, value, subtitle, accent }: {
  title: string; value: number | string; subtitle?: string; accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-[#1e3a5f]/20 bg-[#1e3a5f]/5' : ''}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? 'text-[#1e3a5f]' : ''}`}>{value}</p>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ---- 进度条行 ----
function ProgressRow({ process }: { process: E2EProcess }) {
  const pct = process.currentProgress;
  const barColor = pct >= 100 ? '#10b981' : pct >= 70 ? '#1e3a5f' : '#3b82f6';
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-[180px] shrink-0">
        <p className="truncate text-sm font-medium text-foreground">{process.name}</p>
        <p className="text-[11px] text-muted-foreground">{process.department}</p>
      </div>
      <div className="flex-1">
        <div className="relative h-6 w-full rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground tabular-nums" style={{ mixBlendMode: 'difference', color: '#fff' }}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="w-[70px] shrink-0 text-right">
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${STATUS_COLOR[process.status]}15`, color: STATUS_COLOR[process.status] }}>
          {STATUS_LABEL[process.status]}
        </span>
      </div>
    </div>
  );
}

// ---- 状态分布饼图 ----
function StatusPieChart({ data }: { data: E2EProcess[] }) {
  const statusMap = new Map<string, number>();
  data.forEach((d) => {
    statusMap.set(d.status, (statusMap.get(d.status) || 0) + 1);
  });
  const chartData = Array.from(statusMap.entries()).map(([name, value]) => ({
    name: STATUS_LABEL[name] || name,
    value,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">完成状态分布</CardTitle></CardHeader>
        <CardContent><div className="flex h-48 items-center justify-center text-sm text-muted-foreground">暂无数据</div></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">完成状态分布</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
              {chartData.map((entry, index) => {
                const colorKey = Object.entries(STATUS_LABEL).find(([, v]) => v === entry.name)?.[0] || '';
                return <Cell key={`cell-${index}`} fill={STATUS_COLOR[colorKey] || CHART_COLORS[index]} />;
              })}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---- 部门分布柱状图 ----
function DeptBarChart({ data }: { data: E2EProcess[] }) {
  const deptMap = new Map<string, number>();
  data.forEach((d) => {
    deptMap.set(d.department, (deptMap.get(d.department) || 0) + 1);
  });
  const chartData = Array.from(deptMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">责任部门分布</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
            <Tooltip />
            <Bar dataKey="count" fill="#1e3a5f" radius={[0, 4, 4, 0]} name="流程数" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---- 年度梳理计划时间轴 ----
function YearlyPlanTimeline({ plans, processes }: { plans: E2EPlan[]; processes: E2EProcess[] }) {
  const currentYear = new Date().getFullYear();
  const yearPlans = plans.filter((p) => p.year === currentYear);
  const processMap = new Map(processes.map((p) => [p.id, p]));

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const statusIcon: Record<string, string> = {
    planned: '○',
    in_progress: '◐',
    completed: '●',
    delayed: '✕',
  };
  const statusTextColor: Record<string, string> = {
    planned: 'text-muted-foreground',
    in_progress: 'text-[#3b82f6]',
    completed: 'text-[#10b981]',
    delayed: 'text-[#dc2626]',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{currentYear}年度梳理计划进度</CardTitle>
        <CardDescription>按月查看各端到端流程的梳理计划安排，橙色为计划进度，蓝色为实际进度</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
          {months.map((m) => {
            const monthPlans = yearPlans.filter((p) => p.planType === 'monthly' && p.period === m);
            const quarter = Math.ceil(m / 3);
            const quarterPlans = yearPlans.filter((p) => p.planType === 'quarterly' && p.period === quarter);
            const allPlans = [...monthPlans, ...quarterPlans];
            return (
              <div key={m} className="rounded-lg border bg-muted/20 p-2">
                <p className="mb-1.5 text-center text-xs font-semibold text-muted-foreground">{m}月</p>
                {allPlans.length === 0 ? (
                  <p className="py-3 text-center text-[10px] text-muted-foreground/50">暂无计划</p>
                ) : (
                  <div className="space-y-1">
                    {allPlans.map((plan) => {
                      const proc = processMap.get(plan.processId);
                      const actualProg = proc?.currentProgress ?? 0;
                      const isOverPlan = actualProg >= plan.planProgress;
                      return (
                        <div key={plan.id} className="rounded bg-background px-1.5 py-1 text-[10px]">
                          <p className="truncate font-medium">{proc?.name || '未知'}</p>
                          <div className="mt-0.5 flex items-center gap-1">
                            <span className="text-[9px] text-[#f59e0b]">{plan.planProgress}%</span>
                            <span className={`text-[9px] ${statusTextColor[plan.status]}`}>
                              {statusIcon[plan.status]}
                            </span>
                            <span className={`text-[9px] ${isOverPlan ? 'text-[#10b981]' : 'text-[#1e3a5f]'}`}>{actualProg}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- 主页面 ----
export default function E2EOverviewPage() {
  const [processes, setProcesses] = useState<E2EProcess[]>([]);
  const [plans, setPlans] = useState<E2EPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [procRes, planRes] = await Promise.all([
        fetch('/api/e2e/processes'),
        fetch('/api/e2e/plans'),
      ]);
      const procData = await procRes.json();
      const planData = await planRes.json();
      setProcesses(Array.isArray(procData) ? procData : []);
      setPlans(Array.isArray(planData) ? planData : []);
    } catch (error) {
      console.error('Failed to fetch e2e data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">加载端到端流程数据...</p>
        </div>
      </div>
    );
  }

  const total = processes.length;
  const avgProgress = total > 0 ? Math.round(processes.reduce((s, d) => s + d.currentProgress, 0) / total) : 0;
  const completed = processes.filter((d) => d.status === 'completed').length;
  const inProgress = processes.filter((d) => d.status === 'in_progress').length;
  const sortedProcesses = [...processes].sort((a, b) => b.currentProgress - a.currentProgress);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
        <h2 className="text-xl font-semibold text-[#1e3a5f]">端到端流程概览</h2>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="端到端流程总数" value={total} accent />
        <StatCard title="平均完成进度" value={`${avgProgress}%`} accent />
        <StatCard title="已完成" value={completed} subtitle={`共 ${total} 条`} />
        <StatCard title="进行中" value={inProgress} subtitle={`占比 ${total > 0 ? Math.round((inProgress / total) * 100) : 0}%`} />
      </div>

      {/* 核心进度条图 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">端到端流程贯通进度</CardTitle>
              <CardDescription>各端到端流程当前完成进度</CardDescription>
            </div>
            <Link href="/e2e/list" className="text-xs text-[#1e3a5f] hover:underline">管理流程 →</Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {sortedProcesses.map((p) => (
              <ProgressRow key={p.id} process={p} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 双图并排 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <StatusPieChart data={processes} />
        <DeptBarChart data={processes} />
      </div>

      {/* 年度梳理计划时间轴 */}
      <YearlyPlanTimeline plans={plans} processes={processes} />

      {/* 页脚链接 */}
      <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>数据来源：端到端流程管理模块</span>
        <div className="flex items-center gap-4">
          <Link href="/e2e/list" className="text-[#1e3a5f] hover:underline">管理流程 →</Link>
          <Link href="/e2e/plan" className="text-[#1e3a5f] hover:underline">梳理计划 →</Link>
        </div>
      </div>
    </div>
  );
}
