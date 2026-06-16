'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, ClipboardList, CheckCircle2, Clock, Plus, ArrowRight, ChevronRight, BarChart3, Target, TrendingUp, Trash2 } from 'lucide-react';
import type { RevisionPlan, OwnerProgress } from '@/lib/flow-data';
import { PaginationBar } from '@/components/pagination-bar';
import { usePermission } from '@/lib/use-permission';

interface PlanWithProgress extends RevisionPlan {
  ownerProgress?: OwnerProgress[];
}

export default function RevisionPlanPage() {
  const { canAdd, canDelete } = usePermission('/functional/plan');
  const [plans, setPlans] = useState<PlanWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlanMonth, setNewPlanMonth] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<number | null>(null);
  const [deletePlanName, setDeletePlanName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/revision-plans');
      const data = await res.json();
      const planItems: PlanWithProgress[] = data.items || [];

      // Fetch owner progress for the latest published plan
      const publishedPlan = planItems.find(p => p.status === '已下发');
      if (publishedPlan) {
        const detailRes = await fetch(`/api/revision-plans/${publishedPlan.id}`);
        const detail = await detailRes.json();
        publishedPlan.ownerProgress = detail.ownerProgress || [];
      }

      setPlans(planItems);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats for current month plan
  const currentPlan = plans.find(p => p.status === '已下发');
  const currentStats = {
    total: currentPlan?.taskCount || 0,
    completed: currentPlan?.completedCount || 0,
    pending: (currentPlan?.taskCount || 0) - (currentPlan?.completedCount || 0),
    completionRate: currentPlan && currentPlan.taskCount > 0
      ? Math.round((currentPlan.completedCount / currentPlan.taskCount) * 1000) / 10
      : 0,
  };

  const handleCreatePlan = async () => {
    if (!newPlanMonth) return;
    setCreating(true);
    try {
      const name = newPlanName || `${newPlanMonth.replace('-', '年')}月流程修订计划`;
      const res = await fetch('/api/revision-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planMonth: newPlanMonth, planName: name }),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setNewPlanMonth('');
        setNewPlanName('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '创建失败');
      }
    } catch (err) {
      console.error('Failed to create plan:', err);
      alert('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case '草稿': return 'bg-gray-100 text-gray-700';
      case '已下发': return 'bg-blue-100 text-blue-700';
      case '已归档': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    setDeleting(true);
    try {
      await fetch(`/api/revision-plans/${deletePlanId}`, { method: 'DELETE' });
      setDeletePlanId(null);
      setDeletePlanName('');
      fetchData();
    } catch (err) {
      console.error('Failed to delete plan:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
        <h2 className="text-xl font-semibold text-[#1e3a5f]">修订计划</h2>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">本月任务总数</p>
              <p className="text-3xl font-extrabold text-[#1e3a5f] mt-1">{currentStats.total}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-[#1e3a5f]" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6]" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">待完成</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">{currentStats.pending}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">已完成</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{currentStats.completed}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">完成率</p>
              <p className="text-3xl font-extrabold text-[#1e3a5f] mt-1">{currentStats.completionRate}<span className="text-lg">%</span></p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-[#1e3a5f]" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6]" />
          </CardContent>
        </Card>
      </div>

      {/* Owner Progress */}
      {currentPlan && currentPlan.ownerProgress && currentPlan.ownerProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#1e3a5f]" />
              L4所有者完成情况
              <span className="text-xs text-muted-foreground font-normal ml-2">
                {currentPlan.planMonth} 已下发计划
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentPlan.ownerProgress.map((ow) => (
              <div key={ow.owner} className="flex items-center gap-3 group">
                <div className="w-44 shrink-0 text-sm font-medium truncate">{ow.owner}</div>
                <div className="flex-1 relative h-7 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6] rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${ow.completionRate}%` }}
                  >
                    {ow.completionRate >= 15 && (
                      <span className="text-[11px] font-semibold text-white">{ow.completed}/{ow.total}</span>
                    )}
                  </div>
                  {ow.completionRate < 15 && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
                      {ow.completed}/{ow.total}
                    </span>
                  )}
                </div>
                <div className="w-14 text-sm font-semibold text-right tabular-nums">
                  <span className={ow.completionRate >= 80 ? 'text-emerald-600' : ow.completionRate >= 50 ? 'text-amber-600' : 'text-red-500'}>
                    {ow.completionRate}%
                  </span>
                </div>
                <Link
                  href={`/functional/plan/${currentPlan.id}?owner=${encodeURIComponent(ow.owner)}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[#1e3a5f]">
                    详情 <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Plan List */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#1e3a5f]" />
            修订计划列表
          </CardTitle>
          {canAdd() && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              <Plus className="h-3.5 w-3.5 mr-1" /> 新增计划
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
              暂无修订计划，点击右上角创建
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {plans.slice((planPage - 1) * planPageSize, planPage * planPageSize).map((plan) => (
                <div
                  key={plan.id}
                  className="border rounded-lg p-4 hover:shadow-md hover:border-[#1e3a5f]/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <Link href={`/functional/plan/${plan.id}`} className="flex items-center gap-3 flex-1">
                      <div className="text-sm font-semibold text-[#1e3a5f]">{plan.planName}</div>
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusColor(plan.status)}`}>{plan.status}</Badge>
                    </Link>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>任务 <strong className="text-foreground">{plan.taskCount}</strong></span>
                      <span>已完成 <strong className="text-emerald-600">{plan.completedCount}</strong></span>
                      {plan.taskCount > 0 && (
                        <span>完成率 <strong className={plan.completedCount / plan.taskCount >= 0.8 ? 'text-emerald-600' : 'text-amber-600'}>
                          {Math.round(plan.completedCount / plan.taskCount * 100)}%
                        </strong></span>
                      )}
                      {plan.status === '草稿' && canDelete() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeletePlanId(plan.id);
                            setDeletePlanName(plan.planName);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Link href={`/functional/plan/${plan.id}`}>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#1e3a5f]" />
                      </Link>
                    </div>
                  </div>
                </div>
                ))}
              </div>
              {plans.length > 0 && (
                <PaginationBar
                  page={planPage}
                  totalPages={Math.max(1, Math.ceil(plans.length / planPageSize))}
                  total={plans.length}
                  pageSize={planPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onPageChange={setPlanPage}
                  onPageSizeChange={(s) => { setPlanPageSize(s); setPlanPage(1); }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Plan Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建月度修订计划</DialogTitle>
            <DialogDescription>选择月份创建新的流程修订工作计划</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">计划月份 *</label>
              <Input
                type="month"
                value={newPlanMonth}
                onChange={(e) => {
                  setNewPlanMonth(e.target.value);
                  if (e.target.value && !newPlanName) {
                    setNewPlanName(`${e.target.value.replace('-', '年')}月流程修订计划`);
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">计划名称</label>
              <Input
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="默认根据月份自动生成"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreatePlan} disabled={!newPlanMonth || creating} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation Dialog */}
      <Dialog open={deletePlanId !== null} onOpenChange={(open) => { if (!open) { setDeletePlanId(null); setDeletePlanName(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">确认删除计划</DialogTitle>
            <DialogDescription>此操作不可撤销，删除后计划及所有任务将永久移除</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              确定要删除计划 <strong className="text-foreground">「{deletePlanName}」</strong> 吗？
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletePlanId(null); setDeletePlanName(''); }}>取消</Button>
            <Button variant="destructive" onClick={handleDeletePlan} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
