'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Workflow,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

/* ---------- Types ---------- */
interface L4Item {
  id: number;
  processCode: string;
  processName: string;
  owner: string;
  department: string;
  version: string;
  format: string;
  category: string;
  itCoverage: string | null;
  itSubCategory: string | null;
  itScore: number | null;
  status: string | null;
}

interface L3Node {
  name: string;
  owner: string;
  items: L4Item[];
}

interface L2Node {
  name: string;
  owner: string;
  l3List: L3Node[];
}

interface L1Node {
  name: string;
  owner: string;
  l2List: L2Node[];
}

/* ---------- Helper ---------- */
function countL3(l2: L2Node): number {
  return l2.l3List.length;
}
function countL4(l2: L2Node): number {
  return l2.l3List.reduce((s, l3) => s + l3.items.length, 0);
}
function countL2(l1: L1Node): number {
  return l1.l2List.length;
}
function countL3OfL1(l1: L1Node): number {
  return l1.l2List.reduce((s, l2) => s + l2.l3List.length, 0);
}
function countL4OfL1(l1: L1Node): number {
  return l1.l2List.reduce((s, l2) => s + l2.l3List.reduce((ss, l3) => ss + l3.items.length, 0), 0);
}

/* ---------- Edit Dialog State ---------- */
type EditLevel = 'l1' | 'l2' | 'l3' | 'l4' | null;

interface EditFormData {
  // L1
  l1Name: string;
  l1Owner: string;
  // L2
  l2Name: string;
  l2Owner: string;
  // L3
  l3Name: string;
  l3Owner: string;
  // L4
  l4ProcessCode: string;
  l4ProcessName: string;
  l4Owner: string;
  l4Department: string;
  l4Version: string;
  l4Format: string;
  l4Category: string;
}

const emptyForm: EditFormData = {
  l1Name: '', l1Owner: '',
  l2Name: '', l2Owner: '',
  l3Name: '', l3Owner: '',
  l4ProcessCode: '', l4ProcessName: '', l4Owner: '', l4Department: '',
  l4Version: 'C1.0', l4Format: '集团模板', l4Category: '流程',
};

/* ---------- Component ---------- */
export default function ArchitecturePage() {
  const [hierarchy, setHierarchy] = useState<L1Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedL1, setSelectedL1] = useState(0);

  // L3 collapse state: key = "l1Index-l2Index-l3Index"
  const [collapsedL3, setCollapsedL3] = useState<Set<string>>(new Set());

  // Edit dialog
  const [editLevel, setEditLevel] = useState<EditLevel>(null);
  const [isEditNew, setIsEditNew] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>(emptyForm);
  // Path indices for context
  const [editPath, setEditPath] = useState<{ l1?: number; l2?: number; l3?: number; l4Id?: number }>({});
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{ level: EditLevel; msg: string; path: typeof editPath }>({ level: null, msg: '', path: {} });

  // Tooltip for L4 hover
  const [tooltipItem, setTooltipItem] = useState<{ item: L4Item; rect: DOMRect } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flows/architecture');
      if (res.ok) {
        const data = await res.json();
        setHierarchy(data.hierarchy || []);
        if (data.hierarchy?.length > 0 && selectedL1 >= data.hierarchy.length) {
          setSelectedL1(0);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedL1]);

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentL1 = hierarchy[selectedL1] || null;

  // ---- Toggle L3 ----
  const toggleL3 = (key: string) => {
    setCollapsedL3(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ---- Edit Handlers ----
  const openEdit = (level: EditLevel, isNew: boolean, path: typeof editPath, data?: Partial<EditFormData>) => {
    setEditLevel(level);
    setIsEditNew(isNew);
    setEditPath(path);
    setEditForm({ ...emptyForm, ...data });
  };

  const closeEdit = () => {
    setEditLevel(null);
    setEditPath({});
    setEditForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editLevel === 'l1') {
        // L1 is just l1_domain on flows, we create/update by batch updating flows
        // For a new L1, create a placeholder flow entry
        if (isEditNew) {
          const res = await fetch('/api/flows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              l1_domain: editForm.l1Name,
              l1_owner: editForm.l1Owner,
              l2_group: '(待规划)',
              l2_owner: '',
              l3_segment: '(待规划)',
              l3_owner: '',
              process_code: '',
              l4_process: '(待规划)',
              l4_owner: '',
              department: '',
              version: 'C1.0',
              format: '集团模板',
              category: '流程',
            }),
          });
          if (!res.ok) { const d = await res.json(); alert(d.error || '保存失败'); return; }
        } else {
          // Rename L1: update all flows with old l1_domain
          const oldName = hierarchy[editPath.l1!]?.name;
          if (oldName && oldName !== editForm.l1Name) {
            await fetch('/api/flows/batch-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: 'l1_domain', oldValue: oldName, newValue: editForm.l1Name, extraFields: { l1_owner: editForm.l1Owner } }),
            });
          } else if (oldName) {
            await fetch('/api/flows/batch-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: 'l1_domain', oldValue: oldName, newValue: oldName, extraFields: { l1_owner: editForm.l1Owner } }),
            });
          }
        }
      } else if (editLevel === 'l2') {
        if (isEditNew) {
          const l1 = hierarchy[editPath.l1!];
          const res = await fetch('/api/flows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              l1_domain: l1.name,
              l1_owner: l1.owner,
              l2_group: editForm.l2Name,
              l2_owner: editForm.l2Owner,
              l3_segment: '(待规划)',
              l3_owner: '',
              process_code: '',
              l4_process: '(待规划)',
              l4_owner: '',
              department: '',
              version: 'C1.0',
              format: '集团模板',
              category: '流程',
            }),
          });
          if (!res.ok) { const d = await res.json(); alert(d.error || '保存失败'); return; }
        } else {
          const l1 = hierarchy[editPath.l1!];
          const oldName = l1?.l2List[editPath.l2!]?.name;
          if (oldName) {
            await fetch('/api/flows/batch-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: 'l2_group', oldValue: oldName, l1Domain: l1.name, newValue: editForm.l2Name, extraFields: { l2_owner: editForm.l2Owner } }),
            });
          }
        }
      } else if (editLevel === 'l3') {
        if (isEditNew) {
          const l1 = hierarchy[editPath.l1!];
          const l2 = l1?.l2List[editPath.l2!];
          const res = await fetch('/api/flows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              l1_domain: l1.name,
              l1_owner: l1.owner,
              l2_group: l2.name,
              l2_owner: l2.owner,
              l3_segment: editForm.l3Name,
              l3_owner: editForm.l3Owner,
              process_code: '',
              l4_process: '(待规划)',
              l4_owner: '',
              department: '',
              version: 'C1.0',
              format: '集团模板',
              category: '流程',
            }),
          });
          if (!res.ok) { const d = await res.json(); alert(d.error || '保存失败'); return; }
        } else {
          const l1 = hierarchy[editPath.l1!];
          const l2 = l1?.l2List[editPath.l2!];
          const oldName = l2?.l3List[editPath.l3!]?.name;
          if (oldName) {
            await fetch('/api/flows/batch-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: 'l3_segment', oldValue: oldName, l1Domain: l1.name, l2Group: l2.name, newValue: editForm.l3Name, extraFields: { l3_owner: editForm.l3Owner } }),
            });
          }
        }
      } else if (editLevel === 'l4') {
        if (isEditNew) {
          const l1 = hierarchy[editPath.l1!];
          const l2 = l1?.l2List[editPath.l2!];
          const l3 = l2?.l3List[editPath.l3!];
          const res = await fetch('/api/flows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              l1_domain: l1.name,
              l1_owner: l1.owner,
              l2_group: l2.name,
              l2_owner: l2.owner,
              l3_segment: l3.name,
              l3_owner: l3.owner,
              process_code: editForm.l4ProcessCode,
              l4_process: editForm.l4ProcessName,
              l4_owner: editForm.l4Owner,
              department: editForm.l4Department,
              version: editForm.l4Version,
              format: editForm.l4Format,
              category: editForm.l4Category,
            }),
          });
          if (!res.ok) { const d = await res.json(); alert(d.error || '保存失败'); return; }
        } else if (editPath.l4Id) {
          const res = await fetch(`/api/flows/${editPath.l4Id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              process_code: editForm.l4ProcessCode,
              l4_process: editForm.l4ProcessName,
              l4_owner: editForm.l4Owner,
              department: editForm.l4Department,
              version: editForm.l4Version,
              format: editForm.l4Format,
              category: editForm.l4Category,
            }),
          });
          if (!res.ok) { const d = await res.json(); alert(d.error || '保存失败'); return; }
        }
      }
      closeEdit();
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete Handlers ----
  const openDelete = (level: EditLevel, msg: string, path: typeof editPath) => {
    setDeleteInfo({ level, msg, path });
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    const { level, path } = deleteInfo;
    try {
      if (level === 'l1') {
        const l1 = hierarchy[path.l1!];
        await fetch('/api/flows/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'l1_domain', value: l1.name }),
        });
      } else if (level === 'l2') {
        const l1 = hierarchy[path.l1!];
        const l2 = l1.l2List[path.l2!];
        await fetch('/api/flows/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'l2_group', value: l2.name, l1Domain: l1.name }),
        });
      } else if (level === 'l3') {
        const l1 = hierarchy[path.l1!];
        const l2 = l1.l2List[path.l2!];
        const l3 = l2.l3List[path.l3!];
        await fetch('/api/flows/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'l3_segment', value: l3.name, l1Domain: l1.name, l2Group: l2.name }),
        });
      } else if (level === 'l4' && path.l4Id) {
        await fetch(`/api/flows/${path.l4Id}`, { method: 'DELETE' });
      }
      setDeleteOpen(false);
      fetchData();
    } catch {
      alert('删除失败');
    }
  };

  // ---- Render ----
  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">加载中...</div>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - L1 Navigation */}
        <aside className="w-56 shrink-0 bg-primary flex flex-col">
          <div className="px-4 py-3 border-b border-white/15">
            <h2 className="text-sm font-bold text-white tracking-wide">流程架构</h2>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {hierarchy.map((l1, i) => (
              <div
                key={l1.name}
                onClick={() => setSelectedL1(i)}
                className={`relative px-4 py-2.5 cursor-pointer flex items-center justify-between group transition-colors ${
                  i === selectedL1
                    ? 'bg-white text-primary'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        i === selectedL1 ? 'bg-primary text-white' : 'bg-white/15 text-white/90'
                      }`}
                    >
                      L1
                    </span>
                    <span className="text-sm font-medium truncate">{l1.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-7">
                    <span className={`text-[10px] ${i === selectedL1 ? 'text-slate-500' : 'text-white/50'}`}>
                      L2: <strong className={i === selectedL1 ? 'text-slate-800' : 'text-white/80'}>{countL2(l1)}</strong>
                    </span>
                    <span className={`text-[10px] ${i === selectedL1 ? 'text-slate-500' : 'text-white/50'}`}>
                      L3: <strong className={i === selectedL1 ? 'text-slate-800' : 'text-white/80'}>{countL3OfL1(l1)}</strong>
                    </span>
                    <span className={`text-[10px] ${i === selectedL1 ? 'text-slate-500' : 'text-white/50'}`}>
                      L4: <strong className={i === selectedL1 ? 'text-slate-800' : 'text-white/80'}>{countL4OfL1(l1)}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit('l1', false, { l1: i }, { l1Name: l1.name, l1Owner: l1.owner }); }}
                    className={`w-5 h-5 flex items-center justify-center rounded ${i === selectedL1 ? 'hover:bg-slate-100' : 'hover:bg-white/20'}`}
                    title="编辑"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDelete('l1', `确定要删除业务域"${l1.name}"吗？删除后其下所有业务组、业务段和流程将一并删除。`, { l1: i }); }}
                    className={`w-5 h-5 flex items-center justify-center rounded ${i === selectedL1 ? 'hover:bg-red-50 text-red-500' : 'hover:bg-red-500/20 text-red-300'}`}
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {i === selectedL1 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-primary" />
                )}
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-white/15">
            <button
              onClick={() => openEdit('l1', true, {}, { l1Name: '', l1Owner: '' })}
              className="w-full text-left text-xs text-white/70 font-medium py-2 px-3 rounded hover:bg-white/10 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />新增业务域
            </button>
          </div>
        </aside>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* L1 Header Bar */}
          {currentL1 && (
            <div className="bg-primary text-white px-6 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-white/20">L1</span>
                <h1 className="text-xl font-bold">{currentL1.name}</h1>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">L2: <strong className="text-white">{countL2(currentL1)}</strong></span>
                  <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">L3: <strong className="text-white">{countL3OfL1(currentL1)}</strong></span>
                  <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">L4: <strong className="text-white">{countL4OfL1(currentL1)}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/70">所有者：{currentL1.owner || '--'}</span>
                <button
                  onClick={() => openEdit('l1', false, { l1: selectedL1 }, { l1Name: currentL1.name, l1Owner: currentL1.owner })}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/15 transition-colors"
                  title="编辑L1"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDelete('l1', `确定要删除业务域"${currentL1.name}"吗？`, { l1: selectedL1 })}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/15 transition-colors text-red-300 hover:text-red-400"
                  title="删除L1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* L2 Horizontal Columns Area */}
          <div className="flex-1 overflow-auto bg-background" style={{ WebkitOverflowScrolling: 'touch' }}>
            {currentL1 && (
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'stretch', width: 'max-content', minHeight: '100%' }}>
                {currentL1.l2List.map((l2, l2Idx) => (
                  <div
                    key={l2.name}
                    className="shrink-0 border-r border-border flex flex-col"
                    style={{ width: 280, minWidth: 280 }}
                  >
                    {/* L2 Column Header */}
                    <div className="bg-primary text-white px-4 py-2.5 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/25">L2</span>
                        <span className="text-sm font-bold truncate" title={l2.name}>{l2.name}</span>
                        <span className="text-[10px] text-white/50 ml-1">
                          L3:<strong className="text-white/80">{countL3(l2)}</strong>{' '}
                          L4:<strong className="text-white/80">{countL4(l2)}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => openEdit('l2', false, { l1: selectedL1, l2: l2Idx }, { l2Name: l2.name, l2Owner: l2.owner })}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/20"
                          title="编辑"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openDelete('l2', `确定要删除业务组"${l2.name}"吗？删除后其下所有业务段和流程将一并删除。`, { l1: selectedL1, l2: l2Idx })}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-red-300"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* L2 Column Body */}
                    <div className="flex-1 px-3 py-2">
                      {l2.l3List.map((l3, l3Idx) => {
                        const collapseKey = `${selectedL1}-${l2Idx}-${l3Idx}`;
                        const isCollapsed = collapsedL3.has(collapseKey);
                        return (
                          <div key={l3.name} className="mb-3">
                            {/* L3 Header */}
                            <div className="flex items-center justify-between py-2 px-2 rounded bg-muted group">
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={() => toggleL3(collapseKey)}
                                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted-foreground/10 shrink-0"
                                >
                                  <ChevronRight
                                    className={`w-3 h-3 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                                  />
                                </button>
                                <span className="inline-flex items-center justify-center px-1 py-0 rounded text-[9px] font-bold bg-slate-200 text-slate-600">L3</span>
                                <span className="text-sm font-medium text-foreground truncate" title={l3.name}>{l3.name}</span>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => openEdit('l3', false, { l1: selectedL1, l2: l2Idx, l3: l3Idx }, { l3Name: l3.name, l3Owner: l3.owner })}
                                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted-foreground/10"
                                  title="编辑"
                                >
                                  <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => openDelete('l3', `确定要删除业务段"${l3.name}"吗？删除后其下所有流程将一并删除。`, { l1: selectedL1, l2: l2Idx, l3: l3Idx })}
                                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/10"
                                  title="删除"
                                >
                                  <Trash2 className="w-2.5 h-2.5 text-red-500" />
                                </button>
                              </div>
                            </div>

                            {/* L4 Cards */}
                            {!isCollapsed && (
                              <div className="pl-4 py-1">
                                {l3.items.map((item) => (
                                  <L4Card
                                    key={item.id}
                                    item={item}
                                    onEdit={() => openEdit('l4', false, { l1: selectedL1, l2: l2Idx, l3: l3Idx, l4Id: item.id }, {
                                      l4ProcessCode: item.processCode,
                                      l4ProcessName: item.processName,
                                      l4Owner: item.owner,
                                      l4Department: item.department,
                                      l4Version: item.version,
                                      l4Format: item.format,
                                      l4Category: item.category,
                                    })}
                                    onDelete={() => openDelete('l4', `确定要删除流程"${item.processName}"吗？`, { l1: selectedL1, l2: l2Idx, l3: l3Idx, l4Id: item.id })}
                                  />
                                ))}
                                <button
                                  onClick={() => openEdit('l4', true, { l1: selectedL1, l2: l2Idx, l3: l3Idx }, { l4ProcessCode: '', l4ProcessName: '', l4Owner: '', l4Department: '' })}
                                  className="w-full text-left text-xs text-primary font-medium py-1.5 px-2 hover:bg-muted/70 rounded transition-colors inline-flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />添加流程
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        onClick={() => openEdit('l3', true, { l1: selectedL1, l2: l2Idx }, { l3Name: '', l3Owner: '' })}
                        className="w-full text-left text-xs text-primary font-medium py-1.5 px-2 hover:bg-muted/70 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />添加业务段
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add L2 Column */}
                <div
                  onClick={() => openEdit('l2', true, { l1: selectedL1 }, { l2Name: '', l2Owner: '' })}
                  className="shrink-0 flex flex-col items-center justify-center border-r border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ minWidth: 80, width: 80 }}
                >
                  <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">添加列</span>
                </div>
              </div>
            )}

            {!currentL1 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Workflow className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无流程架构数据</p>
                  <p className="text-sm mt-1">点击左侧"新增业务域"开始构建</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Edit Dialog ---- */}
      <Dialog open={editLevel !== null} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className={editLevel === 'l4' ? 'sm:max-w-[520px]' : 'sm:max-w-[420px]'}>
          <DialogHeader>
            <DialogTitle>
              {isEditNew ? '新增' : '编辑'}
              {editLevel === 'l1' ? 'L1业务域' : editLevel === 'l2' ? 'L2业务组' : editLevel === 'l3' ? 'L3业务段' : 'L4职能流程'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editLevel === 'l1' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">L1名称</label>
                  <Input
                    className="mt-1"
                    value={editForm.l1Name}
                    onChange={(e) => setEditForm({ ...editForm, l1Name: e.target.value })}
                    placeholder="请输入业务域名称"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">L1所有者</label>
                  <Input
                    className="mt-1"
                    value={editForm.l1Owner}
                    onChange={(e) => setEditForm({ ...editForm, l1Owner: e.target.value })}
                    placeholder="请输入所有者"
                  />
                </div>
              </>
            )}
            {editLevel === 'l2' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">L2名称</label>
                  <Input
                    className="mt-1"
                    value={editForm.l2Name}
                    onChange={(e) => setEditForm({ ...editForm, l2Name: e.target.value })}
                    placeholder="请输入业务组名称"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">L2所有者</label>
                  <Input
                    className="mt-1"
                    value={editForm.l2Owner}
                    onChange={(e) => setEditForm({ ...editForm, l2Owner: e.target.value })}
                    placeholder="请输入所有者"
                  />
                </div>
              </>
            )}
            {editLevel === 'l3' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">L3名称</label>
                  <Input
                    className="mt-1"
                    value={editForm.l3Name}
                    onChange={(e) => setEditForm({ ...editForm, l3Name: e.target.value })}
                    placeholder="请输入业务段名称"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">L3所有者</label>
                  <Input
                    className="mt-1"
                    value={editForm.l3Owner}
                    onChange={(e) => setEditForm({ ...editForm, l3Owner: e.target.value })}
                    placeholder="请输入所有者"
                  />
                </div>
              </>
            )}
            {editLevel === 'l4' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">流程编码</label>
                    <Input className="mt-1" value={editForm.l4ProcessCode} onChange={(e) => setEditForm({ ...editForm, l4ProcessCode: e.target.value })} placeholder="流程编码" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">流程名称</label>
                    <Input className="mt-1" value={editForm.l4ProcessName} onChange={(e) => setEditForm({ ...editForm, l4ProcessName: e.target.value })} placeholder="流程名称" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">L4所有者</label>
                    <Input className="mt-1" value={editForm.l4Owner} onChange={(e) => setEditForm({ ...editForm, l4Owner: e.target.value })} placeholder="所有者" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">所属部门</label>
                    <Input className="mt-1" value={editForm.l4Department} onChange={(e) => setEditForm({ ...editForm, l4Department: e.target.value })} placeholder="部门" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">版本</label>
                    <Input className="mt-1" value={editForm.l4Version} onChange={(e) => setEditForm({ ...editForm, l4Version: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">格式</label>
                    <Select value={editForm.l4Format} onValueChange={(v) => setEditForm({ ...editForm, l4Format: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="集团模板">集团模板</SelectItem>
                        <SelectItem value="旧格式">旧格式</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">分类</label>
                    <Select value={editForm.l4Category} onValueChange={(v) => setEditForm({ ...editForm, l4Category: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="流程">流程</SelectItem>
                        <SelectItem value="办法">办法</SelectItem>
                        <SelectItem value="其它">其它</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>{deleteInfo.msg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

/* ---------- L4 Card Component ---------- */
function L4Card({ item, onEdit, onDelete }: { item: L4Item; onEdit: () => void; onDelete: () => void }) {
  const formatBg = item.format === '集团模板' ? 'bg-primary-container text-primary' : 'bg-amber-100 text-amber-700';
  const categoryBg = 'bg-purple-100 text-purple-700';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative group mb-2">
          <div className="bg-white border border-border/60 rounded-lg px-3 py-2 hover:border-primary/40 hover:shadow-card transition-all cursor-default">
            {/* Row 1: L4 badge + code + edit/delete */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="inline-flex items-center justify-center px-1 py-0 rounded text-[8px] font-bold bg-primary text-white shrink-0">L4</span>
                <span className="text-[11px] font-mono text-muted-foreground font-semibold truncate">{item.processCode || '--'}</span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={onEdit} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity" title="编辑">
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={onDelete} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" title="删除">
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </div>
            {/* Row 2: Tags */}
            <div className="flex items-center gap-1 mt-1">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${formatBg}`}>{item.format || '--'}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryBg}`}>{item.category || '--'}</span>
            </div>
            {/* Row 3: Process name */}
            <div className="mt-1 text-sm font-medium text-foreground leading-snug truncate">{item.processName || '--'}</div>
            {/* Row 4: Owner + Dept */}
            <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
              {item.owner || '--'}{item.department ? ` · ${item.department}` : ''}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[320px] p-3">
        <div className="text-sm font-bold text-foreground mb-2">{item.processName || '--'}</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">流程编码</span><span className="font-mono text-foreground whitespace-nowrap">{item.processCode || '--'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">L4所有者</span><span className="text-foreground text-right">{item.owner || '--'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">所属部门</span><span className="text-foreground text-right">{item.department || '--'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">版本</span><span className="text-foreground">{item.version || '--'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">格式</span><span className="text-foreground">{item.format || '--'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">分类</span><span className="text-foreground">{item.category || '--'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">IT覆盖</span><span className="text-foreground">{item.itCoverage || '--'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">状态</span><span className="text-foreground">{item.status || '--'}</span></div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
