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
import { Calendar, ClipboardList, CheckCircle2, Clock, Plus, ArrowRight, ChevronRight, BarChart3, Target, TrendingUp } from 'lucide-react';
import type { RevisionPlan, DepartmentProgress } from '@/lib/flow-data';

interface PlanWithProgress extends RevisionPlan {
  departmentProgress?: DepartmentProgress[];
}

export default function RevisionPlanPage() {
  const [plans, setPlans] = useState<PlanWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlanMonth, setNewPlanMonth] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/revision-plans');
      const data = await res.json();
      const planItems: PlanWithProgress[] = data.items || [];

      // Fetch department progress for the latest published plan
      const publishedPlan = planItems.find(p => p.status === '已下发');
      if (publishedPlan) {
        const detailRes = await fetch(`/api/revision-plans/${publishedPlan.id}`);
        const detail = await detailRes.json();
        publishedPlan.departmentProgress = detail.departmentProgress || [];
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
      await fetch('/api/revision-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planMonth: newPlanMonth, planName: name }),
      });
      setShowCreateDialog(false);
      setNewPlanMonth('');
      setNewPlanName('');
      fetchData();
    } catch (err) {
      console.error('Failed to create plan:', err);
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

  return (
    <div className="space-y-6">
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

      {/* Department Progress */}
      {currentPlan && currentPlan.departmentProgress && currentPlan.departmentProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#1e3a5f]" />
              部门完成情况
              <span className="text-xs text-muted-foreground font-normal ml-2">
                {currentPlan.planMonth} 已下发计划
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentPlan.departmentProgress.map((dept) => (
              <div key={dept.department} className="flex items-center gap-3 group">
                <div className="w-44 shrink-0 text-sm font-medium truncate">{dept.department}</div>
                <div className="flex-1 relative h-7 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6] rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${dept.completionRate}%` }}
                  >
                    {dept.completionRate >= 15 && (
                      <span className="text-[11px] font-semibold text-white">{dept.completed}/{dept.total}</span>
                    )}
                  </div>
                  {dept.completionRate < 15 && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
                      {dept.completed}/{dept.total}
                    </span>
                  )}
                </div>
                <div className="w-14 text-sm font-semibold text-right tabular-nums">
                  <span className={dept.completionRate >= 80 ? 'text-emerald-600' : dept.completionRate >= 50 ? 'text-amber-600' : 'text-red-500'}>
                    {dept.completionRate}%
                  </span>
                </div>
                <Link
                  href={`/functional/plan/${currentPlan.id}?department=${encodeURIComponent(dept.department)}`}
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
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            <Plus className="h-4 w-4" /> 创建月度计划
          </Button>
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
            <div className="space-y-2">
              {plans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/functional/plan/${plan.id}`}
                  className="block border rounded-lg p-4 hover:shadow-md hover:border-[#1e3a5f]/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-[#1e3a5f]">{plan.planName}</div>
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusColor(plan.status)}`}>{plan.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>任务 <strong className="text-foreground">{plan.taskCount}</strong></span>
                      <span>已完成 <strong className="text-emerald-600">{plan.completedCount}</strong></span>
                      {plan.taskCount > 0 && (
                        <span>完成率 <strong className={plan.completedCount / plan.taskCount >= 0.8 ? 'text-emerald-600' : 'text-amber-600'}>
                          {Math.round(plan.completedCount / plan.taskCount * 100)}%
                        </strong></span>
                      )}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#1e3a5f]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
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
    </div>
  );
}
