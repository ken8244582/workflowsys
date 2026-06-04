'use client';

import { useEffect, useState, useCallback } from 'react';
import type { E2EProcess, E2EPlan } from '@/lib/e2e-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface PlanFormData {
  processId: string;
  planType: 'monthly' | 'quarterly';
  year: number;
  period: number;
  planContent: string;
  planProgress: number;
  actualProgress: number;
  status: E2EPlan['status'];
  notes: string;
}

export default function E2EPlanPage() {
  const [processes, setProcesses] = useState<E2EProcess[]>([]);
  const [plans, setPlans] = useState<E2EPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'monthly' | 'quarterly'>('monthly');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // 弹窗
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormData>({
    processId: '', planType: 'monthly', year: currentYear, period: 1,
    planContent: '', planProgress: 100, actualProgress: 0, status: 'planned', notes: '',
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

  const processMap = new Map(processes.map((p) => [p.id, p.name]));

  // 统计卡片
  const yearPlans = plans.filter((p) => p.year === currentYear);
  const totalPlans = yearPlans.length;
  const completedPlans = yearPlans.filter((p) => p.status === 'completed').length;
  const inProgressPlans = yearPlans.filter((p) => p.status === 'in_progress').length;
  const delayedPlans = yearPlans.filter((p) => p.status === 'delayed').length;

  // 添加计划（点击月份/季度卡片）
  const handleAddPlan = (period: number) => {
    setEditingPlanId(null);
    setForm({
      processId: processes[0]?.id || '',
      planType: viewType,
      year: currentYear,
      period,
      planContent: '',
      planProgress: 100,
      actualProgress: 0,
      status: 'planned',
      notes: '',
    });
    setShowDialog(true);
  };

  // 编辑计划
  const handleEditPlan = (plan: E2EPlan) => {
    setEditingPlanId(plan.id);
    setForm({
      processId: plan.processId,
      planType: plan.planType,
      year: plan.year,
      period: plan.period,
      planContent: plan.planContent,
      planProgress: plan.planProgress,
      actualProgress: plan.actualProgress ?? 0,
      status: plan.status,
      notes: plan.notes ?? '',
    });
    setShowDialog(true);
  };

  // 保存
  const handleSave = async () => {
    if (!form.processId || !form.planContent.trim()) return;
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
                (p) => p.planType === viewType && p.period === period
              );
              return (
                <Card key={period} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">{periodLabel(period)}</CardTitle>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleAddPlan(period)}>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </Button>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2 pb-3">
                    {periodPlans.length === 0 ? (
                      <p className="py-4 text-center text-[11px] text-muted-foreground/50">暂无计划</p>
                    ) : (
                      periodPlans.map((plan) => {
                        const dot = STATUS_DOT[plan.status] || STATUS_DOT.planned;
                        return (
                          <div
                            key={plan.id}
                            className="group cursor-pointer rounded-md border bg-background p-2 transition-colors hover:border-[#1e3a5f]/30 hover:bg-muted/30"
                            onClick={() => handleEditPlan(plan)}
                          >
                            <div className="flex items-start justify-between">
                              <p className="truncate text-xs font-medium">{processMap.get(plan.processId) || '未知流程'}</p>
                              <span className={`ml-1 shrink-0 text-[10px] ${dot.color}`}>{dot.symbol}</span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{plan.planContent}</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="h-1.5 flex-1 rounded-full bg-muted">
                                <div
                                  className="h-1.5 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(plan.actualProgress ?? 0, 100)}%`,
                                    backgroundColor: plan.status === 'completed' ? '#10b981' : plan.status === 'delayed' ? '#dc2626' : '#1e3a5f',
                                  }}
                                />
                              </div>
                              <span className="text-[10px] tabular-nums text-muted-foreground">{plan.actualProgress ?? 0}%</span>
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
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="px-3 py-2 font-medium text-muted-foreground">期间</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">端到端流程</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">计划内容</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">目标进度</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">实际进度</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">状态</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {yearPlans.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">暂无计划数据</td></tr>
                ) : (
                  yearPlans
                    .sort((a, b) => a.period - b.period)
                    .map((plan) => {
                      const dot = STATUS_DOT[plan.status] || STATUS_DOT.planned;
                      return (
                        <tr key={plan.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {plan.planType === 'monthly' ? `${plan.period}月` : `Q${plan.period}`}
                          </td>
                          <td className="px-3 py-2 font-medium">{processMap.get(plan.processId) || '未知'}</td>
                          <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">{plan.planContent}</td>
                          <td className="px-3 py-2 tabular-nums">{plan.planProgress}%</td>
                          <td className="px-3 py-2 tabular-nums">{plan.actualProgress ?? 0}%</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 ${dot.color}`}>
                              <span>{dot.symbol}</span>
                              {PLAN_STATUS_OPTIONS.find((s) => s.value === plan.status)?.label || plan.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => handleEditPlan(plan)}>编辑</Button>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-[#dc2626]" onClick={() => setDeleteId(plan.id)}>删除</Button>
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
                <Select value={form.processId} onValueChange={(v) => setForm({ ...form, processId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择流程" /></SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>计划类型</Label>
                <Select value={form.planType} onValueChange={(v: 'monthly' | 'quarterly') => setForm({ ...form, planType: v })}>
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
                <Label>{form.planType === 'monthly' ? '月份' : '季度'}</Label>
                <Select value={String(form.period)} onValueChange={(v) => setForm({ ...form, period: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {form.planType === 'monthly'
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
              <Textarea value={form.planContent} onChange={(e) => setForm({ ...form, planContent: e.target.value })} placeholder="如：完成流程梳理和发布" rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>目标进度: {form.planProgress}%</Label>
                <Input type="number" min={0} max={100} value={form.planProgress} onChange={(e) => setForm({ ...form, planProgress: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>实际进度: {form.actualProgress}%</Label>
                <Input type="number" min={0} max={100} value={form.actualProgress} onChange={(e) => setForm({ ...form, actualProgress: parseInt(e.target.value) || 0 })} />
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
            <Button onClick={handleSave} disabled={saving || !form.processId || !form.planContent.trim()} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
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
