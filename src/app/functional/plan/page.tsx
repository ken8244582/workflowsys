'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, Clock, CheckCircle2, Plus, Trash2, Pencil, TrendingUp, Send, RotateCcw, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { RevisionPlan, OwnerProgress } from '@/lib/flow-data';
import { PaginationBar } from '@/components/pagination-bar';
import { usePermission } from '@/lib/use-permission';

interface PlanWithProgress extends RevisionPlan {
  ownerProgress?: OwnerProgress[];
}

export default function RevisionPlanPage() {
  const { canAdd, canDelete, canEdit } = usePermission('/functional/plan');
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
  const [sortField, setSortField] = useState<'planMonth' | 'createdAt' | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Sort toggle
  const toggleSort = (field: 'planMonth' | 'createdAt') => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(''); setSortDir('desc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: 'planMonth' | 'createdAt' }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400 cursor-pointer" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-[#1e3a5f] cursor-pointer" />
      : <ArrowDown className="h-3 w-3 ml-1 text-[#1e3a5f] cursor-pointer" />;
  };

  // Apply sorting
  const sortedPlans = [...plans].sort((a, b) => {
    if (!sortField) return 0;
    const va = (sortField === 'planMonth' ? a.planMonth : a.createdAt) || '';
    const vb = (sortField === 'planMonth' ? b.planMonth : b.createdAt) || '';
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

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

  const totalPages = Math.max(1, Math.ceil(sortedPlans.length / planPageSize));

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
          <h2 className="text-xl font-semibold text-[#1e3a5f]">修订计划</h2>
        </div>
        <div className="flex items-center gap-2">
          {canAdd() && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#2d4f7a]">
              <Plus className="h-3.5 w-3.5 mr-1" /> 新增计划
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">本月任务总数</p>
              <p className="text-2xl font-extrabold text-[#1e3a5f]">{currentStats.total}</p>
            </div>
            <ClipboardList className="h-8 w-8 text-[#1e3a5f]/15" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e3a5f]/30" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">待完成</p>
              <p className="text-2xl font-extrabold text-amber-600">{currentStats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-200" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400/40" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">已完成</p>
              <p className="text-2xl font-extrabold text-emerald-600">{currentStats.completed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-200" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400/40" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">完成率</p>
              <p className="text-2xl font-extrabold text-[#1e3a5f]">{currentStats.completionRate}<span className="text-sm">%</span></p>
            </div>
            <TrendingUp className="h-8 w-8 text-[#1e3a5f]/15" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e3a5f]/30" />
          </CardContent>
        </Card>
      </div>

      {/* 顶部分页 */}
      {sortedPlans.length > 0 && (
        <PaginationBar
          page={planPage}
          totalPages={Math.ceil(sortedPlans.length / planPageSize)}
          total={sortedPlans.length}
          pageSize={planPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={setPlanPage}
          onPageSizeChange={(s) => { setPlanPageSize(s); setPlanPage(1); }}
        />
      )}

      {/* Plan Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap w-10 text-center">序号</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap min-w-[180px]">计划名称</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap min-w-[100px] cursor-pointer select-none" onClick={() => toggleSort('planMonth')}>
                    <span className="inline-flex items-center">计划月份<SortIcon field="planMonth" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap min-w-[70px]">状态</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap min-w-[70px] text-center">任务总数</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap min-w-[70px] text-center">已完成</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap min-w-[70px] text-center">完成率</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap min-w-[120px] cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                    <span className="inline-flex items-center">创建时间<SortIcon field="createdAt" /></span>
                  </TableHead>
                  {(canEdit() || canDelete()) && <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap w-20 text-center sticky right-0 bg-gray-50 z-10">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canEdit() || canDelete() ? 9 : 8} className="text-center py-12 text-gray-400">加载中...</TableCell>
                  </TableRow>
                ) : sortedPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit() || canDelete() ? 9 : 8} className="text-center py-12 text-gray-400">暂无修订计划</TableCell>
                  </TableRow>
                ) : (
                  sortedPlans.slice((planPage - 1) * planPageSize, planPage * planPageSize).map((plan, idx) => {
                    const rate = plan.taskCount > 0 ? Math.round(plan.completedCount / plan.taskCount * 100) : 0;
                    return (
                      <TableRow key={plan.id} className="hover:bg-blue-50/50">
                        <TableCell className="text-gray-400 text-center">{(planPage - 1) * planPageSize + idx + 1}</TableCell>
                        <TableCell>
                          <Link href={`/functional/plan/${plan.id}`} className="text-[#1e3a5f] hover:underline font-medium">
                            {plan.planName}
                          </Link>
                        </TableCell>
                        <TableCell>{plan.planMonth}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] px-1.5 py-0 ${statusColor(plan.status)}`}>{plan.status}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{plan.taskCount}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-medium">{plan.completedCount}</TableCell>
                        <TableCell className="text-center">
                          <span className={rate >= 80 ? 'text-emerald-600 font-medium' : rate >= 50 ? 'text-amber-600 font-medium' : 'text-red-500 font-medium'}>
                            {rate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{plan.createdAt || '--'}</TableCell>
                        {(canEdit() || canDelete()) && (
                          <TableCell className="sticky right-0 bg-white z-10">
                            <div className="flex items-center justify-center gap-0.5">
                              <Link href={`/functional/plan/${plan.id}`}>
                                <Button variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-[#1e3a5f] hover:bg-muted">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              {plan.status === '草稿' && canDelete() && (
                                <Button
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
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
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 底部分页 */}
      {sortedPlans.length > 0 && (
        <PaginationBar
          page={planPage}
          totalPages={Math.ceil(sortedPlans.length / planPageSize)}
          total={sortedPlans.length}
          pageSize={planPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={setPlanPage}
          onPageSizeChange={(s) => { setPlanPageSize(s); setPlanPage(1); }}
        />
      )}

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
                placeholder="不填则自动生成"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="h-7 text-xs">取消</Button>
            <Button onClick={handleCreatePlan} disabled={!newPlanMonth || creating} className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#2d4f7a]">
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletePlanId} onOpenChange={() => { setDeletePlanId(null); setDeletePlanName(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除修订计划「{deletePlanName}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletePlanId(null); setDeletePlanName(''); }} className="h-7 text-xs">取消</Button>
            <Button variant="destructive" onClick={handleDeletePlan} disabled={deleting} className="h-7 text-xs">
              {deleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
