'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { E2EProcess, E2EPlan } from '@/lib/e2e-store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-600' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-600' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

const STATUS_OPTIONS: { value: E2EProcess['status']; label: string }[] = [
  { value: 'not_started', label: '未开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
];

const PLAN_STATUS_OPTIONS: { value: E2EPlan['status']; label: string; dotColor: string }[] = [
  { value: 'planned', label: '计划中', dotColor: '#94a3b8' },
  { value: 'in_progress', label: '进行中', dotColor: '#3b82f6' },
  { value: 'completed', label: '已完成', dotColor: '#10b981' },
  { value: 'delayed', label: '延期', dotColor: '#dc2626' },
];

const STATUS_DOT: Record<string, { symbol: string; color: string }> = {
  planned: { symbol: '○', color: 'text-slate-400' },
  in_progress: { symbol: '◐', color: 'text-blue-500' },
  completed: { symbol: '●', color: 'text-emerald-500' },
  delayed: { symbol: '✕', color: 'text-red-500' },
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
function YearlyPlanTimeline({
  plans, processes, onEditPlan, onDeletePlan,
}: {
  plans: E2EPlan[]; processes: E2EProcess[];
  onEditPlan: (plan: E2EPlan) => void;
  onDeletePlan: (planId: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const yearPlans = plans.filter((p) => p.year === currentYear);
  const processMap = new Map(processes.map((p) => [p.id, p]));

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

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
                      const dot = STATUS_DOT[plan.status] || STATUS_DOT.planned;
                      return (
                        <div key={plan.id} className="group relative rounded bg-background px-1.5 py-1 text-[10px]">
                          <p className="truncate font-medium">{proc?.name || '未知'}</p>
                          <div className="mt-0.5 flex items-center gap-1">
                            <span className="text-[9px] text-[#f59e0b]">{plan.planProgress}%</span>
                            <span className={`text-[9px] ${dot.color}`}>{dot.symbol}</span>
                            <span className={`text-[9px] ${isOverPlan ? 'text-[#10b981]' : 'text-[#1e3a5f]'}`}>{actualProg}%</span>
                          </div>
                          {/* 操作按钮，hover 时显示 */}
                          <div className="absolute right-0.5 top-0.5 hidden gap-1 group-hover:flex">
                            <button
                              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); onEditPlan(plan); }}
                              title="编辑"
                            >
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                            </button>
                            <button
                              className="rounded p-0.5 text-[#dc2626] hover:bg-red-50 hover:text-[#dc2626]"
                              onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }}
                              title="删除"
                            >
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            </button>
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

  // 流程编辑弹窗
  const [showProcDialog, setShowProcDialog] = useState(false);
  const [editingProcId, setEditingProcId] = useState<string | null>(null);
  const [procForm, setProcForm] = useState({
    name: '', owner: '', department: '', responsiblePerson: '',
    currentProgress: 0, status: 'in_progress' as E2EProcess['status'],
    startDate: '', completedDate: '', description: '',
  });
  const [savingProc, setSavingProc] = useState(false);

  // 流程删除确认
  const [deleteProcId, setDeleteProcId] = useState<string | null>(null);
  const [deletingProc, setDeletingProc] = useState(false);

  // 计划编辑弹窗
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    processId: '', planType: 'monthly' as 'monthly' | 'quarterly',
    year: new Date().getFullYear(), period: 1,
    planContent: '', planProgress: 100, status: 'planned' as E2EPlan['status'], notes: '',
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // 计划删除确认
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  // 快速更新进度
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickProgress, setQuickProgress] = useState(0);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const processMap = new Map(processes.map((p) => [p.id, p]));

  // ---- 流程操作 ----
  const handleEditProc = (proc: E2EProcess) => {
    setEditingProcId(proc.id);
    setProcForm({
      name: proc.name, owner: proc.owner, department: proc.department,
      responsiblePerson: proc.responsiblePerson, currentProgress: proc.currentProgress,
      status: proc.status, startDate: proc.startDate || '', completedDate: proc.completedDate || '',
      description: proc.description || '',
    });
    setShowProcDialog(true);
  };

  const handleSaveProc = async () => {
    if (!procForm.name.trim()) return;
    setSavingProc(true);
    try {
      // 根据 currentProgress 自动计算 status，防止进度与状态不一致
      const autoStatus = procForm.currentProgress >= 100 ? 'completed' as const : procForm.currentProgress > 0 ? 'in_progress' as const : 'not_started' as const;
      const payload = { ...procForm, status: autoStatus };
      if (editingProcId) {
        await fetch(`/api/e2e/processes/${editingProcId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowProcDialog(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to save process:', error);
    } finally {
      setSavingProc(false);
    }
  };

  const handleDeleteProc = async () => {
    if (!deleteProcId) return;
    setDeletingProc(true);
    try {
      await fetch(`/api/e2e/processes/${deleteProcId}`, { method: 'DELETE' });
      setDeleteProcId(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete process:', error);
    } finally {
      setDeletingProc(false);
    }
  };

  const handleQuickProgressSave = async () => {
    if (!quickEditId) return;
    try {
      const newStatus = quickProgress >= 100 ? 'completed' as const : quickProgress > 0 ? 'in_progress' as const : 'not_started' as const;
      await fetch(`/api/e2e/processes/${quickEditId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentProgress: quickProgress, status: newStatus }),
      });
      setQuickEditId(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  // ---- 计划操作 ----
  const handleEditPlan = (plan: E2EPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      processId: plan.processId, planType: plan.planType,
      year: plan.year, period: plan.period,
      planContent: plan.planContent, planProgress: plan.planProgress,
      status: plan.status, notes: plan.notes ?? '',
    });
    setShowPlanDialog(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.processId || !planForm.planContent.trim()) return;
    setSavingPlan(true);
    try {
      if (editingPlanId) {
        await fetch(`/api/e2e/plans/${editingPlanId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planForm),
        });
      }
      setShowPlanDialog(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to save plan:', error);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    setDeletingPlan(true);
    try {
      await fetch(`/api/e2e/plans/${deletePlanId}`, { method: 'DELETE' });
      setDeletePlanId(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    } finally {
      setDeletingPlan(false);
    }
  };

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
            {sortedProcesses.map((p) => {
              const pct = p.currentProgress;
              const barColor = pct >= 100 ? '#10b981' : pct >= 70 ? '#1e3a5f' : '#3b82f6';
              const badge = STATUS_BADGE[p.status] || STATUS_BADGE.not_started;
              return (
                <div key={p.id} className="flex items-center gap-3 py-2.5 group">
                  <div className="w-[180px] shrink-0">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.department}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="relative h-6 w-full rounded-full bg-muted">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums" style={{ mixBlendMode: 'difference', color: '#fff' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-[70px] shrink-0 text-right">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                      {STATUS_OPTIONS.find((s) => s.value === p.status)?.label || p.status}
                    </span>
                  </div>
                  <div className="w-[90px] shrink-0 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="text-muted-foreground hover:text-[#1e3a5f] transition-colors"
                      title="更新进度"
                      onClick={() => { setQuickEditId(p.id); setQuickProgress(p.currentProgress); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </button>
                    <button
                      className="text-muted-foreground hover:text-[#1e3a5f] transition-colors"
                      title="编辑"
                      onClick={() => handleEditProc(p)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button
                      className="text-muted-foreground hover:text-[#dc2626] transition-colors"
                      title="删除"
                      onClick={() => setDeleteProcId(p.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 双图并排 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <StatusPieChart data={processes} />
        <DeptBarChart data={processes} />
      </div>

      {/* 年度梳理计划时间轴 */}
      <YearlyPlanTimeline plans={plans} processes={processes} onEditPlan={handleEditPlan} onDeletePlan={setDeletePlanId} />

      {/* 页脚链接 */}
      <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>数据来源：端到端流程管理模块</span>
        <div className="flex items-center gap-4">
          <Link href="/e2e/list" className="text-[#1e3a5f] hover:underline">管理流程 →</Link>
          <Link href="/e2e/plan" className="text-[#1e3a5f] hover:underline">梳理计划 →</Link>
        </div>
      </div>

      {/* ---- 流程编辑弹窗 ---- */}
      <Dialog open={showProcDialog} onOpenChange={setShowProcDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑端到端流程</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>流程名称 *</Label>
                <Input value={procForm.name} onChange={(e) => setProcForm({ ...procForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>流程所有者 *</Label>
                <Input value={procForm.owner} onChange={(e) => setProcForm({ ...procForm, owner: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>责任部门 *</Label>
                <Input value={procForm.department} onChange={(e) => setProcForm({ ...procForm, department: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>责任人 *</Label>
                <Input value={procForm.responsiblePerson} onChange={(e) => setProcForm({ ...procForm, responsiblePerson: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>当前进度: {procForm.currentProgress}%</Label>
              <Slider value={[procForm.currentProgress]} onValueChange={([v]) => setProcForm({ ...procForm, currentProgress: v })} max={100} step={5} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>状态</Label>
                <Select value={procForm.status} onValueChange={(v: E2EProcess['status']) => setProcForm({ ...procForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>开始日期</Label>
                <Input type="date" value={procForm.startDate} onChange={(e) => setProcForm({ ...procForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>完成日期</Label>
                <Input type="date" value={procForm.completedDate} onChange={(e) => setProcForm({ ...procForm, completedDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Textarea value={procForm.description} onChange={(e) => setProcForm({ ...procForm, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcDialog(false)}>取消</Button>
            <Button onClick={handleSaveProc} disabled={savingProc || !procForm.name.trim()} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {savingProc ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- 快速更新进度弹窗 ---- */}
      <Dialog open={quickEditId !== null} onOpenChange={(open) => { if (!open) setQuickEditId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>更新进度</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {processes.find((p) => p.id === quickEditId)?.name}
            </p>
            <div className="space-y-1.5">
              <Label>当前进度: {quickProgress}%</Label>
              <Slider value={[quickProgress]} onValueChange={([v]) => setQuickProgress(v)} max={100} step={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickEditId(null)}>取消</Button>
            <Button onClick={handleQuickProgressSave} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- 流程删除确认 ---- */}
      <AlertDialog open={deleteProcId !== null} onOpenChange={(open) => { if (!open) setDeleteProcId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除端到端流程「{processes.find((p) => p.id === deleteProcId)?.name}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProc} disabled={deletingProc} className="bg-[#dc2626] hover:bg-[#dc2626]/90">
              {deletingProc ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- 计划编辑弹窗 ---- */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑梳理计划</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>端到端流程</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">
                  {processMap.get(planForm.processId)?.name || '未知流程'}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>计划类型</Label>
                <Select value={planForm.planType} onValueChange={(v: 'monthly' | 'quarterly') => setPlanForm({ ...planForm, planType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">月度</SelectItem>
                    <SelectItem value="quarterly">季度</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>年份</Label>
                <Input type="number" value={planForm.year} onChange={(e) => setPlanForm({ ...planForm, year: parseInt(e.target.value) || new Date().getFullYear() })} />
              </div>
              <div className="space-y-1.5">
                <Label>{planForm.planType === 'monthly' ? '月份' : '季度'}</Label>
                <Select value={String(planForm.period)} onValueChange={(v) => setPlanForm({ ...planForm, period: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {planForm.planType === 'monthly'
                      ? Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem key={m} value={String(m)}>{m}月</SelectItem>
                        ))
                      : Array.from({ length: 4 }, (_, i) => i + 1).map((q) => (
                          <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>计划内容 *</Label>
              <Textarea value={planForm.planContent} onChange={(e) => setPlanForm({ ...planForm, planContent: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>计划进度: {planForm.planProgress}%</Label>
                <Input type="number" min={0} max={100} value={planForm.planProgress} onChange={(e) => setPlanForm({ ...planForm, planProgress: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>实际进度（来自流程管理）</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm tabular-nums text-muted-foreground">
                  {planForm.processId ? `${processMap.get(planForm.processId)?.currentProgress ?? 0}%` : '请先选择流程'}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={planForm.status} onValueChange={(v: E2EPlan['status']) => setPlanForm({ ...planForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="可选备注" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>取消</Button>
            <Button onClick={handleSavePlan} disabled={savingPlan || !planForm.processId || !planForm.planContent.trim()} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {savingPlan ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- 计划删除确认 ---- */}
      <AlertDialog open={deletePlanId !== null} onOpenChange={(open) => { if (!open) setDeletePlanId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该梳理计划吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} disabled={deletingPlan} className="bg-[#dc2626] hover:bg-[#dc2626]/90">
              {deletingPlan ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
