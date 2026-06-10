'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronRight, ChevronDown, Plus, Pencil, Trash2, FolderTree, Table2, Users,
} from 'lucide-react';

interface L3Node { name: string; owner: string; l4Count: number; }
interface L2Node { name: string; owner: string; l3Segments: L3Node[]; }
interface L1Node { name: string; owner: string; l2Groups: L2Node[]; }
interface HierarchyData { hierarchy: L1Node[]; }

interface EditForm {
  level: 'L1' | 'L2' | 'L3';
  oldName: string;
  newName: string;
  newOwner: string;
  l1Name: string;
  l2Name: string;
}

export default function ArchitecturePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hierarchy, setHierarchy] = useState<L1Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set());
  const [expandedL3, setExpandedL3] = useState<Set<string>>(new Set());
  const [selectedL1, setSelectedL1] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tree' | 'card'>('tree');
  const [expandedCardL2, setExpandedCardL2] = useState<Set<string>>(new Set());
  const [expandedCardL3, setExpandedCardL3] = useState<Set<string>>(new Set());

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ level: 'L1', oldName: '', newName: '', newOwner: '', l1Name: '', l2Name: '' });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ level: 'L1' | 'L2' | 'L3'; name: string; l1Name: string; l2Name: string; count: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addLevel, setAddLevel] = useState<'L2' | 'L3'>('L2');
  const [addName, setAddName] = useState('');
  const [addOwner, setAddOwner] = useState('');
  const [addL1Name, setAddL1Name] = useState('');
  const [addL2Name, setAddL2Name] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchHierarchy = useCallback(async () => {
    try {
      const res = await fetch('/api/architecture');
      if (res.ok) {
        const data: HierarchyData = await res.json();
        setHierarchy(data.hierarchy || []);
        if (data.hierarchy?.length > 0 && !selectedL1) {
          setSelectedL1(data.hierarchy[0].name);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedL1]);

  useEffect(() => { fetchHierarchy(); }, [fetchHierarchy]);

  // Toggle helpers
  const toggleSet = (key: string, setFn: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setFn(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };
  const toggleL2 = (key: string) => toggleSet(key, setExpandedL2);
  const toggleL3 = (key: string) => toggleSet(key, setExpandedL3);
  const toggleCardL2 = (key: string) => toggleSet(key, setExpandedCardL2);
  const toggleCardL3 = (key: string) => toggleSet(key, setExpandedCardL3);

  // Edit handlers
  const handleEdit = (level: 'L1' | 'L2' | 'L3', name: string, owner: string, l1Name: string, l2Name: string) => {
    setEditForm({ level, oldName: name, newName: name, newOwner: owner, l1Name, l2Name });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/architecture', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditOpen(false);
        fetchHierarchy();
      } else {
        const data = await res.json();
        alert(data.error || '修改失败');
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (level: 'L1' | 'L2' | 'L3', name: string, l1Name: string, l2Name: string, count: number) => {
    setDeleteTarget({ level, name, l1Name, l2Name, count });
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({ level: deleteTarget.level, name: deleteTarget.name });
      if (deleteTarget.l1Name) params.set('l1Name', deleteTarget.l1Name);
      if (deleteTarget.l2Name) params.set('l2Name', deleteTarget.l2Name);
      const res = await fetch(`/api/architecture?${params}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteOpen(false);
        if (deleteTarget.level === 'L1' && deleteTarget.name === selectedL1) {
          setSelectedL1('');
        }
        fetchHierarchy();
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } finally {
      setDeleting(false);
    }
  };

  // Add handlers - Adding L2 under an L1, or L3 under an L2
  const handleAddClick = (level: 'L2' | 'L3', l1Name: string, l2Name: string) => {
    setAddLevel(level);
    setAddName('');
    setAddOwner('');
    setAddL1Name(l1Name);
    setAddL2Name(l2Name);
    setAddOpen(true);
  };

  const handleAddSave = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      // Create a placeholder flow to establish the new hierarchy node
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          l1Domain: addL1Name,
          l1Owner: '',
          l2Group: addLevel === 'L2' ? addName : addL2Name,
          l2Owner: addLevel === 'L2' ? addOwner : '',
          l3Segment: addLevel === 'L3' ? addName : '默认段',
          l3Owner: addLevel === 'L3' ? addOwner : '',
          l4Process: '待补充',
          processCode: '',
          department: '',
          version: '',
          format: '',
          category: '',
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        fetchHierarchy();
      } else {
        const data = await res.json();
        alert(data.error || '新增失败');
      }
    } finally {
      setAdding(false);
    }
  };

  const currentL1 = hierarchy.find(l => l.name === selectedL1);

  // Count L4 under a node
  const countL4UnderL2 = (l2: L2Node) => l2.l3Segments.reduce((s, l3) => s + l3.l4Count, 0);
  const countL4UnderL1 = (l1: L1Node) => l1.l2Groups.reduce((s, l2) => s + countL4UnderL2(l2), 0);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">流程架构</h1>
          <p className="text-sm text-gray-500 mt-1">L1-L4四级流程层级管理，支持增删查改</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tree')}
            className={viewMode === 'tree' ? 'bg-[#1e3a5f] hover:bg-[#163050]' : ''}
          >
            <FolderTree className="h-4 w-4 mr-1" />树形视图
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('card')}
            className={viewMode === 'card' ? 'bg-[#1e3a5f] hover:bg-[#163050]' : ''}
          >
            <Table2 className="h-4 w-4 mr-1" />卡片视图
          </Button>
        </div>
      </div>

      {/* L1 Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {hierarchy.map(l1 => (
          <button
            key={l1.name}
            onClick={() => setSelectedL1(l1.name)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedL1 === l1.name
                ? 'bg-[#1e3a5f] text-white shadow-md'
                : 'bg-white text-[#1e3a5f] border border-[#1e3a5f]/20 hover:border-[#1e3a5f]/40 hover:bg-[#f0f5fa]'
            }`}
          >
            <span className="font-semibold">{l1.name}</span>
            {l1.owner && <span className={`text-xs ${selectedL1 === l1.name ? 'text-white/70' : 'text-gray-400'}`}>{l1.owner}</span>}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              selectedL1 === l1.name ? 'bg-white/20 text-white' : 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
            }`}>
              {countL4UnderL1(l1)}
            </span>
            <button
              onClick={e => { e.stopPropagation(); handleEdit('L1', l1.name, l1.owner, '', ''); }}
              className={`p-0.5 rounded hover:bg-white/20 ${selectedL1 === l1.name ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDeleteClick('L1', l1.name, '', '', countL4UnderL1(l1)); }}
              className={`p-0.5 rounded hover:bg-white/20 ${selectedL1 === l1.name ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : !currentL1 ? (
        <div className="text-center py-12 text-gray-400">请选择L1业务域</div>
      ) : viewMode === 'tree' ? (
        /* ============= TREE VIEW ============= */
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b bg-[#f8fafc] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-[#1e3a5f] rounded-full" />
              <h2 className="text-lg font-semibold text-gray-800">{currentL1.name}</h2>
              <span className="text-xs text-gray-400">共 {countL4UnderL1(currentL1)} 个L4流程</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleAddClick('L2', currentL1.name, '')}>
              <Plus className="h-4 w-4 mr-1" />添加L2业务组
            </Button>
          </div>
          <div className="p-4 space-y-2">
            {currentL1.l2Groups.map(l2 => {
              const l2Key = `${currentL1.name}::${l2.name}`;
              const isL2Expanded = expandedL2.has(l2Key);
              return (
                <div key={l2Key} className="border rounded-lg overflow-hidden">
                  {/* L2 Header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#f0f5fa] cursor-pointer hover:bg-[#e8eff7] transition-colors"
                    onClick={() => toggleL2(l2Key)}>
                    {isL2Expanded ? <ChevronDown className="h-4 w-4 text-[#1e3a5f]" /> : <ChevronRight className="h-4 w-4 text-[#1e3a5f]" />}
                    <div className="w-1 h-4 bg-[#1e3a5f] rounded-full" />
                    <span className="font-medium text-[#1e3a5f]">{l2.name}</span>
                    {l2.owner && <span className="text-xs text-gray-400 ml-1">{l2.owner}</span>}
                    <span className="text-xs text-gray-400 ml-auto">{countL4UnderL2(l2)} 个流程</span>
                    <button onClick={e => { e.stopPropagation(); handleEdit('L2', l2.name, l2.owner, currentL1.name, ''); }} className="p-1 rounded hover:bg-[#1e3a5f]/10 text-gray-400 hover:text-[#1e3a5f]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteClick('L2', l2.name, currentL1.name, '', countL4UnderL2(l2)); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* L2 Children */}
                  {isL2Expanded && (
                    <div className="pl-6 pr-2 py-2 space-y-1">
                      {l2.l3Segments.map(l3 => {
                        const l3Key = `${l2Key}::${l3.name}`;
                        const isL3Expanded = expandedL3.has(l3Key);
                        return (
                          <div key={l3Key}>
                            {/* L3 Header */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] rounded cursor-pointer hover:bg-[#f0f4f8] transition-colors"
                              onClick={() => toggleL3(l3Key)}>
                              {isL3Expanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
                              <span className="text-sm text-gray-700">{l3.name}</span>
                              {l3.owner && <span className="text-xs text-gray-400 ml-1">{l3.owner}</span>}
                              <span className="text-xs text-gray-400 ml-auto">{l3.l4Count} 个流程</span>
                              <button onClick={e => { e.stopPropagation(); handleEdit('L3', l3.name, l3.owner, currentL1.name, l2.name); }} className="p-1 rounded hover:bg-[#1e3a5f]/10 text-gray-400 hover:text-[#1e3a5f]">
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); handleDeleteClick('L3', l3.name, currentL1.name, l2.name, l3.l4Count); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            {/* L3 Children (L4 flows) */}
                            {isL3Expanded && (
                              <div className="ml-8 mt-1 space-y-0.5">
                                <L4FlowsList l1Name={currentL1.name} l2Name={l2.name} l3Name={l3.name} onRefresh={fetchHierarchy} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => handleAddClick('L3', currentL1.name, l2.name)}
                        className="flex items-center gap-1 px-3 py-2 text-xs text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded transition-colors w-full">
                        <Plus className="h-3.5 w-3.5" />添加L3业务段
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {currentL1.l2Groups.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">暂无L2业务组</div>
            )}
          </div>
        </div>
      ) : (
        /* ============= CARD VIEW ============= */
        <div className="space-y-4">
          {currentL1.l2Groups.map(l2 => {
            const l2Key = `${currentL1.name}::${l2.name}`;
            const isExpanded = expandedCardL2.has(l2Key);
            return (
              <div key={l2Key} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* L2 Card Header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-[#f0f5fa] border-l-4 border-[#1e3a5f] cursor-pointer hover:bg-[#e8eff7] transition-colors"
                  onClick={() => toggleCardL2(l2Key)}>
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-[#1e3a5f]" /> : <ChevronRight className="h-5 w-5 text-[#1e3a5f]" />}
                  <div>
                    <h3 className="font-semibold text-[#1e3a5f]">{l2.name}</h3>
                    {l2.owner && <p className="text-xs text-gray-400 mt-0.5"><Users className="h-3 w-3 inline mr-1" />{l2.owner}</p>}
                  </div>
                  <span className="ml-auto text-xs text-gray-400">{countL4UnderL2(l2)} 个流程</span>
                  <button onClick={e => { e.stopPropagation(); handleEdit('L2', l2.name, l2.owner, currentL1.name, ''); }} className="p-1.5 rounded hover:bg-[#1e3a5f]/10 text-gray-400 hover:text-[#1e3a5f]">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteClick('L2', l2.name, currentL1.name, '', countL4UnderL2(l2)); }} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="p-5 space-y-3">
                    {l2.l3Segments.map(l3 => {
                      const l3Key = `${l2Key}::${l3.name}`;
                      const isL3Expanded = expandedCardL3.has(l3Key);
                      return (
                        <div key={l3Key} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f8fafc] cursor-pointer hover:bg-[#f0f4f8]"
                            onClick={() => toggleCardL3(l3Key)}>
                            {isL3Expanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                            <span className="text-sm font-medium text-gray-700">{l3.name}</span>
                            {l3.owner && <span className="text-xs text-gray-400">{l3.owner}</span>}
                            <span className="ml-auto text-xs text-gray-400">{l3.l4Count} 个流程</span>
                            <button onClick={e => { e.stopPropagation(); handleEdit('L3', l3.name, l3.owner, currentL1.name, l2.name); }} className="p-1 rounded hover:bg-[#1e3a5f]/10 text-gray-400 hover:text-[#1e3a5f]">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDeleteClick('L3', l3.name, currentL1.name, l2.name, l3.l4Count); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {isL3Expanded && (
                            <div className="px-4 py-3">
                              <L4FlowsList l1Name={currentL1.name} l2Name={l2.name} l3Name={l3.name} onRefresh={fetchHierarchy} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => handleAddClick('L3', currentL1.name, l2.name)}
                      className="flex items-center gap-1 px-4 py-2 text-sm text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded-lg transition-colors">
                      <Plus className="h-4 w-4" />添加L3业务段
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={() => handleAddClick('L2', currentL1.name, '')}
            className="flex items-center gap-2 px-5 py-3 text-sm text-[#1e3a5f] bg-white border border-dashed border-[#1e3a5f]/30 rounded-xl hover:bg-[#f0f5fa] hover:border-[#1e3a5f]/50 transition-colors w-full justify-center">
            <Plus className="h-4 w-4" />添加L2业务组
          </button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑{editForm.level} - {editForm.oldName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{editForm.level}名称</Label>
              <Input value={editForm.newName} onChange={e => setEditForm(f => ({ ...f, newName: e.target.value }))} placeholder="请输入名称" />
            </div>
            <div className="space-y-2">
              <Label>{editForm.level}所有者</Label>
              <Input value={editForm.newOwner} onChange={e => setEditForm(f => ({ ...f, newOwner: e.target.value }))} placeholder="请输入所有者" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={handleEditSave} disabled={saving || !editForm.newName.trim()} className="bg-[#1e3a5f] hover:bg-[#163050]">
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除{deleteTarget?.level}「{deleteTarget?.name}」吗？
              此操作将同时删除该层级下所有 {deleteTarget?.count} 个L4流程数据，且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增{addLevel}层级</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{addLevel}名称</Label>
              <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder={`请输入${addLevel}名称`} />
            </div>
            <div className="space-y-2">
              <Label>{addLevel}所有者</Label>
              <Input value={addOwner} onChange={e => setAddOwner(e.target.value)} placeholder="请输入所有者" />
            </div>
            <p className="text-xs text-gray-400">
              新增后将在此层级下创建一条占位流程记录，可在流程清单中进一步编辑。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={handleAddSave} disabled={adding || !addName.trim()} className="bg-[#1e3a5f] hover:bg-[#163050]">
              {adding ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Sub-component: L4 Flows List under a specific L1/L2/L3 */
function L4FlowsList({ l1Name, l2Name, l3Name, onRefresh }: { l1Name: string; l2Name: string; l3Name: string; onRefresh: () => void }) {
  const [flows, setFlows] = useState<Array<{ id: number; processCode: string; l4Process: string; l4Owner: string; department: string; version: string; format: string; category: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editFlow, setEditFlow] = useState<typeof flows[0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFlows = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        l1Domain: l1Name, l2Group: l2Name, l3Segment: l3Name,
        page: '1', pageSize: '200',
      });
      const res = await fetch(`/api/flows?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFlows(data.items || []);
      }
      setLoading(false);
    };
    fetchFlows();
  }, [l1Name, l2Name, l3Name]);

  const handleFlowEditSave = async () => {
    if (!editFlow) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/flows/${editFlow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          l4Process: editFlow.l4Process,
          l4Owner: editFlow.l4Owner,
          department: editFlow.department,
          version: editFlow.version,
          format: editFlow.format,
          category: editFlow.category,
          processCode: editFlow.processCode,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        onRefresh();
        // Also refresh local list
        const params = new URLSearchParams({ l1Domain: l1Name, l2Group: l2Name, l3Segment: l3Name, page: '1', pageSize: '200' });
        const res2 = await fetch(`/api/flows?${params}`);
        if (res2.ok) { const data = await res2.json(); setFlows(data.items || []); }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFlowDelete = async (id: number) => {
    if (!confirm('确定删除该流程？此操作不可恢复。')) return;
    const res = await fetch(`/api/flows/${id}`, { method: 'DELETE' });
    if (res.ok) {
      onRefresh();
      setFlows(prev => prev.filter(f => f.id !== id));
    }
  };

  const formatBadge = (format: string) => {
    if (!format) return null;
    const isGroupTemplate = format === '集团模板';
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        isGroupTemplate ? 'bg-[#d0e2f2] text-[#1e3a5f]' : 'bg-amber-100 text-amber-700'
      }`}>{format}</span>
    );
  };

  const categoryBadge = (category: string) => {
    if (!category) return null;
    const cls = category === '流程' ? 'bg-purple-100 text-purple-700'
      : category === '办法' ? 'bg-emerald-100 text-emerald-700'
      : 'bg-gray-100 text-gray-600';
    return <span className={`text-xs px-1.5 py-0.5 rounded-full ${cls}`}>{category}</span>;
  };

  if (loading) return <div className="text-xs text-gray-400 py-2">加载中...</div>;

  return (
    <div className="space-y-1">
      {flows.map(flow => (
        <div key={flow.id} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[#f8fafc] group transition-colors">
          <span className="text-gray-300 text-sm">└</span>
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{flow.processCode || '—'}</span>
          <span className="text-sm text-gray-700 truncate flex-1">{flow.l4Process}</span>
          {flow.l4Owner && <span className="text-xs text-gray-400 whitespace-nowrap">{flow.l4Owner}</span>}
          {formatBadge(flow.format)}
          {categoryBadge(flow.category)}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setEditFlow({ ...flow }); setEditOpen(true); }} className="p-1 rounded hover:bg-[#1e3a5f]/10 text-gray-400 hover:text-[#1e3a5f]">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={() => handleFlowDelete(flow.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
      {flows.length === 0 && <div className="text-xs text-gray-400 py-2 text-center">暂无L4流程</div>}

      {/* L4 Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>编辑L4流程</DialogTitle></DialogHeader>
          {editFlow && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>流程编码</Label>
                  <Input value={editFlow.processCode} onChange={e => setEditFlow(f => f ? { ...f, processCode: e.target.value } : f)} />
                </div>
                <div className="space-y-2">
                  <Label>版本</Label>
                  <Input value={editFlow.version} onChange={e => setEditFlow(f => f ? { ...f, version: e.target.value } : f)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>L4流程名称</Label>
                <Input value={editFlow.l4Process} onChange={e => setEditFlow(f => f ? { ...f, l4Process: e.target.value } : f)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>L4所有者</Label>
                  <Input value={editFlow.l4Owner} onChange={e => setEditFlow(f => f ? { ...f, l4Owner: e.target.value } : f)} />
                </div>
                <div className="space-y-2">
                  <Label>所属部门</Label>
                  <Input value={editFlow.department} onChange={e => setEditFlow(f => f ? { ...f, department: e.target.value } : f)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>格式</Label>
                  <select className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm" value={editFlow.format} onChange={e => setEditFlow(f => f ? { ...f, format: e.target.value } : f)}>
                    <option value="">请选择</option>
                    <option value="集团模板">集团模板</option>
                    <option value="旧格式">旧格式</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>分类</Label>
                  <select className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm" value={editFlow.category} onChange={e => setEditFlow(f => f ? { ...f, category: e.target.value } : f)}>
                    <option value="">请选择</option>
                    <option value="流程">流程</option>
                    <option value="办法">办法</option>
                    <option value="其它">其它</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={handleFlowEditSave} disabled={saving || !editFlow?.l4Process?.trim()} className="bg-[#1e3a5f] hover:bg-[#163050]">
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
