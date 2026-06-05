'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectFilter } from '@/components/multi-select-filter';
import {
  ArrowLeft, Plus, Send, RotateCcw, FileSpreadsheet, Trash2, Play, CheckCircle2,
  ArrowRightLeft, Undo2, Building2, FileText, Clock, TrendingUp,
} from 'lucide-react';
import type { PlanTask, RevisionPlan, DepartmentProgress } from '@/lib/flow-data';

interface FlowItem {
  id: number;
  processCode: string;
  l4Process: string;
  l1Domain: string;
  l2Group: string;
  l3Segment: string;
  version: string;
  format: string;
  category: string;
  itCoverage: string;
  itScore: number;
  status: string;
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [plan, setPlan] = useState<RevisionPlan & { departmentProgress?: DepartmentProgress[] } | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDept, setFilterDept] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterL2, setFilterL2] = useState<string[]>([]);
  const [filterL3, setFilterL3] = useState<string[]>([]);
  const [filterFormat, setFilterFormat] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterIT, setFilterIT] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Dialogs
  const [showAddTask, setShowAddTask] = useState(false);
  const [showDeleteTask, setShowDeleteTask] = useState<number | null>(null);
  const [showDeletePlan, setShowDeletePlan] = useState(false);
  const [showConfirmAction, setShowConfirmAction] = useState<{ type: string; ids: number[] } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // Add task
  const [addMode, setAddMode] = useState<'select' | 'manual'>('select');
  const [addTaskType, setAddTaskType] = useState('内容修订');
  const [addDescription, setAddDescription] = useState('');
  const [flowItems, setFlowItems] = useState<FlowItem[]>([]);
  const [selectedFlowIds, setSelectedFlowIds] = useState<Set<number>>(new Set());
  const [flowSearch, setFlowSearch] = useState('');

  // Manual add
  const [manualName, setManualName] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualDept, setManualDept] = useState('');
  const [manualL2, setManualL2] = useState('');
  const [manualL3, setManualL3] = useState('');

  // Action loading
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/revision-plans/${planId}`);
      const data = await res.json();
      setPlan(data);
    } catch { /* ignore */ }
  }, [planId]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filterDept.length) params.set('department', filterDept.join(','));
      if (filterType.length) params.set('taskType', filterType.join(','));
      if (filterStatus.length) params.set('status', filterStatus.join(','));
      if (search) params.set('search', search);

      const res = await fetch(`/api/revision-plans/${planId}/tasks?${params}`);
      const data = await res.json();
      setTasks(data.items || []);
      setTotalTasks(data.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [planId, page, pageSize, filterDept, filterType, filterStatus, search]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Fetch flow items for add task dialog
  useEffect(() => {
    if (showAddTask) {
      fetch('/api/flows?pageSize=1000').then(r => r.json()).then(data => {
        setFlowItems((data.items || []).map((f: Record<string, unknown>) => ({
          id: f.id as number,
          processCode: f.processCode as string || '',
          l4Process: f.l4Process as string || '',
          l1Domain: f.l1Domain as string || '',
          l2Group: f.l2Group as string || '',
          l3Segment: f.l3Segment as string || '',
          version: f.version as string || '',
          format: f.format as string || '',
          category: f.category as string || '',
          itCoverage: f.itCoverage as string || '',
          itScore: f.itScore as number || 0,
          status: f.status as string || '',
        })));
      }).catch(() => {});
    }
  }, [showAddTask]);

  // Dynamic filter options from tasks
  const deptOptions = [...new Set(tasks.map(t => t.department).filter(Boolean))];
  const l2Options = [...new Set(tasks.map(t => t.l2Group).filter(Boolean))];
  const l3Options = [...new Set(tasks.map(t => t.l3Segment).filter(Boolean))];
  const formatOptions = [...new Set(tasks.map(t => t.format).filter(Boolean))];
  const categoryOptions = [...new Set(tasks.map(t => t.category).filter(Boolean))];
  const itOptions = [...new Set(tasks.map(t => t.itCoverage).filter(Boolean))];

  // Also fetch all tasks for filter options (if current page is filtered)
  const [allTasks, setAllTasks] = useState<PlanTask[]>([]);
  useEffect(() => {
    fetch(`/api/revision-plans/${planId}/tasks?pageSize=1000`).then(r => r.json()).then(data => {
      setAllTasks(data.items || []);
    }).catch(() => {});
  }, [planId, plan?.taskCount]);

  const allDeptOptions = [...new Set(allTasks.map(t => t.department).filter(Boolean))];
  const allL2Options = [...new Set(allTasks.map(t => t.l2Group).filter(Boolean))];
  const allL3Options = [...new Set(allTasks.map(t => t.l3Segment).filter(Boolean))];
  const allFormatOptions = [...new Set(allTasks.map(t => t.format).filter(Boolean))];
  const allCategoryOptions = [...new Set(allTasks.map(t => t.category).filter(Boolean))];
  const allITOptions = [...new Set(allTasks.map(t => t.itCoverage).filter(Boolean))];
  const allTypeOptions = [...new Set(allTasks.map(t => t.taskType).filter(Boolean))];
  const allStatusOptions = ['待执行', '进行中', '已完成', '已顺延'];

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  };

  const handleAction = async (action: string, id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/plan-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: action }),
      });
      if (res.ok) {
        fetchPlan();
        fetchTasks();
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch { alert('操作失败'); }
    setActionLoading(false);
  };

  const handleBatchAction = async () => {
    if (!showConfirmAction) return;
    const { type, ids } = showConfirmAction;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/plan-tasks/${ids[0]}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: type, taskIds: ids }),
      });
      if (res.ok) {
        fetchPlan();
        fetchTasks();
        setSelectedIds(new Set());
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch { alert('操作失败'); }
    setShowConfirmAction(null);
    setConfirmText('');
    setActionLoading(false);
  };

  const handlePlanAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/revision-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: action }),
      });
      if (res.ok) {
        fetchPlan();
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch { alert('操作失败'); }
    setActionLoading(false);
  };

  const handleDeletePlan = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/revision-plans/${planId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/functional/plan');
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch { alert('删除失败'); }
    setShowDeletePlan(false);
    setActionLoading(false);
  };

  const handleDeleteTask = async () => {
    if (!showDeleteTask) return;
    setActionLoading(true);
    try {
      await fetch(`/api/plan-tasks/${showDeleteTask}`, { method: 'DELETE' });
      fetchPlan();
      fetchTasks();
    } catch { /* ignore */ }
    setShowDeleteTask(null);
    setActionLoading(false);
  };

  const handleAddTasks = async () => {
    setActionLoading(true);
    try {
      if (addMode === 'select') {
        const selectedFlows = flowItems.filter(f => selectedFlowIds.has(f.id));
        const tasks = selectedFlows.map(f => ({
          flowItemId: f.id,
          processCode: f.processCode,
          processName: f.l4Process,
          department: f.l1Domain,
          l2Group: f.l2Group,
          l3Segment: f.l3Segment,
          version: f.version,
          format: f.format,
          category: f.category,
          itCoverage: f.itCoverage,
          itScore: f.itScore,
          flowStatus: f.status,
          taskType: addTaskType,
          description: addDescription,
        }));
        await fetch(`/api/revision-plans/${planId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks }),
        });
      } else {
        const tasks = [{
          flowItemId: null,
          processCode: manualCode,
          processName: manualName,
          department: manualDept,
          l2Group: manualL2,
          l3Segment: manualL3,
          version: '',
          format: '',
          category: '',
          itCoverage: '',
          itScore: 0,
          flowStatus: '',
          taskType: addTaskType,
          description: addDescription,
        }];
        await fetch(`/api/revision-plans/${planId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks }),
        });
      }
      fetchPlan();
      fetchTasks();
      setShowAddTask(false);
      setSelectedFlowIds(new Set());
      setAddDescription('');
      setFlowSearch('');
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleExport = () => {
    window.open(`/api/revision-plans/${planId}/export`, '_blank');
  };

  if (!plan) return <div className="p-8 text-center text-gray-400">加载中...</div>;

  const isDraft = plan.status === '草稿';
  const isPublished = plan.status === '已下发';
  const selectedTasks = tasks.filter(t => selectedIds.has(t.id));
  const selectedPending = selectedTasks.filter(t => t.status === '待执行' || t.status === '进行中');
  const selectedStartable = selectedTasks.filter(t => t.status === '待执行');
  const selectedCompletable = selectedTasks.filter(t => t.status === '待执行' || t.status === '进行中');
  const selectedCarryable = selectedTasks.filter(t => t.status === '待执行' || t.status === '进行中');

  // Filter flow items for add dialog
  const filteredFlows = flowItems.filter(f => {
    if (!flowSearch) return true;
    const s = flowSearch.toLowerCase();
    return f.processCode.toLowerCase().includes(s) ||
           f.l4Process.toLowerCase().includes(s) ||
           f.l1Domain.toLowerCase().includes(s);
  });

  const completionRate = plan.taskCount > 0 ? Math.round((plan.completedCount / plan.taskCount) * 1000) / 10 : 0;
  const pendingCount = (plan.departmentProgress || []).reduce((s, d) => s + d.pending, 0);
  const inProgressCount = (plan.departmentProgress || []).reduce((s, d) => s + d.inProgress, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/functional/plan')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">{plan.planName}</h1>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isDraft ? 'bg-gray-100 text-gray-600' :
            isPublished ? 'bg-blue-50 text-blue-700' :
            'bg-gray-100 text-gray-500'
          }`}>{plan.status}</span>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setShowDeletePlan(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> 删除计划
              </Button>
              <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={() => handlePlanAction('publish')} disabled={actionLoading}>
                <Send className="w-4 h-4 mr-1" /> 下发计划
              </Button>
            </>
          )}
          {isPublished && (
            <Button variant="outline" size="sm" onClick={() => handlePlanAction('revoke')} disabled={actionLoading}>
              <RotateCcw className="w-4 h-4 mr-1" /> 撤回编辑
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> 导出
          </Button>
          <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={() => setShowAddTask(true)}>
            <Plus className="w-4 h-4 mr-1" /> 添加任务
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm border-none overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">任务总数</div>
                <div className="text-3xl font-extrabold text-gray-900 tabular-nums">{plan.taskCount}</div>
              </div>
              <FileText className="w-8 h-8 text-[#1e3a5f]/20" />
            </CardContent>
            <div className="h-[3px] bg-gradient-to-r from-[#1e3a5f]/80 via-[#1e3a5f]/40 to-transparent" />
          </Card>
          <Card className="bg-white shadow-sm border-none overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">待执行/进行中</div>
                <div className="text-3xl font-extrabold text-amber-600 tabular-nums">{pendingCount + inProgressCount}</div>
              </div>
              <Clock className="w-8 h-8 text-amber-500/20" />
            </CardContent>
            <div className="h-[3px] bg-gradient-to-r from-amber-500/80 via-amber-500/40 to-transparent" />
          </Card>
          <Card className="bg-white shadow-sm border-none overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">已完成</div>
                <div className="text-3xl font-extrabold text-emerald-600 tabular-nums">{plan.completedCount}</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
            </CardContent>
            <div className="h-[3px] bg-gradient-to-r from-emerald-500/80 via-emerald-500/40 to-transparent" />
          </Card>
          <Card className="bg-white shadow-sm border-none overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">完成率</div>
                <div className="text-3xl font-extrabold text-[#1e3a5f] tabular-nums">{completionRate}%</div>
              </div>
              <TrendingUp className="w-8 h-8 text-[#1e3a5f]/20" />
            </CardContent>
            <div className="h-[3px] bg-gradient-to-r from-[#1e3a5f]/80 via-[#1e3a5f]/40 to-transparent" />
          </Card>
        </div>

        {/* Department Progress */}
        {plan.departmentProgress && plan.departmentProgress.length > 0 && (
          <Card className="bg-white shadow-sm border-none">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">部门完成情况</h3>
              <div className="space-y-2">
                {plan.departmentProgress.map((d) => {
                  const rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
                  return (
                    <div key={d.department} className="flex items-center gap-3">
                      <div className="w-40 text-sm text-gray-600 truncate flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {d.department}
                      </div>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1e3a5f] rounded-full transition-all" style={{ width: `${rate}%` }} />
                      </div>
                      <div className="text-sm text-gray-500 w-16 text-right tabular-nums">{d.completed}/{d.total}</div>
                      <div className={`text-sm font-medium w-14 text-right tabular-nums ${rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {rate}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-3 flex flex-wrap items-center gap-2">
          <MultiSelectFilter label="所属部门" options={allDeptOptions} selected={filterDept} onChange={setFilterDept} />
          <MultiSelectFilter label="L2业务组" options={allL2Options} selected={filterL2} onChange={setFilterL2} />
          <MultiSelectFilter label="L3业务段" options={allL3Options} selected={filterL3} onChange={setFilterL3} />
          <MultiSelectFilter label="任务类型" options={allTypeOptions} selected={filterType} onChange={setFilterType} />
          <MultiSelectFilter label="任务状态" options={allStatusOptions} selected={filterStatus} onChange={setFilterStatus} />
          <MultiSelectFilter label="格式" options={allFormatOptions} selected={filterFormat} onChange={setFilterFormat} />
          <MultiSelectFilter label="分类" options={allCategoryOptions} selected={filterCategory} onChange={setFilterCategory} />
          <MultiSelectFilter label="IT覆盖" options={allITOptions} selected={filterIT} onChange={setFilterIT} />
          <input
            type="text"
            placeholder="搜索流程名/编码/修订要求"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md bg-white w-52 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/30"
          />
          {(filterDept.length || filterType.length || filterStatus.length || search) && (
            <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => {
              setFilterDept([]); setFilterType([]); setFilterStatus([]);
              setFilterL2([]); setFilterL3([]); setFilterFormat([]);
              setFilterCategory([]); setFilterIT([]); setSearch('');
            }}>清除筛选</Button>
          )}
        </div>

        {/* Batch Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-sm text-blue-700 font-medium">已选择 {selectedIds.size} 项</span>
            {selectedStartable.length > 0 && (
              <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-100"
                onClick={() => setShowConfirmAction({ type: 'batchStart', ids: [...selectedStartable.map(t => t.id)] })}>
                <Play className="w-3.5 h-3.5 mr-1" /> 批量开始 ({selectedStartable.length})
              </Button>
            )}
            {selectedCompletable.length > 0 && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setShowConfirmAction({ type: 'batchComplete', ids: [...selectedCompletable.map(t => t.id)] })}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 批量标记完成 ({selectedCompletable.length})
              </Button>
            )}
            {selectedCarryable.length > 0 && (
              <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => setShowConfirmAction({ type: 'batchCarryover', ids: [...selectedCarryable.map(t => t.id)] })}>
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> 批量顺延至下月 ({selectedCarryable.length})
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setSelectedIds(new Set())}>
              取消选择
            </Button>
          </div>
        )}

        {/* Task Table */}
        <Card className="bg-white shadow-sm border-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600 text-xs font-medium">
                    <th className="px-3 py-2.5 text-center w-10">
                      <Checkbox checked={selectedIds.size === tasks.length && tasks.length > 0} onCheckedChange={toggleSelectAll} />
                    </th>
                    <th className="px-3 py-2.5 text-center w-10">序号</th>
                    <th className="px-3 py-2.5 text-left">流程编码</th>
                    <th className="px-3 py-2.5 text-left">流程名称</th>
                    <th className="px-3 py-2.5 text-left">所属部门</th>
                    <th className="px-3 py-2.5 text-left">L2业务组</th>
                    <th className="px-3 py-2.5 text-left">L3业务段</th>
                    <th className="px-3 py-2.5 text-center">版本</th>
                    <th className="px-3 py-2.5 text-center">格式</th>
                    <th className="px-3 py-2.5 text-center">分类</th>
                    <th className="px-3 py-2.5 text-center">IT覆盖</th>
                    <th className="px-3 py-2.5 text-center">任务类型</th>
                    <th className="px-3 py-2.5 text-left">修订要求</th>
                    <th className="px-3 py-2.5 text-center">状态</th>
                    <th className="px-3 py-2.5 text-center">完成时间</th>
                    <th className="px-3 py-2.5 text-center w-40">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t, idx) => (
                    <tr key={t.id} className={`border-b hover:bg-gray-50/50 ${t.status === '已顺延' ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-3 py-2 text-center">
                        <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-400">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-3 py-2 text-gray-600 font-mono text-xs">{t.processCode || '-'}</td>
                      <td className="px-3 py-2">
                        <span className="text-gray-900">{t.processName}</span>
                        {t.carriedFromPlanId && (
                          <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">顺延</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{t.department || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{t.l2Group || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{t.l3Segment || '-'}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{t.version || '-'}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{t.format || '-'}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{t.category || '-'}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{t.itCoverage || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          t.taskType === '新增流程' ? 'bg-blue-50 text-blue-700' :
                          t.taskType === '内容修订' ? 'bg-purple-50 text-purple-700' :
                          'bg-teal-50 text-teal-700'
                        }`}>{t.taskType}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{t.description || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          t.status === '待执行' ? 'bg-gray-100 text-gray-600' :
                          t.status === '进行中' ? 'bg-blue-50 text-blue-700' :
                          t.status === '已完成' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-400 text-xs">{t.completedAt || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {t.status === '待执行' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleAction('start', t.id)} disabled={actionLoading}>
                              <Play className="w-3.5 h-3.5 mr-0.5" /> 开始
                            </Button>
                          )}
                          {(t.status === '待执行' || t.status === '进行中') && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => setShowConfirmAction({ type: 'complete', ids: [t.id] })} disabled={actionLoading}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-0.5" /> 完成
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-600 hover:bg-amber-50"
                                onClick={() => handleAction('carryover', t.id)} disabled={actionLoading}>
                                <ArrowRightLeft className="w-3.5 h-3.5 mr-0.5" /> 顺延
                              </Button>
                            </>
                          )}
                          {t.status === '已完成' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500 hover:bg-gray-50"
                              onClick={() => handleAction('revoke', t.id)} disabled={actionLoading}>
                              <Undo2 className="w-3.5 h-3.5 mr-0.5" /> 撤回
                            </Button>
                          )}
                          {isDraft && t.status !== '已完成' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:bg-red-50"
                              onClick={() => setShowDeleteTask(t.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={16} className="px-3 py-12 text-center text-gray-400">
                        {loading ? '加载中...' : '暂无任务'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalTasks > pageSize && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-gray-500">共 {totalTasks} 条</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-gray-600 px-2">{page} / {Math.ceil(totalTasks / pageSize)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(totalTasks / pageSize)} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Plan Dialog */}
      <Dialog open={showDeletePlan} onOpenChange={setShowDeletePlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除计划</DialogTitle>
            <DialogDescription>确定要删除「{plan.planName}」吗？此操作不可恢复。</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-red-600 mb-3">请输入"删除计划"以确认操作：</p>
            <input className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
              placeholder="删除计划" value={confirmText} onChange={e => setConfirmText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeletePlan(false); setConfirmText(''); }}>取消</Button>
            <Button variant="destructive" disabled={confirmText !== '删除计划' || actionLoading} onClick={handleDeletePlan}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={showDeleteTask !== null} onOpenChange={() => setShowDeleteTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除任务</DialogTitle>
            <DialogDescription>确定要删除此任务吗？此操作不可恢复。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteTask(null)}>取消</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={handleDeleteTask}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog (complete/batchStart/batchComplete/batchCarryover) */}
      <Dialog open={showConfirmAction !== null} onOpenChange={() => { setShowConfirmAction(null); setConfirmText(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showConfirmAction?.type === 'complete' ? '标记完成' :
               showConfirmAction?.type === 'batchStart' ? '批量开始' :
               showConfirmAction?.type === 'batchComplete' ? '批量标记完成' :
               '批量顺延至下月'}
            </DialogTitle>
            <DialogDescription>
              {showConfirmAction?.type === 'complete' ? '确定要标记此任务为已完成吗？系统将同步更新流程清单信息并生成修订记录。' :
               showConfirmAction?.type === 'batchStart' ? `确定要将 ${showConfirmAction?.ids.length} 项任务标记为进行中吗？` :
               showConfirmAction?.type === 'batchComplete' ? `确定要将 ${showConfirmAction?.ids.length} 项任务标记为已完成吗？系统将同步更新流程清单信息并生成修订记录。` :
               `确定要将 ${showConfirmAction?.ids.length} 项未完成任务顺延至下月吗？系统将自动在下月计划中创建对应任务。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConfirmAction(null); setConfirmText(''); }}>取消</Button>
            <Button
              className={
                showConfirmAction?.type === 'batchComplete' || showConfirmAction?.type === 'complete'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : showConfirmAction?.type === 'batchCarryover'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#1e3a5f] hover:bg-[#1e3a5f]/90'
              }
              disabled={actionLoading}
              onClick={handleBatchAction}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={(open) => { setShowAddTask(open); if (!open) { setSelectedFlowIds(new Set()); setAddDescription(''); setFlowSearch(''); }}}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>添加修订任务</DialogTitle>
            <DialogDescription>从流程清单选择已有流程，或手动填写新增流程信息</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Mode Toggle */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="addMode" checked={addMode === 'select'} onChange={() => setAddMode('select')}
                  className="accent-[#1e3a5f]" />
                <span className="text-sm">从流程清单选择</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="addMode" checked={addMode === 'manual'} onChange={() => setAddMode('manual')}
                  className="accent-[#1e3a5f]" />
                <span className="text-sm">手动填写</span>
              </label>
            </div>

            {/* Task Type & Description */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">任务类型</label>
                <select className="w-full px-3 py-2 border rounded-md text-sm bg-white" value={addTaskType} onChange={e => setAddTaskType(e.target.value)}>
                  <option value="内容修订">内容修订</option>
                  <option value="格式修订">格式修订</option>
                  <option value="新增流程">新增流程</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">修订要求（选填）</label>
                <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="输入修订要求..."
                  value={addDescription} onChange={e => setAddDescription(e.target.value)} />
              </div>
            </div>

            {addMode === 'select' ? (
              <>
                {/* Flow Search */}
                <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="搜索流程名/编码/部门..."
                  value={flowSearch} onChange={e => setFlowSearch(e.target.value)} />

                {/* Flow List */}
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  {filteredFlows.map(f => (
                    <label key={f.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                      <Checkbox
                        checked={selectedFlowIds.has(f.id)}
                        onCheckedChange={() => {
                          setSelectedFlowIds(prev => {
                            const next = new Set(prev);
                            if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
                            return next;
                          });
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{f.processCode} {f.l4Process}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{f.l1Domain} / {f.l2Group} / {f.version} / {f.format}</div>
                      </div>
                    </label>
                  ))}
                  {filteredFlows.length === 0 && (
                    <div className="px-3 py-6 text-center text-gray-400 text-sm">未找到匹配流程</div>
                  )}
                </div>
                {selectedFlowIds.size > 0 && (
                  <div className="text-sm text-gray-500">已选择 {selectedFlowIds.size} 项流程</div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">流程编码</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="输入流程编码"
                    value={manualCode} onChange={e => setManualCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">流程名称 *</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="输入流程名称"
                    value={manualName} onChange={e => setManualName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">所属部门</label>
                    <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="L1业务域"
                      value={manualDept} onChange={e => setManualDept(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">L2业务组</label>
                    <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="L2业务组"
                      value={manualL2} onChange={e => setManualL2(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">L3业务段</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="L3业务段"
                    value={manualL3} onChange={e => setManualL3(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>取消</Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
              disabled={actionLoading || (addMode === 'select' ? selectedFlowIds.size === 0 : !manualName)}
              onClick={handleAddTasks}>
              确认添加{addMode === 'select' && selectedFlowIds.size > 0 ? `(${selectedFlowIds.size}项)` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
