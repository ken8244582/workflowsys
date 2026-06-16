'use client';

import { useEffect, useState, useCallback } from 'react';
import type { E2EProcess } from '@/lib/e2e-store';
import { Card, CardContent } from '@/components/ui/card';
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
import { Slider } from '@/components/ui/slider';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';

const STATUS_OPTIONS: { value: E2EProcess['status']; label: string }[] = [
  { value: 'not_started', label: '未开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
];

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-600' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-600' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

interface ProcessFormData {
  name: string;
  owner: string;
  department: string;
  responsible_person: string;
  current_progress: number;
  target_progress: number;
  status: E2EProcess['status'];
  start_date: string;
  completed_date: string;
  description: string;
}

const emptyForm: ProcessFormData = {
  name: '',
  owner: '',
  department: '',
  responsible_person: '',
  current_progress: 0,
  target_progress: 100,
  status: 'not_started',
  start_date: '',
  completed_date: '',
  description: '',
};

export default function E2EListPage() {
  const [processes, setProcesses] = useState<E2EProcess[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选状态
  const [filterDept, setFilterDept] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  // 弹窗状态
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProcessFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // 删除确认
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 快速更新进度
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickProgress, setQuickProgress] = useState(0);

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch('/api/e2e/processes');
      const data = await res.json();
      setProcesses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProcesses(); }, [fetchProcesses]);

  // 提取筛选选项
  const departments = [...new Set(processes.map((p) => p.department))].filter(Boolean).sort();
  const owners = [...new Set(processes.map((p) => p.owner))].filter(Boolean).sort();

  // 筛选逻辑
  const filtered = processes.filter((p) => {
    if (filterDept !== 'all' && p.department !== filterDept) return false;
    if (filterOwner !== 'all' && p.owner !== filterOwner) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.responsible_person.toLowerCase().includes(s) && !p.department.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  // 打开编辑弹窗
  const handleEdit = (process: E2EProcess) => {
    setEditingId(process.id);
    setForm({
      name: process.name,
      owner: process.owner,
      department: process.department,
      responsible_person: process.responsible_person,
      current_progress: process.current_progress,
      target_progress: process.target_progress,
      status: process.status,
      start_date: process.start_date || '',
      completed_date: process.completed_date || '',
      description: process.description || '',
    });
    setShowDialog(true);
  };

  // 保存（新增/编辑）
  const handleSave = async () => {
    if (!form.name.trim() || !form.owner.trim() || !form.department.trim() || !form.responsible_person.trim()) return;
    setSaving(true);
    try {
      // 根据 currentProgress 自动计算 status，防止进度与状态不一致
      const autoStatus = form.current_progress >= 100 ? 'completed' as const : form.current_progress > 0 ? 'in_progress' as const : 'not_started' as const;
      const payload = { ...form, status: autoStatus };
      if (editingId) {
        await fetch(`/api/e2e/processes/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/e2e/processes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowDialog(false);
      await fetchProcesses();
    } catch (error) {
      console.error('Failed to save process:', error);
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/e2e/processes/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      await fetchProcesses();
    } catch (error) {
      console.error('Failed to delete process:', error);
    } finally {
      setDeleting(false);
    }
  };

  // 快速更新进度
  const handleQuickProgressSave = async () => {
    if (!quickEditId) return;
    try {
      const newStatus = quickProgress >= 100 ? 'completed' as const : quickProgress > 0 ? 'in_progress' as const : 'not_started' as const;
      await fetch(`/api/e2e/processes/${quickEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_progress: quickProgress, status: newStatus }),
      });
      setQuickEditId(null);
      await fetchProcesses();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">加载流程数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
          <h2 className="text-xl font-semibold text-[#1e3a5f]">端到端流程管理</h2>
        </div>
        <Button onClick={handleAdd} size="sm" className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
          <Plus className="h-3.5 w-3.5 mr-1" />新增流程
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="责任部门" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="流程所有者" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部所有者</SelectItem>
              {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="搜索流程名称/责任人/部门"
            className="w-[220px]"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span className="ml-auto text-xs text-muted-foreground">共 {filtered.length} 条</span>
        </CardContent>
      </Card>

      {/* 进度定义说明 */}
      <details className="group rounded-lg border bg-white">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          <svg className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/></svg>
          进度定义说明
        </summary>
        <div className="border-t px-4 py-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right font-semibold text-[#1e3a5f]">1%–69%</span>
              <span className="w-28 shrink-0"><span className="inline-block h-2 w-full rounded-full bg-muted"><span className="inline-block h-2 rounded-full bg-[#1e3a5f]" style={{width:'70%'}} /></span></span>
              <span className="text-muted-foreground">根据初版文件与最终成品差距评定</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right font-semibold text-[#1e3a5f]">70%</span>
              <span className="w-28 shrink-0"><span className="inline-block h-2 w-full rounded-full bg-muted"><span className="inline-block h-2 rounded-full bg-[#1e3a5f]" style={{width:'70%'}} /></span></span>
              <span className="text-muted-foreground">完成端到端流程文件初版编制并提交会签</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right font-semibold text-[#1e3a5f]">75%</span>
              <span className="w-28 shrink-0"><span className="inline-block h-2 w-full rounded-full bg-muted"><span className="inline-block h-2 rounded-full bg-[#1e3a5f]" style={{width:'75%'}} /></span></span>
              <span className="text-muted-foreground">完成端到端流程文件评审</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right font-semibold text-[#1e3a5f]">80%</span>
              <span className="w-28 shrink-0"><span className="inline-block h-2 w-full rounded-full bg-muted"><span className="inline-block h-2 rounded-full bg-[#1e3a5f]" style={{width:'80%'}} /></span></span>
              <span className="text-muted-foreground">完成端到端流程文件发布</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right font-semibold text-[#1e3a5f]">81%–99%</span>
              <span className="w-28 shrink-0"><span className="inline-block h-2 w-full rounded-full bg-muted"><span className="inline-block h-2 rounded-full bg-[#1e3a5f]" style={{width:'90%'}} /></span></span>
              <span className="text-muted-foreground">根据未修订完的职能流程占比评定</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right font-semibold text-[#10b981]">100%</span>
              <span className="w-28 shrink-0"><span className="inline-block h-2 w-full rounded-full bg-[#10b981]" /></span>
              <span className="text-muted-foreground">完成端到端流程全部相关职能流程的修订</span>
            </div>
          </div>
        </div>
      </details>

      {/* 数据表格 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="w-[40px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">#</th>
                  <th className="w-[160px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">流程名称</th>
                  <th className="w-[90px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">流程所有者</th>
                  <th className="w-[110px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">责任部门</th>
                  <th className="w-[70px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">责任人</th>
                  <th className="min-w-[240px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">当前进度</th>
                  <th className="w-[80px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">状态</th>
                  <th className="w-[60px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                      {processes.length === 0 ? '暂无端到端流程数据，请点击"新增流程"添加' : '没有匹配的流程'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, idx) => {
                    const badge = STATUS_BADGE[p.status] || STATUS_BADGE.not_started;
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs font-medium">{p.name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{p.owner}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{p.department}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{p.responsible_person}</td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="relative h-5 w-full rounded-full bg-muted">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-[#1e3a5f] transition-all"
                                style={{ width: `${Math.min(p.current_progress, 100)}%` }}
                              />
                            </div>
                            <button
                              onClick={() => { setQuickEditId(p.id); setQuickProgress(p.current_progress); }}
                              className="shrink-0 tabular-nums text-xs font-semibold text-[#1e3a5f] hover:underline"
                            >
                              {p.current_progress}%
                            </button>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                            {STATUS_OPTIONS.find((s) => s.value === p.status)?.label || p.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="编辑" onClick={() => handleEdit(p)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="删除" onClick={() => setDeleteId(p.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
            <DialogTitle>{editingId ? '编辑端到端流程' : '新增端到端流程'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>流程名称 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：市场到线索" />
              </div>
              <div className="space-y-1.5">
                <Label>流程所有者 *</Label>
                <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="如：袁意江" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>责任部门 *</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="如：品牌与发展部" />
              </div>
              <div className="space-y-1.5">
                <Label>责任人 *</Label>
                <Input value={form.responsible_person} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} placeholder="如：张波" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>当前进度: {form.current_progress}%</Label>
              <Slider value={[form.current_progress]} onValueChange={([v]) => setForm({ ...form, current_progress: v })} max={100} step={5} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>状态</Label>
                <Select value={form.status} onValueChange={(v: E2EProcess['status']) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>开始日期</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>完成日期</Label>
                <Input type="date" value={form.completed_date} onChange={(e) => setForm({ ...form, completed_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="可选备注信息" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.owner.trim() || !form.department.trim() || !form.responsible_person.trim()} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 快速更新进度弹窗 */}
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

      {/* 删除确认 */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除端到端流程「{processes.find((p) => p.id === deleteId)?.name}」吗？此操作无法撤销。
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
