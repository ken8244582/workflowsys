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
  ArrowLeft, Plus, Send, CheckCircle2, RotateCcw, Forward, Trash2, Search, Filter,
  ClipboardList, Clock, CheckCircle, TrendingUp, FileText, AlertCircle,
} from 'lucide-react';
import type { RevisionPlan, PlanTask, DepartmentProgress } from '@/lib/flow-data';
import { MultiSelectFilter } from '@/components/multi-select-filter';

interface PlanDetail extends RevisionPlan {
  departmentProgress: DepartmentProgress[];
}

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
}

const TASK_TYPES = ['新增流程', '内容修订', '格式修订'];
const TASK_STATUSES = ['待执行', '进行中', '已完成', '已顺延'];

export default function PlanDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = params.id as string;
  const departmentFilter = searchParams.get('department') || '';

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Filters
  const [filterDept, setFilterDept] = useState<string[]>(departmentFilter ? [departmentFilter] : []);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCarryDialog, setShowCarryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [operating, setOperating] = useState(false);

  // Add task dialog state
  const [addMode, setAddMode] = useState<'select' | 'manual'>('select');
  const [flowItems, setFlowItems] = useState<FlowItem[]>([]);
  const [selectedFlowIds, setSelectedFlowIds] = useState<Set<number>>(new Set());
  const [flowSearch, setFlowSearch] = useState('');
  const [newTaskType, setNewTaskType] = useState('内容修订');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  // Manual mode
  const [manualName, setManualName] = useState('');
  const [manualDept, setManualDept] = useState('');
  const [manualCode, setManualCode] = useState('');

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
      if (filterDept.length > 0) params.set('department', filterDept[0]); // API supports single, first used
      if (filterType.length > 0) params.set('taskType', filterType[0]);
      if (filterStatus.length > 0) params.set('status', filterStatus[0]);
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
  }, [planId, page, pageSize, filterDept, filterType, filterStatus, searchText]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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
    setNewTaskType('内容修订');
    setNewTaskDesc('');
    setManualName('');
    setManualDept('');
    setManualCode('');
  };

  const handleAddTasks = async () => {
    setOperating(true);
    try {
      const tasksToAdd = [];
      if (addMode === 'select') {
        for (const fid of selectedFlowIds) {
          const flow = flowItems.find(f => f.id === fid);
          if (flow) {
            tasksToAdd.push({
              flowItemId: flow.id,
              processCode: flow.processCode,
              processName: flow.l4Process,
              department: flow.l1Domain,
              taskType: newTaskType,
              description: newTaskDesc,
            });
          }
        }
      } else {
        if (!manualName) return;
        tasksToAdd.push({
          processCode: manualCode,
          processName: manualName,
          department: manualDept,
          taskType: newTaskType,
          description: newTaskDesc,
        });
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

  const handleCarryOver = async () => {
    if (selectedIds.size === 0) return;
    setOperating(true);
    try {
      // Get or create next month plan
      const currentMonth = plan!.planMonth;
      const [year, month] = currentMonth.split('-').map(Number);
      const nextMonth = month === 12
        ? `${year + 1}-01`
        : `${year}-${String(month + 1).padStart(2, '0')}`;

      // Ensure next month plan exists
      let nextPlanId: number;
      const plansRes = await fetch(`/api/revision-plans?planMonth=${nextMonth}`);
      const plansData = await plansRes.json();
      if (plansData.items && plansData.items.length > 0) {
        nextPlanId = plansData.items[0].id;
      } else {
        const createRes = await fetch('/api/revision-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planMonth: nextMonth,
            planName: `${nextMonth.replace('-', '年')}月流程修订计划`,
          }),
        });
        const created = await createRes.json();
        nextPlanId = created.id;
      }

      // Carry over each selected task
      const unfinishedIds = Array.from(selectedIds).filter(id => {
        const task = tasks.find(t => t.id === id);
        return task && task.status !== '已完成';
      });

      await Promise.all(
        unfinishedIds.map(id =>
          fetch(`/api/plan-tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _action: 'carry_over', targetPlanId: nextPlanId }),
          })
        )
      );

      setShowCarryDialog(false);
      setSelectedIds(new Set());
      fetchPlan();
      fetchTasks();
    } catch (err) {
      console.error('Failed to carry over tasks:', err);
    } finally {
      setOperating(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await fetch(`/api/plan-tasks/${taskId}`, { method: 'DELETE' });
      fetchPlan();
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
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

  // Dynamic filter options from tasks data
  const deptOptions = plan?.departmentProgress?.map(d => d.department) || [];
  const typeOptions = TASK_TYPES;
  const statusOptions = TASK_STATUSES;

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
      || f.l1Domain.toLowerCase().includes(s);
  });

  return (
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
          {isDraft && (
            <>
              <Button variant="outline" size="sm" onClick={handleOpenAddDialog} className="gap-1.5">
                <Plus className="h-4 w-4" /> 添加任务
              </Button>
              <Button size="sm" onClick={() => setShowPublishDialog(true)} className="gap-1.5 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
                <Send className="h-4 w-4" /> 下发计划
              </Button>
            </>
          )}
          {isPublished && (
            <>
              <Button variant="outline" size="sm" onClick={handleOpenAddDialog} className="gap-1.5">
                <Plus className="h-4 w-4" /> 添加任务
              </Button>
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
              <p className="text-2xl font-extrabold text-amber-600">{plan.taskCount - plan.completedCount - tasks.filter(t => t.status === '已顺延').length}</p>
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

      {/* Department Progress (only show for published) */}
      {plan.departmentProgress && plan.departmentProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              部门完成情况
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.departmentProgress.map(dept => (
              <div key={dept.department} className="flex items-center gap-2 text-sm">
                <div className="w-36 shrink-0 truncate font-medium">{dept.department}</div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6] rounded-full transition-all duration-500"
                    style={{ width: `${dept.completionRate}%` }}
                  />
                </div>
                <div className="w-20 text-right text-xs tabular-nums">
                  <span className="font-semibold">{dept.completed}</span>/{dept.total}
                  <span className={`ml-1 font-semibold ${dept.completionRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {dept.completionRate}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <MultiSelectFilter
              label="所属部门"
              options={deptOptions}
              selected={filterDept}
              onChange={setFilterDept}
            />
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
          <Button variant="outline" size="sm" onClick={handleCompleteTasks} className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <CheckCircle2 className="h-3.5 w-3.5" /> 批量标记完成
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCarryDialog(true)} className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-50">
            <Forward className="h-3.5 w-3.5" /> 批量顺延至下月
          </Button>
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
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="w-10">
                  <Checkbox
                    checked={tasks.length > 0 && selectedIds.size === tasks.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="w-10 text-center">序号</TableHead>
                <TableHead>流程编码</TableHead>
                <TableHead>流程名称</TableHead>
                <TableHead>所属部门</TableHead>
                <TableHead>任务类型</TableHead>
                <TableHead>修订要求</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>完成时间</TableHead>
                <TableHead className="w-28 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : tasks.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无任务</TableCell></TableRow>
              ) : (
                tasks.map((task, idx) => (
                  <TableRow key={task.id} className={task.status === '已完成' ? 'bg-emerald-50/30' : task.status === '已顺延' ? 'bg-amber-50/30' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(task.id)}
                        onCheckedChange={() => toggleSelect(task.id)}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{task.processCode || <span className="text-muted-foreground">--</span>}</TableCell>
                    <TableCell>
                      <div className="font-medium">{task.processName}</div>
                      {task.carriedFromPlanId && (
                        <div className="text-[10px] text-amber-600 flex items-center gap-0.5 mt-0.5">
                          <Forward className="h-3 w-3" /> 顺延自上月计划
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{task.department}</TableCell>
                    <TableCell>{taskTypeBadge(task.taskType)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{task.description || '--'}</TableCell>
                    <TableCell>{statusBadge(task.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{task.completedAt || '--'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {task.status === '待执行' && (
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
                        {task.status === '进行中' && (
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
                        {task.status === '已完成' && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500"
                            onClick={async () => {
                              await fetch(`/api/plan-tasks/${task.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ _action: 'undo_complete' }),
                              });
                              fetchPlan();
                              fetchTasks();
                            }}
                          ><RotateCcw className="h-3 w-3" />撤回</Button>
                        )}
                        {(task.status === '待执行' || task.status === '进行中') && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-600"
                            onClick={async () => {
                              // Single carry over
                              const currentMonth = plan.planMonth;
                              const [year, month] = currentMonth.split('-').map(Number);
                              const nextMonth = month === 12
                                ? `${year + 1}-01`
                                : `${year}-${String(month + 1).padStart(2, '0')}`;
                              let nextPlanId: number;
                              const plansRes = await fetch(`/api/revision-plans?planMonth=${nextMonth}`);
                              const plansData = await plansRes.json();
                              if (plansData.items && plansData.items.length > 0) {
                                nextPlanId = plansData.items[0].id;
                              } else {
                                const createRes = await fetch('/api/revision-plans', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ planMonth: nextMonth }),
                                });
                                const created = await createRes.json();
                                nextPlanId = created.id;
                              }
                              await fetch(`/api/plan-tasks/${task.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ _action: 'carry_over', targetPlanId: nextPlanId }),
                              });
                              fetchPlan();
                              fetchTasks();
                            }}
                          ><Forward className="h-3 w-3" />顺延</Button>
                        )}
                        {isDraft && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500"
                            onClick={() => handleDeleteTask(task.id)}
                          ><Trash2 className="h-3 w-3" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {total} 条</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <span>{page} / {Math.ceil(total / pageSize)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认下发计划</DialogTitle>
            <DialogDescription>
              下发后各部门将可见修订任务，计划状态将变为"已下发"
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

      {/* Carry Over Confirmation Dialog */}
      <Dialog open={showCarryDialog} onOpenChange={setShowCarryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认顺延至下月</DialogTitle>
            <DialogDescription>
              选中的 {selectedIds.size} 项未完成任务将顺延到下月计划中，当前任务标记为"已顺延"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCarryDialog(false)}>取消</Button>
            <Button onClick={handleCarryOver} disabled={operating} className="bg-amber-600 hover:bg-amber-700">
              {operating ? '顺延中...' : '确认顺延'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>添加修订任务</DialogTitle>
            <DialogDescription>从流程清单选择已有流程，或手动填写新增流程信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto max-h-[60vh]">
            {/* Mode toggle */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={addMode === 'select'} onChange={() => setAddMode('select')} className="accent-[#1e3a5f]" />
                <span className="text-sm font-medium">从流程清单选择</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={addMode === 'manual'} onChange={() => setAddMode('manual')} className="accent-[#1e3a5f]" />
                <span className="text-sm font-medium">手动填写</span>
              </label>
            </div>

            {/* Common fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">任务类型</label>
                <select
                  value={newTaskType}
                  onChange={e => setNewTaskType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">修订要求</label>
                <Input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="可选" />
              </div>
            </div>

            {addMode === 'select' ? (
              <>
                <div>
                  <Input
                    placeholder="搜索流程名称/编码..."
                    value={flowSearch}
                    onChange={e => setFlowSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border rounded-md max-h-[280px] overflow-y-auto">
                    {filteredFlows.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">无匹配流程</div>
                    ) : (
                      filteredFlows.slice(0, 100).map(flow => (
                        <label key={flow.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-0">
                          <Checkbox
                            checked={selectedFlowIds.has(flow.id)}
                            onCheckedChange={() => {
                              const next = new Set(selectedFlowIds);
                              if (next.has(flow.id)) next.delete(flow.id); else next.add(flow.id);
                              setSelectedFlowIds(next);
                            }}
                          />
                          <span className="font-mono text-xs text-muted-foreground w-36 shrink-0">{flow.processCode}</span>
                          <span className="truncate flex-1">{flow.l4Process}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{flow.l1Domain}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                {selectedFlowIds.size > 0 && (
                  <div className="bg-blue-50 rounded-md p-2">
                    <p className="text-xs text-blue-700 font-medium mb-1">已选 {selectedFlowIds.size} 个流程</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(selectedFlowIds).map(fid => {
                        const f = flowItems.find(fl => fl.id === fid);
                        return f ? (
                          <Badge key={fid} variant="secondary" className="text-[10px]">
                            {f.l4Process}
                            <button className="ml-1 hover:text-red-500" onClick={() => {
                              const next = new Set(selectedFlowIds);
                              next.delete(fid);
                              setSelectedFlowIds(next);
                            }}>×</button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">流程名称 *</label>
                  <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="输入流程名称" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">流程编码</label>
                  <Input value={manualCode} onChange={e => setManualCode(e.target.value)} placeholder="可选" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">所属部门</label>
                  <select
                    value={manualDept}
                    onChange={e => setManualDept(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">选择部门</option>
                    {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button
              onClick={handleAddTasks}
              disabled={operating || (addMode === 'select' ? selectedFlowIds.size === 0 : !manualName)}
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            >
              {operating ? '添加中...' : `确认添加${addMode === 'select' ? ` (${selectedFlowIds.size}项)` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
