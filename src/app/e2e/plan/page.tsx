'use client';

import { useEffect, useState, useCallback } from 'react';
import type { E2EProcess, E2EPlan } from '@/lib/e2e-store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const STORAGE_KEY_COMPARE_MONTH = 'e2e-plan-compare-month';
const STORAGE_KEY_COMPARE_QUARTER = 'e2e-plan-compare-quarter';

interface PlanFormData {
  process_id: string;
  plan_type: 'monthly' | 'quarterly';
  year: number;
  period: number;
  plan_content: string;
  plan_progress: number;
  status: E2EPlan['status'];
  notes: string;
}

export default function E2EPlanPage() {
  const [processes, setProcesses] = useState<E2EProcess[]>([]);
  const [plans, setPlans] = useState<E2EPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'monthly' | 'quarterly'>('monthly');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // 对比月份选择（localStorage 持久化）
  const [compareMonth, setCompareMonth] = useState<number>(() => {
    if (typeof window === 'undefined') return new Date().getMonth() + 1;
    const saved = localStorage.getItem(STORAGE_KEY_COMPARE_MONTH);
    return saved ? parseInt(saved) : new Date().getMonth() + 1;
  });
  const [compareQuarter, setCompareQuarter] = useState<number>(() => {
    if (typeof window === 'undefined') return Math.ceil((new Date().getMonth() + 1) / 3);
    const saved = localStorage.getItem(STORAGE_KEY_COMPARE_QUARTER);
    return saved ? parseInt(saved) : Math.ceil((new Date().getMonth() + 1) / 3);
  });

  // 弹窗
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormData>({
    process_id: '', plan_type: 'monthly', year: currentYear, period: 1,
    plan_content: '', plan_progress: 100, status: 'planned', notes: '',
  });
  const [saving, setSaving] = useState(false);

  // 删除
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const processMap = new Map(processes.map((p) => [p.id, p]));

  // 获取流程的实际进度（从流程管理数据读取）
  const getActualProgress = (process_id: string): number => {
    const proc = processMap.get(process_id);
    return proc?.current_progress ?? 0;
  };

  // 保存对比月份到 localStorage
  const handleCompareMonthChange = (month: number) => {
    setCompareMonth(month);
    localStorage.setItem(STORAGE_KEY_COMPARE_MONTH, String(month));
  };

  const handleCompareQuarterChange = (quarter: number) => {
    setCompareQuarter(quarter);
    localStorage.setItem(STORAGE_KEY_COMPARE_QUARTER, String(quarter));
  };

  // 统计卡片
  const yearPlans = plans.filter((p) => p.year === currentYear);
  const totalPlans = yearPlans.length;
  const completedPlans = yearPlans.filter((p) => p.status === 'completed').length;
  const inProgressPlans = yearPlans.filter((p) => p.status === 'in_progress').length;
  const delayedPlans = yearPlans.filter((p) => p.status === 'delayed').length;

  // 对比数据：选中月份/季度的计划与实际对比
  const comparePeriod = viewType === 'monthly' ? compareMonth : compareQuarter;
  const comparePlans = yearPlans.filter(
    (p) => p.plan_type === viewType && p.period === comparePeriod
  );
  const compareChartData = comparePlans.map((plan) => {
    const proc = processMap.get(plan.process_id);
    return {
      name: proc?.name || '未知',
      '计划进度': plan.plan_progress,
      '实际进度': getActualProgress(plan.process_id),
    };
  });

  // 添加计划（点击月份/季度卡片）
  const handleAddPlan = (period: number) => {
    setEditingPlanId(null);
    setForm({
      process_id: processes[0]?.id || '',
      plan_type: viewType,
      year: currentYear,
      period,
      plan_content: '',
      plan_progress: 100,
      status: 'planned',
      notes: '',
    });
    setShowDialog(true);
  };

  // 编辑计划
  const handleEditPlan = (plan: E2EPlan) => {
    setEditingPlanId(plan.id);
    setForm({
      process_id: plan.process_id,
      plan_type: plan.plan_type as 'monthly' | 'quarterly',
      year: plan.year,
      period: plan.period,
      plan_content: plan.plan_content,
      plan_progress: plan.plan_progress,
      status: plan.status,
      notes: plan.notes ?? '',
    });
    setShowDialog(true);
  };

  // 保存
  const handleSave = async () => {
    if (!form.process_id || !form.plan_content.trim()) return;
    setSaving(true);
    try {
      if (editingPlanId) {
        await fetch(`/api/e2e/plans/${editingPlanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/e2e/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowDialog(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to save plan:', error);
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/e2e/plans/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    } finally {
      setDeleting(false);
    }
  };

  // 生成月度/季度周期列表
  const periods = viewType === 'monthly'
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : Array.from({ length: 4 }, (_, i) => i + 1);

  const periodLabel = viewType === 'monthly'
    ? (p: number) => `${p}月`
    : (p: number) => `Q${p}`;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">加载计划数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题 + 年份选择 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
          <h2 className="text-xl font-semibold text-[#1e3a5f]">梳理计划管理</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentYear(currentYear - 1)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Button>
          <span className="min-w-[60px] text-center text-sm font-semibold tabular-nums">{currentYear}年</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentYear(currentYear + 1)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">年度计划数</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#1e3a5f]">{totalPlans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">已完成</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#10b981]">{completedPlans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">进行中</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#3b82f6]">{inProgressPlans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">延期</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#dc2626]">{delayedPlans}</p>
          </CardContent>
        </Card>
      </div>

      {/* 对比计划进度图表 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">计划进度对比</CardTitle>
              <CardDescription>对比选中时段的计划进度与实际完成进度</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">对比时段：</span>
              {viewType === 'monthly' ? (
                <Select value={String(compareMonth)} onValueChange={(v) => handleCompareMonthChange(parseInt(v))}>
                  <SelectTrigger className="h-7 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>{m}月</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={String(compareQuarter)} onValueChange={(v) => handleCompareQuarterChange(parseInt(v))}>
                  <SelectTrigger className="h-7 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 4 }, (_, i) => i + 1).map((q) => (
                      <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {compareChartData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              {periodLabel(comparePeriod)}暂无梳理计划，请在下方时间轴中添加
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, compareChartData.length * 45 + 40)}>
              <BarChart data={compareChartData} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
                <Bar dataKey="计划进度" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={14} />
                <Bar dataKey="实际进度" fill="#1e3a5f" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 月度/季度 Tab 切换 */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as 'monthly' | 'quarterly')}>
        <TabsList>
          <TabsTrigger value="monthly">月度视图</TabsTrigger>
          <TabsTrigger value="quarterly">季度视图</TabsTrigger>
        </TabsList>
        <TabsContent value={viewType} className="mt-4">
          <div className={`grid gap-3 ${viewType === 'monthly' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {periods.map((period) => {
              const periodPlans = yearPlans.filter(
                (p) => p.plan_type === viewType && p.period === period
              );
              const isSelectedForCompare = period === comparePeriod;
              return (
                <Card key={period} className={`flex flex-col ${isSelectedForCompare ? 'border-[#1e3a5f]/40 bg-[#1e3a5f]/5' : ''}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm">{periodLabel(period)}</CardTitle>
                      {isSelectedForCompare && (
                        <span className="rounded bg-[#1e3a5f] px-1 py-0.5 text-[9px] font-medium text-white">对比中</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleAddPlan(period)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2 pb-3">
                    {periodPlans.length === 0 ? (
                      <p className="py-4 text-center text-[11px] text-muted-foreground/50">暂无计划</p>
                    ) : (
                      periodPlans.map((plan) => {
                        const dot = STATUS_DOT[plan.status] || STATUS_DOT.planned;
                        const actualProg = getActualProgress(plan.process_id);
                        const proc = processMap.get(plan.process_id);
                        const isOverPlan = actualProg >= plan.plan_progress;
                        return (
                          <div
                            key={plan.id}
                            className="group cursor-pointer rounded-md border bg-background p-2 transition-colors hover:border-[#1e3a5f]/30 hover:bg-muted/30"
                            onClick={() => handleEditPlan(plan)}
                          >
                            <div className="flex items-start justify-between">
                              <p className="truncate text-xs font-medium">{proc?.name || '未知流程'}</p>
                              <div className="flex items-center gap-1">
                                <span className={`shrink-0 text-[10px] ${dot.color}`}>{dot.symbol}</span>
                                <button
                                  className="shrink-0 rounded p-0.5 text-[#dc2626] opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(plan.id); }}
                                  title="删除"
                                >
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{plan.plan_content}</p>
                            <div className="mt-1.5 space-y-1">
                              {/* 计划进度条（橙色） */}
                              <div className="flex items-center gap-1.5">
                                <span className="w-8 shrink-0 text-[9px] text-muted-foreground">计划</span>
                                <div className="relative h-2 flex-1 rounded-full bg-[#f59e0b]/20">
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-full bg-[#f59e0b] transition-all"
                                    style={{ width: `${Math.min(plan.plan_progress, 100)}%` }}
                                  />
                                </div>
                                <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-[#f59e0b]">{plan.plan_progress}%</span>
                              </div>
                              {/* 实际进度条（靛蓝/绿色） */}
                              <div className="flex items-center gap-1.5">
                                <span className="w-8 shrink-0 text-[9px] text-muted-foreground">实际</span>
                                <div className="relative h-2 flex-1 rounded-full bg-muted">
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(actualProg, 100)}%`,
                                      backgroundColor: isOverPlan ? '#10b981' : '#1e3a5f',
                                    }}
                                  />
                                </div>
                                <span className={`w-7 shrink-0 text-right text-[10px] tabular-nums ${isOverPlan ? 'text-[#10b981]' : 'text-[#1e3a5f]'}`}>{actualProg}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* 计划明细表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">计划明细</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="w-[60px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">期间</th>
                  <th className="w-[160px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">端到端流程</th>
                  <th className="w-[140px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">计划内容</th>
                  <th className="min-w-[160px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">计划进度</th>
                  <th className="min-w-[160px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">实际进度</th>
                  <th className="w-[80px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">状态</th>
                  <th className="w-[60px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {yearPlans.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">暂无计划数据</td></tr>
                ) : (
                  yearPlans
                    .sort((a, b) => a.period - b.period)
                    .map((plan) => {
                      const dot = STATUS_DOT[plan.status] || STATUS_DOT.planned;
                      const actualProg = getActualProgress(plan.process_id);
                      const isOverPlan = actualProg >= plan.plan_progress;
                      return (
                        <tr key={plan.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">
                            {plan.plan_type === 'monthly' ? `${plan.period}月` : `Q${plan.period}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs font-medium">{processMap.get(plan.process_id)?.name || '未知'}</td>
                          <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">{plan.plan_content}</td>
                          <td className="px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="relative h-2.5 w-full rounded-full bg-[#f59e0b]/20">
                                <div
                                  className="absolute inset-y-0 left-0 rounded-full bg-[#f59e0b]"
                                  style={{ width: `${Math.min(plan.plan_progress, 100)}%` }}
                                />
                              </div>
                              <span className="shrink-0 tabular-nums text-[#f59e0b]">{plan.plan_progress}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="relative h-2.5 w-full rounded-full bg-muted">
                                <div
                                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(actualProg, 100)}%`,
                                    backgroundColor: isOverPlan ? '#10b981' : '#1e3a5f',
                                  }}
                                />
                              </div>
                              <span className={`shrink-0 tabular-nums ${isOverPlan ? 'text-[#10b981]' : 'text-[#1e3a5f]'}`}>{actualProg}%</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs">
                            <span className={`inline-flex items-center gap-1 ${dot.color}`}>
                              <span>{dot.symbol}</span>
                              {PLAN_STATUS_OPTIONS.find((s) => s.value === plan.status)?.label || plan.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <button className="text-muted-foreground hover:text-[#1e3a5f] transition-colors" title="编辑" onClick={() => handleEditPlan(plan)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                              </button>
                              <button className="text-muted-foreground hover:text-[#dc2626] transition-colors" title="删除" onClick={() => setDeleteId(plan.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlanId ? '编辑梳理计划' : '新增梳理计划'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>端到端流程 *</Label>
                <Select value={form.process_id} onValueChange={(v) => setForm({ ...form, process_id: v })} disabled={!!editingPlanId}>
                  <SelectTrigger><SelectValue placeholder="选择流程" /></SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>计划类型</Label>
                <Select value={form.plan_type} onValueChange={(v: 'monthly' | 'quarterly') => setForm({ ...form, plan_type: v })}>
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
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || currentYear })} />
              </div>
              <div className="space-y-1.5">
                <Label>{form.plan_type === 'monthly' ? '月份' : '季度'}</Label>
                <Select value={String(form.period)} onValueChange={(v) => setForm({ ...form, period: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {form.plan_type === 'monthly'
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
              <Textarea value={form.plan_content} onChange={(e) => setForm({ ...form, plan_content: e.target.value })} placeholder="如：完成流程梳理和发布" rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>计划进度: {form.plan_progress}%</Label>
                <Input type="number" min={0} max={100} value={form.plan_progress} onChange={(e) => setForm({ ...form, plan_progress: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>实际进度（来自流程管理）</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm tabular-nums text-muted-foreground">
                  {form.process_id ? `${getActualProgress(form.process_id)}%` : '请先选择流程'}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(v: E2EPlan['status']) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="可选备注" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !form.process_id || !form.plan_content.trim()} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该梳理计划吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-[#dc2626] hover:bg-[#dc2626]/90">
              {deleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
