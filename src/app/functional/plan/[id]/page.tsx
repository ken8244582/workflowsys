'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Plus, Send, CheckCircle2, RotateCcw, Trash2, Search,
  ClipboardList, Clock, CheckCircle, TrendingUp, Download, AlertTriangle,
} from 'lucide-react';
import { PaginationBar } from '@/components/pagination-bar';
import { TruncateDiv } from '@/components/truncate-cell';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { RevisionPlan, PlanTask, OwnerProgress } from '@/lib/flow-data';
import { MultiSelectFilter } from '@/components/multi-select-filter';
import { usePermission } from '@/lib/use-permission';

interface DeptProgress {
  department: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}

interface PlanDetail extends RevisionPlan {
  ownerProgress: OwnerProgress[];
  departmentProgress: DeptProgress[];
}

interface FlowItem {
  id: number;
  processCode: string;
  l4Process: string;
  l1Domain: string;
  l2Group: string;
  l3Segment: string;
  l4Owner: string;
  version: string;
  department: string;
  format: string;
  category: string;
}

export default function PlanDetailPage() {
  const { canAdd, canEdit, canDelete, canPublish, canInit } = usePermission('/functional/plan');
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [taskTypeOptions, setTaskTypeOptions] = useState<string[]>([]); // 任务类型下拉选项（动态从数据库获取）
  const [taskStatusOptions, setTaskStatusOptions] = useState<string[]>([]); // 任务状态下拉选项（动态从数据库获取）

  // Filters
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  const [operating, setOperating] = useState(false);

  // Data reinitialize state
  const [showReinitDialog, setShowReinitDialog] = useState(false);
  const [reinitConfirmText, setReinitConfirmText] = useState('');
  const [reinitLoading, setReinitLoading] = useState(false);
  const [reinitFile, setReinitFile] = useState<File | null>(null);
  const [deleteTaskName, setDeleteTaskName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Add task dialog state
  const [flowItems, setFlowItems] = useState<FlowItem[]>([]);
  const [selectedFlowIds, setSelectedFlowIds] = useState<Set<number>>(new Set());
  const [flowSearch, setFlowSearch] = useState('');
  const [newTaskType, setNewTaskType] = useState('修订流程');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/revision-plans/${planId}`);
      const data = await res.json();
      if (data.error) { router.push('/functional/plan'); return; }
      setPlan(data);
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    }
  }, [planId, router]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      // Send all filter values as comma-separated strings
      if (filterType.length > 0) params.set('taskType', filterType.join(','));
      if (filterStatus.length > 0) params.set('status', filterStatus.join(','));
      if (searchText) params.set('search', searchText);

      const res = await fetch(`/api/revision-plans/${planId}/tasks?${params}`);
      const data = await res.json();
      setTasks(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [planId, page, pageSize, filterType, filterStatus, searchText]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Fetch filter options (task types and statuses) dynamically from database
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/revision-plans/${planId}/filter-options`);
      const data = await res.json();
      setTaskTypeOptions(data.taskTypes || []);
      setTaskStatusOptions(data.statuses || []);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  }, [planId]);

  useEffect(() => { fetchFilterOptions(); }, [fetchFilterOptions]);

  // Fetch flow items for add dialog
  const fetchFlowItems = async () => {
    try {
      const res = await fetch('/api/flows?pageSize=1000&hasL4=true');
      const data = await res.json();
      setFlowItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch flow items:', err);
    }
  };

  const handleOpenAddDialog = () => {
    setShowAddDialog(true);
    fetchFlowItems();
    setSelectedFlowIds(new Set());
    setFlowSearch('');
    setNewTaskType('修订流程');
    setNewTaskDesc('');
  };

  const handleAddTasks = async () => {
    setOperating(true);
    try {
      const tasksToAdd = [];
      for (const fid of selectedFlowIds) {
        const flow = flowItems.find(f => f.id === fid);
        if (flow) {
          tasksToAdd.push({
            flowItemId: flow.id,
            processCode: flow.processCode,
            processName: flow.l4Process,
            owner: flow.l4Owner,
            department: flow.department,
            taskType: newTaskType,
            description: newTaskDesc,
            version: flow.version || '',
            format: flow.format || '',
            category: flow.category || '',
          });
        }
      }
      if (tasksToAdd.length === 0) return;

      await fetch(`/api/revision-plans/${planId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasksToAdd }),
      });

      setShowAddDialog(false);
      setSelectedIds(new Set());
      fetchPlan();
      fetchTasks();
    } catch (err) {
      console.error('Failed to add tasks:', err);
    } finally {
      setOperating(false);
    }
  };

  const handlePublish = async () => {
    setOperating(true);
    try {
      await fetch(`/api/revision-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'publish' }),
      });
      setShowPublishDialog(false);
      fetchPlan();
    } catch (err) {
      console.error('Failed to publish plan:', err);
    } finally {
      setOperating(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/revision-plans/${planId}/export`);
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plan?.planName || '修订计划'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  const handleWithdraw = async () => {
    setOperating(true);
    try {
      const res = await fetch(`/api/revision-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'withdraw' }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        fetchPlan();
      }
    } catch (err) {
      console.error('Failed to withdraw plan:', err);
    } finally {
      setOperating(false);
    }
  };

  const handleCompleteTasks = async () => {
    if (selectedIds.size === 0) return;
    setOperating(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/plan-tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _action: 'complete' }),
          })
        )
      );
      setSelectedIds(new Set());
      fetchPlan();
      fetchTasks();
    } catch (err) {
      console.error('Failed to complete tasks:', err);
    } finally {
      setOperating(false);
    }
  };



  const handleDeleteTask = async (taskId: number) => {
    setOperating(true);
    try {
      await fetch(`/api/plan-tasks/${taskId}`, { method: 'DELETE' });
      setShowDeleteDialog(false);
      setDeleteTaskName('');
      fetchPlan();
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setOperating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setOperating(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/plan-tasks/${id}`, { method: 'DELETE' })
        )
      );
      setShowBatchDeleteDialog(false);
      setSelectedIds(new Set());
      fetchPlan();
      fetchTasks();
    } catch (err) {
      console.error('Failed to batch delete tasks:', err);
    } finally {
      setOperating(false);
    }
  };

  const handleReinitialize = async () => {
    if (reinitConfirmText !== '数据初始化') return;
    if (!reinitFile) { alert('请选择要导入的Excel文件'); return; }
    setReinitLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', reinitFile);
      const res = await fetch(`/api/revision-plans/${planId}/reinitialize`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || '初始化失败');
        return;
      }
      setShowReinitDialog(false);
      setReinitConfirmText('');
      setReinitFile(null);
      fetchPlan();
      fetchTasks();
      fetchFilterOptions();
    } catch {
      alert('数据初始化失败，请检查文件格式');
    } finally {
      setReinitLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  };

  // Dynamic filter options - all from database for real-time accuracy
  const typeOptions = taskTypeOptions;
  const statusOptions = taskStatusOptions;

  const statusBadge = (status: string) => {
    switch (status) {
      case '待执行': return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">{status}</Badge>;
      case '进行中': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{status}</Badge>;
      case '已完成': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{status}</Badge>;
      case '已顺延': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const taskTypeBadge = (type: string) => {
    switch (type) {
      case '新增流程': return <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">{type}</Badge>;
      case '内容修订': return <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">{type}</Badge>;
      case '格式修订': return <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">{type}</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (!plan) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">加载中...</div>;
  }

  const completionRate = plan.taskCount > 0 ? Math.round(plan.completedCount / plan.taskCount * 1000) / 10 : 0;
  const isDraft = plan.status === '草稿';
  const isPublished = plan.status === '已下发';

  // Filtered flow items for add dialog
  const filteredFlows = flowItems.filter(f => {
    if (!flowSearch) return true;
    const s = flowSearch.toLowerCase();
    return f.l4Process.toLowerCase().includes(s)
      || f.processCode.toLowerCase().includes(s)
      || f.l4Owner.toLowerCase().includes(s);
  });

  return (
    <TooltipProvider>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/functional/plan" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{plan.planName}</h1>
          <Badge className={`text-xs px-2 py-0.5 ${
            plan.status === '草稿' ? 'bg-gray-100 text-gray-700' :
            plan.status === '已下发' ? 'bg-blue-100 text-blue-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>{plan.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" /> 导出
          </Button>
          {isDraft && (
            <>
              {canInit() && (
                <Button variant="outline" size="sm" onClick={() => setShowReinitDialog(true)} className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50">
                  <RotateCcw className="h-4 w-4" /> 数据初始化
                </Button>
              )}
              {canAdd() && (
                <Button variant="outline" size="sm" onClick={handleOpenAddDialog} className="gap-1.5">
                  <Plus className="h-4 w-4" /> 添加任务
                </Button>
              )}
              {canPublish() && (
                <Button size="sm" onClick={() => setShowPublishDialog(true)} className="gap-1.5 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
                  <Send className="h-4 w-4" /> 下发计划
                </Button>
              )}
            </>
          )}
          {isPublished && (
            <>
              {canAdd() && (
                <Button variant="outline" size="sm" onClick={handleOpenAddDialog} className="gap-1.5">
                  <Plus className="h-4 w-4" /> 添加任务
                </Button>
              )}
              {canPublish() && (
                <Button variant="outline" size="sm" onClick={handleWithdraw} className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50">
                  <RotateCcw className="h-4 w-4" /> 撤回草稿
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">任务总数</p>
              <p className="text-2xl font-extrabold text-[#1e3a5f]">{plan.taskCount}</p>
            </div>
            <ClipboardList className="h-8 w-8 text-[#1e3a5f]/15" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e3a5f]/30" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">待执行/进行中</p>
              <p className="text-2xl font-extrabold text-amber-600">{plan.taskCount - plan.completedCount}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-200" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400/40" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">已完成</p>
              <p className="text-2xl font-extrabold text-emerald-600">{plan.completedCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-200" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400/40" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">完成率</p>
              <p className="text-2xl font-extrabold text-[#1e3a5f]">{completionRate}<span className="text-sm">%</span></p>
            </div>
            <TrendingUp className="h-8 w-8 text-[#1e3a5f]/15" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e3a5f]/30" />
          </CardContent>
        </Card>
      </div>

      {/* Department Progress */}
      {plan.departmentProgress && plan.departmentProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              部门修订完成进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium sticky left-0 bg-gray-50 z-[1]">部门</th>
                    <th className="text-center py-2 px-3 font-medium">任务总数</th>
                    <th className="text-center py-2 px-3 font-medium">待执行</th>
                    <th className="text-center py-2 px-3 font-medium">进行中</th>
                    <th className="text-center py-2 px-3 font-medium">已完成</th>
                    <th className="text-center py-2 px-3 font-medium min-w-[120px]">完成进度</th>
                    <th className="text-center py-2 px-3 font-medium">完成率</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.departmentProgress.map(dept => (
                    <tr key={dept.department} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="py-2 px-3 font-medium sticky left-0 bg-white z-[1]">{dept.department}</td>
                      <td className="text-center py-2 px-3 tabular-nums">{dept.total}</td>
                      <td className="text-center py-2 px-3 tabular-nums text-gray-500">{dept.pending}</td>
                      <td className="text-center py-2 px-3 tabular-nums text-blue-600">{dept.inProgress}</td>
                      <td className="text-center py-2 px-3 tabular-nums text-emerald-600">{dept.completed}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${dept.completionRate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : dept.completionRate >= 50 ? 'bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6]' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
                              style={{ width: `${Math.max(dept.completionRate, 2)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className={`text-center py-2 px-3 font-semibold tabular-nums ${dept.completionRate >= 80 ? 'text-emerald-600' : dept.completionRate >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {dept.completionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <MultiSelectFilter
              label="任务类型"
              options={typeOptions}
              selected={filterType}
              onChange={setFilterType}
            />
            <MultiSelectFilter
              label="任务状态"
              options={statusOptions}
              selected={filterStatus}
              onChange={setFilterStatus}
            />
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索流程名/编码/修订要求"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-700 font-medium">已选择 {selectedIds.size} 项</span>
          {canEdit() && (
            <Button variant="outline" size="sm" onClick={handleCompleteTasks} className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <CheckCircle2 className="h-3.5 w-3.5" /> 批量标记完成
            </Button>
          )}
          {canDelete() && (
            <Button variant="outline" size="sm" onClick={() => setShowBatchDeleteDialog(true)} className="gap-1 text-red-700 border-red-300 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> 批量删除
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => {
            setSelectedIds(new Set());
          }} className="gap-1">
            取消选择
          </Button>
        </div>
      )}

      {/* Task Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 sticky top-0 z-20">
                  <TableHead className="w-10 sticky left-0 bg-gray-50 z-30">
                    <Checkbox
                      checked={tasks.length > 0 && selectedIds.size === tasks.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-10 text-center">序号</TableHead>
                  <TableHead className="min-w-[140px]">流程编码</TableHead>
                  <TableHead className="min-w-[180px]">流程名称</TableHead>
                  <TableHead className="min-w-[80px]">L4所有者</TableHead>
                  <TableHead className="min-w-[70px]">流程所属部门</TableHead>
                  <TableHead className="min-w-[60px]">格式</TableHead>
                  <TableHead className="min-w-[60px]">分类</TableHead>
                  <TableHead className="min-w-[80px]">任务类型</TableHead>
                  <TableHead className="min-w-[120px]">修订要求</TableHead>
                  <TableHead className="min-w-[70px]">状态</TableHead>
                  <TableHead className="min-w-[100px]">完成时间</TableHead>
                  {(canEdit() || canDelete()) && <TableHead className="w-28 text-center sticky right-0 bg-gray-50 z-30">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={canEdit() || canDelete() ? 13 : 12} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow><TableCell colSpan={canEdit() || canDelete() ? 13 : 12} className="text-center py-8 text-muted-foreground">暂无任务</TableCell></TableRow>
                ) : (
                  tasks.map((task, idx) => {
                    const rowBg = task.status === '已完成' ? 'bg-emerald-50/30' : '';
                    const stickyBg = task.status === '已完成' ? 'bg-emerald-50' : 'bg-white';
                    return (
                    <TableRow key={task.id} className={rowBg}>
                      <TableCell className={`sticky left-0 ${stickyBg} z-10 shadow-[2px_0_0_0_rgba(0,0,0,0.04)]`}>
                        <Checkbox
                          checked={selectedIds.has(task.id)}
                          onCheckedChange={() => toggleSelect(task.id)}
                        />
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{task.processCode || <span className="text-muted-foreground">--</span>}</TableCell>
                      <TableCell>
                        <TruncateDiv content={task.processName || ''} maxWidth="240px" className="font-medium" />
                      </TableCell>
                      <TableCell className="text-sm"><TruncateDiv content={task.owner || ''} maxWidth="80px" /></TableCell>
                      <TableCell className="text-sm"><TruncateDiv content={task.department || ''} maxWidth="100px" /></TableCell>
                      <TableCell className="text-sm">
                        {task.format === '集团模板' ? <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] px-1.5 py-0">{task.format}</Badge> :
                         task.format === '旧格式' ? <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">{task.format}</Badge> :
                         task.format ? <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] px-1.5 py-0">{task.format}</Badge> :
                         <span className="text-muted-foreground">--</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.category === '流程' ? <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] px-1.5 py-0">{task.category}</Badge> :
                         task.category === '办法' ? <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">{task.category}</Badge> :
                         task.category === '其它' ? <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] px-1.5 py-0">{task.category}</Badge> :
                         task.category ? <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] px-1.5 py-0">{task.category}</Badge> :
                         <span className="text-muted-foreground">--</span>}
                      </TableCell>
                      <TableCell>{taskTypeBadge(task.taskType)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground"><TruncateDiv content={task.description || ''} maxWidth="200px" /></TableCell>
                      <TableCell>{statusBadge(task.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{task.completedAt || '--'}</TableCell>
                      {(canEdit() || canDelete()) && <TableCell className={`sticky right-0 ${stickyBg} z-10 shadow-[-2px_0_0_0_rgba(0,0,0,0.04)]`}>
                        <div className="flex items-center justify-center gap-1">
                          {canEdit() && task.status === '待执行' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600"
                              onClick={async () => {
                                await fetch(`/api/plan-tasks/${task.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ _action: 'start' }),
                                });
                                fetchTasks();
                              }}
                            >开始</Button>
                          )}
                          {canEdit() && task.status === '进行中' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-600"
                              onClick={async () => {
                                await fetch(`/api/plan-tasks/${task.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ _action: 'complete' }),
                                });
                                fetchPlan();
                                fetchTasks();
                              }}
                            >完成</Button>
                          )}
                          {canEdit() && task.status === '已完成' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500"
                              onClick={async () => {
                                await fetch(`/api/plan-tasks/${task.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ _action: 'revert' }),
                                });
                                fetchPlan();
                                fetchTasks();
                              }}
                            ><RotateCcw className="h-3 w-3" />撤回</Button>
                          )}
                          {canDelete() && isDraft && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500"
                              onClick={() => {
                                setDeleteTaskName(task.processName);
                                setPendingDeleteId(task.id);
                                setShowDeleteDialog(true);
                              }}
                            ><Trash2 className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </TableCell>}
                    </TableRow>
                    )})
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <PaginationBar
          page={page}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          total={total}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认下发计划</DialogTitle>
            <DialogDescription>
              下发后各L4所有者将可见修订任务，计划状态将变为"已下发"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>取消</Button>
            <Button onClick={handlePublish} disabled={operating} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {operating ? '下发中...' : '确认下发'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carry Over Confirmation Dialog (single) */}

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) { setPendingDeleteId(null); setDeleteTaskName(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除任务</DialogTitle>
            <DialogDescription>
              确定要删除任务「{deleteTaskName}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button onClick={() => pendingDeleteId && handleDeleteTask(pendingDeleteId)} disabled={operating} className="bg-red-600 hover:bg-red-700">
              {operating ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认批量删除任务</DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedIds.size} 项任务吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDeleteDialog(false)}>取消</Button>
            <Button onClick={handleBatchDelete} disabled={operating} className="bg-red-600 hover:bg-red-700">
              {operating ? '删除中...' : `确认删除 ${selectedIds.size} 项`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>添加修订任务</DialogTitle>
            <DialogDescription>从流程清单选择已有流程添加为修订任务</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Task type and description - same row, aligned */}
            <div className="flex gap-4 items-start">
              <div className="w-[160px] shrink-0">
                <label className="text-sm font-medium mb-1.5 block">任务类型</label>
                <select
                  value={newTaskType}
                  onChange={e => setNewTaskType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {['新增流程', '修订流程', '废止流程'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium mb-1.5 block">修订要求</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  rows={2}
                  maxLength={500}
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  placeholder={newTaskType === '废止流程' ? '请填写废止原因...' : '可选，最多500字'}
                />
                <div className="text-right text-xs text-muted-foreground mt-0.5">{newTaskDesc.length}/500</div>
              </div>
            </div>

            {/* Search */}
            <div>
              <Input
                placeholder="搜索流程名称/编码/所有者..."
                value={flowSearch}
                onChange={e => setFlowSearch(e.target.value)}
              />
            </div>

            {/* Flow selection table with scroll inside list only */}
            <div className="border rounded-md overflow-auto max-h-[320px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 sticky top-0 z-10">
                    <TableHead className="w-10 bg-gray-50">
                      <Checkbox
                        checked={filteredFlows.length > 0 && selectedFlowIds.size === filteredFlows.filter(f => f.l4Process).length}
                        onCheckedChange={() => {
                          const validFlows = filteredFlows.filter(f => f.l4Process);
                          if (selectedFlowIds.size === validFlows.length) {
                            setSelectedFlowIds(new Set());
                          } else {
                            setSelectedFlowIds(new Set(validFlows.map(f => f.id)));
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="min-w-[140px] bg-gray-50">流程编码</TableHead>
                    <TableHead className="min-w-[180px] bg-gray-50">L4职能流程</TableHead>
                    <TableHead className="min-w-[80px] bg-gray-50">最新版本号</TableHead>
                    <TableHead className="min-w-[80px] bg-gray-50">L4所有者</TableHead>
                    <TableHead className="min-w-[80px] bg-gray-50">流程所属部门</TableHead>
                    <TableHead className="min-w-[70px] bg-gray-50">格式</TableHead>
                    <TableHead className="min-w-[60px] bg-gray-50">分类</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlows.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-4 text-sm text-muted-foreground">无匹配流程</TableCell></TableRow>
                  ) : (
                    filteredFlows.slice(0, 100).map(flow => (
                      <TableRow
                        key={flow.id}
                        className={`cursor-pointer ${selectedFlowIds.has(flow.id) ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          const next = new Set(selectedFlowIds);
                          if (next.has(flow.id)) next.delete(flow.id); else next.add(flow.id);
                          setSelectedFlowIds(next);
                        }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedFlowIds.has(flow.id)}
                            onCheckedChange={() => {
                              const next = new Set(selectedFlowIds);
                              if (next.has(flow.id)) next.delete(flow.id); else next.add(flow.id);
                              setSelectedFlowIds(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{flow.processCode || '--'}</TableCell>
                        <TableCell className="font-medium text-sm">{flow.l4Process || '--'}</TableCell>
                        <TableCell className="text-sm">{flow.version || '--'}</TableCell>
                        <TableCell className="text-sm">{flow.l4Owner || '--'}</TableCell>
                        <TableCell className="text-sm">{flow.department || '--'}</TableCell>
                        <TableCell className="text-sm">
                          {flow.format === '集团模板' ? <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] px-1.5 py-0">{flow.format}</Badge> :
                           flow.format === '旧格式' ? <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">{flow.format}</Badge> :
                           flow.format ? <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] px-1.5 py-0">{flow.format}</Badge> :
                           <span className="text-muted-foreground">--</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {flow.category === '流程' ? <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] px-1.5 py-0">{flow.category}</Badge> :
                           flow.category === '办法' ? <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">{flow.category}</Badge> :
                           flow.category === '其它' ? <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] px-1.5 py-0">{flow.category}</Badge> :
                           flow.category ? <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] px-1.5 py-0">{flow.category}</Badge> :
                           <span className="text-muted-foreground">--</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Selected summary */}
            {selectedFlowIds.size > 0 && (
              <div className="bg-blue-50 rounded-md p-2 max-h-24 overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-blue-700 font-medium">已选 {selectedFlowIds.size} 个流程</p>
                  <button className="text-[10px] text-blue-500 hover:text-red-500" onClick={() => setSelectedFlowIds(new Set())}>清空</button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedFlowIds).map(fid => {
                    const f = flowItems.find(fl => fl.id === fid);
                    return f ? (
                      <Badge key={fid} variant="secondary" className="text-[10px] max-w-[120px] truncate">
                        <span className="truncate">{f.l4Process || f.processCode}</span>
                        <button className="ml-1 hover:text-red-500 flex-shrink-0" onClick={() => {
                          const next = new Set(selectedFlowIds);
                          next.delete(fid);
                          setSelectedFlowIds(next);
                        }}>x</button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button
              onClick={handleAddTasks}
              disabled={operating || selectedFlowIds.size === 0}
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            >
              {operating ? '添加中...' : `确认添加 (${selectedFlowIds.size}项)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 数据初始化确认对话框 */}
      <Dialog open={showReinitDialog} onOpenChange={setShowReinitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              数据初始化
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              此操作将<strong className="text-red-600">清空当前计划所有任务数据</strong>并重新导入，此操作不可撤销！
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-3">请输入 <strong className="text-red-600">数据初始化</strong> 以确认操作：</p>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
              placeholder="请输入：数据初始化"
              value={reinitConfirmText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReinitConfirmText(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="text-sm text-slate-600 mb-2 block">选择要导入的 Excel 文件：</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) setReinitFile(file);
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReinitDialog(false); setReinitConfirmText(''); setReinitFile(null); }}>取消</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
              disabled={reinitConfirmText !== '数据初始化' || !reinitFile || reinitLoading}
              onClick={handleReinitialize}
            >
              {reinitLoading ? '初始化中...' : '确认初始化'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      </TooltipProvider>
  );
}
