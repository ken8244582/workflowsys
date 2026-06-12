'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Search, Download, Plus, Pencil, Trash2, RotateCw, XCircle, ChevronRight, ChevronDown, Undo2, RotateCcw, AlertTriangle, Lock, LockOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

import { MultiSelectFilter } from '@/components/multi-select-filter';
import { PaginationBar } from '@/components/pagination-bar';
import { TruncateDiv } from '@/components/truncate-cell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePermission } from '@/lib/use-permission';

/* ========== Unified L1-L4 Hierarchy Icons ========== */
function LevelIcon({ level, className }: { level: number; className?: string }) {
  const colors: Record<number, { stroke: string; fill: string }> = {
    1: { stroke: '#1e3a5f', fill: '#1e3a5f' },
    2: { stroke: '#2563eb', fill: '#2563eb' },
    3: { stroke: '#059669', fill: '#059669' },
    4: { stroke: '#d97706', fill: '#d97706' },
  };
  const c = colors[level] || colors[4];
  if (level === 1) {
    return (<svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2.5" stroke={c.stroke} strokeWidth="1.5" fill={c.fill + '10'} /><rect x="4" y="4" width="8" height="8" rx="1.5" stroke={c.stroke} strokeWidth="1" strokeDasharray="2 1" fill="none" /></svg>);
  }
  if (level === 2) {
    return (<svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="0.5" y="0.5" width="14" height="14" rx="2" stroke={c.stroke} strokeWidth="1.2" strokeDasharray="3 1.5" fill="none" /><rect x="3.5" y="3.5" width="8" height="8" rx="1.5" stroke={c.stroke} strokeWidth="1.2" fill={c.fill + '12'} /><rect x="5.5" y="5.5" width="4" height="4" rx="1" stroke={c.stroke} strokeWidth="0.8" strokeDasharray="1.5 1" fill="none" /></svg>);
  }
  if (level === 3) {
    return (<svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0.5" y="0.5" width="13" height="13" rx="2" stroke={c.stroke} strokeWidth="1" strokeDasharray="2.5 1.5" fill="none" /><rect x="3" y="3" width="8" height="8" rx="1.5" stroke={c.stroke} strokeWidth="1" strokeDasharray="1.5 1" fill="none" /><rect x="5" y="5" width="4" height="4" rx="1" stroke={c.stroke} strokeWidth="1" fill={c.fill + '15'} /></svg>);
  }
  return (<svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="0.5" y="0.5" width="12" height="12" rx="2" stroke={c.stroke} strokeWidth="0.8" strokeDasharray="2 1" fill="none" /><rect x="2.5" y="2.5" width="8" height="8" rx="1.5" stroke={c.stroke} strokeWidth="0.8" strokeDasharray="1.5 1" fill="none" /><rect x="4.5" y="4.5" width="4" height="4" rx="1" stroke={c.stroke} strokeWidth="0.8" strokeDasharray="1 0.5" fill="none" /><circle cx="6.5" cy="6.5" r="1.2" fill={c.fill} /></svg>);
}

interface FlowItem {
  id: number;
  l1Domain: string;
  l1Owner: string;
  l2Group: string;
  l2Owner: string;
  l3Segment: string;
  l3Owner: string;
  processCode: string;
  l4Process: string;
  version: string;
  department: string;
  l4Owner: string;
  format: string;
  category: string;
  itCoverage: string;
  itSubCategory: string;
  itScore: number;
  status: string;
}

interface TreeNode {
  name: string;
  level: number;
  owner: string;
  children: TreeNode[];
  items: FlowItem[];
}


export default function FunctionalListPage() {
  const { can } = usePermission('/functional/list');
  const [allData, setAllData] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [editMode, setEditMode] = useState(false); // 编辑开关，控制编辑/删除/新增操作
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const pageSizeOptions = [50, 100, 200, 500];

  // Filters (multi-select)
  const [selectedL1, setSelectedL1] = useState<string[]>([]);
  const [selectedL2, setSelectedL2] = useState<string[]>([]);
  const [selectedL3, setSelectedL3] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string[]>([]);
  const [selectedIt, setSelectedIt] = useState<string[]>([]);

  // Data reinitialize state
  const [showReinitDialog, setShowReinitDialog] = useState(false);
  const [reinitConfirmText, setReinitConfirmText] = useState('');
  const [reinitLoading, setReinitLoading] = useState(false);
  const [reinitFile, setReinitFile] = useState<File | null>(null);
  const [searchText, setSearchText] = useState('');

  // Dialogs
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState<FlowItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<FlowItem>>({});
  const [editAction, setEditAction] = useState<'edit' | 'revise' | 'abolish'>('edit');
  const [reviseReason, setReviseReason] = useState('');
  const [reviseContent, setReviseContent] = useState('');

  // Tree state
  const [detailItem, setDetailItem] = useState<FlowItem | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Architecture CRUD state (tree view)
  const [archEditOpen, setArchEditOpen] = useState(false);
  const [archEditForm, setArchEditForm] = useState<{ level: 'L1' | 'L2' | 'L3'; oldName: string; newName: string; newOwner: string; l1Name: string; l2Name: string }>({ level: 'L1', oldName: '', newName: '', newOwner: '', l1Name: '', l2Name: '' });
  const [archSaving, setArchSaving] = useState(false);

  const [archDeleteOpen, setArchDeleteOpen] = useState(false);
  const [archDeleteTarget, setArchDeleteTarget] = useState<{ level: 'L1' | 'L2' | 'L3'; name: string; l1Name: string; l2Name: string; count: number } | null>(null);
  const [archDeleting, setArchDeleting] = useState(false);

  const [archAddOpen, setArchAddOpen] = useState(false);
  const [archAddLevel, setArchAddLevel] = useState<'L1' | 'L2' | 'L3'>('L2');
  const [archAddName, setArchAddName] = useState('');
  const [archAddOwner, setArchAddOwner] = useState('');
  const [archAddL1Name, setArchAddL1Name] = useState('');
  const [archAddL2Name, setArchAddL2Name] = useState('');
  const [archAdding, setArchAdding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/flows?page=1&pageSize=10000');
      const data = await res.json();
      setAllData(data.items || []);
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter options - all derived from actual data
  const l1Options = useMemo(() => [...new Set(allData.map(d => d.l1Domain).filter(Boolean))].sort(), [allData]);
  const l2Options = useMemo(() => {
    let base = allData;
    if (selectedL1.length > 0) base = base.filter(d => selectedL1.includes(d.l1Domain));
    return [...new Set(base.map(d => d.l2Group).filter(Boolean))].sort();
  }, [allData, selectedL1]);
  const l3Options = useMemo(() => {
    let base = allData;
    if (selectedL1.length > 0) base = base.filter(d => selectedL1.includes(d.l1Domain));
    if (selectedL2.length > 0) base = base.filter(d => selectedL2.includes(d.l2Group));
    return [...new Set(base.map(d => d.l3Segment).filter(Boolean))].sort();
  }, [allData, selectedL1, selectedL2]);
  const categoryOptions = useMemo(() => [...new Set(allData.map(d => d.category).filter(Boolean))].sort(), [allData]);
  const formatOptions = useMemo(() => [...new Set(allData.map(d => d.format).filter(Boolean))].sort(), [allData]);
  const itOptions = useMemo(() => [...new Set(allData.map(d => d.itCoverage).filter(Boolean))].sort(), [allData]);

  // Edit dialog cascade options (based on editForm selections, not filter selections)
  const l1EditOptions = useMemo(() => [...new Set(allData.map(d => d.l1Domain).filter(Boolean))].sort(), [allData]);
  const l2EditOptions = useMemo(() => {
    const base = editForm.l1Domain ? allData.filter(d => d.l1Domain === editForm.l1Domain) : allData;
    return [...new Set(base.map(d => d.l2Group).filter(Boolean))].sort();
  }, [allData, editForm.l1Domain]);
  const l3EditOptions = useMemo(() => {
    const base = allData.filter(d => d.l1Domain === editForm.l1Domain && d.l2Group === editForm.l2Group);
    return [...new Set(base.map(d => d.l3Segment).filter(Boolean))].sort();
  }, [allData, editForm.l1Domain, editForm.l2Group]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = allData;
    if (selectedL1.length > 0) result = result.filter(d => selectedL1.includes(d.l1Domain));
    if (selectedL2.length > 0) result = result.filter(d => selectedL2.includes(d.l2Group));
    if (selectedL3.length > 0) result = result.filter(d => selectedL3.includes(d.l3Segment));
    if (selectedCategory.length > 0) result = result.filter(d => selectedCategory.includes(d.category));
    if (selectedFormat.length > 0) result = result.filter(d => selectedFormat.includes(d.format));
    if (selectedIt.length > 0) result = result.filter(d => selectedIt.includes(d.itCoverage));
    if (searchText) {
      const s = searchText.toLowerCase();
      result = result.filter(d =>
        d.l4Process.toLowerCase().includes(s) ||
        d.processCode.toLowerCase().includes(s) ||
        d.l4Owner.toLowerCase().includes(s) ||
        d.department.toLowerCase().includes(s)
      );
    }
    return result;
  }, [allData, selectedL1, selectedL2, selectedL3, selectedCategory, selectedFormat, selectedIt, searchText]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pagedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [selectedL1, selectedL2, selectedL3, selectedCategory, selectedFormat, selectedIt, searchText, pageSize]);

  // Tree data
  const treeData = useMemo(() => {
    const root: TreeNode[] = [];
    const l1Map = new Map<string, TreeNode>();
    const l2Map = new Map<string, TreeNode>();
    const l3Map = new Map<string, TreeNode>();

    for (const item of filteredData) {
      if (!l1Map.has(item.l1Domain)) {
        const node: TreeNode = { name: item.l1Domain, level: 1, owner: item.l1Owner, children: [], items: [] };
        l1Map.set(item.l1Domain, node);
        root.push(node);
      }
      const l2Key = `${item.l1Domain}||${item.l2Group}`;
      if (!l2Map.has(l2Key)) {
        const node: TreeNode = { name: item.l2Group, level: 2, owner: item.l2Owner, children: [], items: [] };
        l2Map.set(l2Key, node);
        l1Map.get(item.l1Domain)!.children.push(node);
      }
      const l3Key = `${l2Key}||${item.l3Segment}`;
      if (!l3Map.has(l3Key)) {
        const node: TreeNode = { name: item.l3Segment, level: 3, owner: item.l3Owner, children: [], items: [] };
        l3Map.set(l3Key, node);
        l2Map.get(l2Key)!.children.push(node);
      }
      l3Map.get(l3Key)!.items.push(item);
    }
    return root;
  }, [filteredData]);

  const toggleNode = (key: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Architecture CRUD handlers
  const levelToLabel = (n: number): 'L1' | 'L2' | 'L3' => `L${n}` as 'L1' | 'L2' | 'L3';

  const handleArchEdit = (level: number, name: string, owner: string, l1Name: string, l2Name: string) => {
    const l = levelToLabel(level);
    setArchEditForm({ level: l, oldName: name, newName: name, newOwner: owner, l1Name, l2Name });
    setArchEditOpen(true);
  };

  const handleArchEditSave = async () => {
    if (!archEditForm.newName.trim()) return;
    setArchSaving(true);
    try {
      const res = await fetch('/api/architecture', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(archEditForm),
      });
      if (res.ok) {
        setArchEditOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '修改失败');
      }
    } finally {
      setArchSaving(false);
    }
  };

  const handleArchDeleteClick = (level: number, name: string, l1Name: string, l2Name: string, count: number) => {
    const l = levelToLabel(level);
    setArchDeleteTarget({ level: l, name, l1Name, l2Name, count });
    setArchDeleteOpen(true);
  };

  const handleArchDeleteConfirm = async () => {
    if (!archDeleteTarget) return;
    setArchDeleting(true);
    try {
      const params = new URLSearchParams({ level: archDeleteTarget.level, name: archDeleteTarget.name });
      if (archDeleteTarget.l1Name) params.set('l1Name', archDeleteTarget.l1Name);
      if (archDeleteTarget.l2Name) params.set('l2Name', archDeleteTarget.l2Name);
      const res = await fetch(`/api/architecture?${params}`, { method: 'DELETE' });
      if (res.ok) {
        setArchDeleteOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } finally {
      setArchDeleting(false);
    }
  };

  const handleArchAddClick = (level: 'L1' | 'L2' | 'L3', l1Name: string, l2Name: string) => {
    setArchAddLevel(level);
    setArchAddName('');
    setArchAddOwner('');
    setArchAddL1Name(l1Name);
    setArchAddL2Name(l2Name);
    setArchAddOpen(true);
  };

  const handleArchAddSave = async () => {
    if (!archAddName.trim()) return;
    setArchAdding(true);
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          l1Domain: archAddLevel === 'L1' ? archAddName : archAddL1Name,
          l1Owner: archAddLevel === 'L1' ? archAddOwner : '',
          l2Group: archAddLevel === 'L2' ? archAddName : (archAddLevel === 'L1' ? '默认组' : archAddL2Name),
          l2Owner: archAddLevel === 'L2' ? archAddOwner : '',
          l3Segment: archAddLevel === 'L3' ? archAddName : '默认段',
          l3Owner: archAddLevel === 'L3' ? archAddOwner : '',
          l4Process: '待补充',
          processCode: '',
          department: '',
          version: '',
          format: '',
          category: '',
        }),
      });
      if (res.ok) {
        setArchAddOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '新增失败');
      }
    } finally {
      setArchAdding(false);
    }
  };

  // Count L4 items under a tree node recursively
  const countItems = (node: TreeNode): number => {
    if (node.level === 3) return node.items.length;
    return node.children.reduce((sum, child) => sum + countItems(child), 0);
  };

  // Handlers
  const handleExport = async () => {
    const res = await fetch('/api/flows/export');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '职能流程清单.xlsx'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreate = () => {
    setCurrentItem(null);
    setEditForm({ l1Domain: '', l1Owner: '', l2Group: '', l2Owner: '', l3Segment: '', l3Owner: '', processCode: '', l4Process: '', version: 'C1.0', department: '', l4Owner: '', format: '集团模板', category: '流程', itCoverage: '否', itSubCategory: '', itScore: 0, status: '试运行' });
    setEditDialog(true);
  };

  const handleEdit = (item: FlowItem) => {
    setCurrentItem(item);
    setEditForm({ ...item });
    setEditAction('edit');
    setReviseReason('');
    setReviseContent('');
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (currentItem) {
      if (editAction === 'abolish') {
        if (!reviseReason.trim()) { alert('请输入废止原因'); return; }
        await fetch(`/api/flows/${currentItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _action: 'abolish', reason: reviseReason }),
        });
      } else if (editAction === 'revise') {
        if (!reviseContent.trim()) { alert('请输入修订内容描述'); return; }
        await fetch(`/api/flows/${currentItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _action: 'upgrade', description: reviseContent }),
        });
      } else {
        await fetch(`/api/flows/${currentItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      }
    } else {
      await fetch('/api/flows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    }
    setEditDialog(false);
    fetchData();
  };

  const handleDelete = (item: FlowItem) => {
    setCurrentItem(item);
    setDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (currentItem) {
      await fetch(`/api/flows/${currentItem.id}`, { method: 'DELETE' });
      setDeleteDialog(false);
      fetchData();
    }
  };

  const handleRestore = async (item: FlowItem) => {
    if (!confirm(`确定要恢复运行「${item.l4Process}」吗？此操作将记录到修订记录中。`)) return;
    await fetch(`/api/flows/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'restore', reason: '恢复运行，原废止流程恢复为正式运行' }),
    });
    fetchData();
  };

  const handleReinitialize = async () => {
    if (reinitConfirmText !== '数据初始化') return;
    if (!reinitFile) { alert('请选择要导入的Excel文件'); return; }
    setReinitLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', reinitFile);
      const res = await fetch('/api/flows/reinitialize', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('初始化失败');
      setShowReinitDialog(false);
      setReinitConfirmText('');
      setReinitFile(null);
      fetchData();
    } catch {
      alert('数据初始化失败，请检查文件格式');
    } finally {
      setReinitLoading(false);
    }
  };

  const statusBadge = (val: string) => {
    if (val === '正式运行') return <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0">{val}</Badge>;
    if (val === '试运行') return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0">{val}</Badge>;
    if (val === '已废止') return <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0">{val}</Badge>;
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{val || '-'}</Badge>;
  };

  const formatBadge = (val: string) => {
    if (val === '集团模板') return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] px-1.5 py-0">{val}</Badge>;
    if (val === '旧格式') return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">{val}</Badge>;
    return <span className="text-gray-300 text-xs">-</span>;
  };

  const categoryBadge = (val: string) => {
    if (val === '流程') return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] px-1.5 py-0">{val}</Badge>;
    if (val === '办法') return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">{val}</Badge>;
    if (val === '其它') return <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] px-1.5 py-0">{val}</Badge>;
    return <span className="text-gray-300 text-xs">-</span>;
  };

  const itBadge = (val: string) => {
    if (val === '是' || val === '已覆盖') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">是</Badge>;
    if (val === '否' || val === '未覆盖') return <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] px-1.5 py-0">否</Badge>;
    return <span className="text-gray-300 text-xs">-</span>;
  };

  const itScoreDisplay = (score: number, itCoverage: string) => {
    if (itCoverage !== '是' && itCoverage !== '已覆盖') return <span className="text-gray-300 text-xs">-</span>;
    return <span className="text-xs font-mono">{score}</span>;
  };

  /* ========== Row Detail Hover Card ========== */
  const detailFields = [
    { label: 'L1业务域', key: 'l1Domain' as const },
    { label: 'L1流程所有者', key: 'l1Owner' as const },
    { label: 'L2业务组', key: 'l2Group' as const },
    { label: 'L2流程所有者', key: 'l2Owner' as const },
    { label: 'L3业务段', key: 'l3Segment' as const },
    { label: 'L3流程所有者', key: 'l3Owner' as const },
    { label: '流程编码', key: 'processCode' as const },
    { label: 'L4职能流程', key: 'l4Process' as const },
    { label: '最新版本号', key: 'version' as const },
    { label: '流程所属部门', key: 'department' as const },
    { label: 'L4流程所有者', key: 'l4Owner' as const },
    { label: '格式', key: 'format' as const },
    { label: '分类', key: 'category' as const },
    { label: '是否IT覆盖', key: 'itCoverage' as const },
    { label: 'IT支撑分类', key: 'itSubCategory' as const },
    { label: 'IT支撑分', key: 'itScore' as const },
    { label: '状态', key: 'status' as const },
  ];

  const levelConfig: Record<number, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
    1: { icon: <LevelIcon level={1} className="shrink-0" />, color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-l-blue-400' },
    2: { icon: <LevelIcon level={2} className="shrink-0" />, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-l-indigo-300' },
    3: { icon: <LevelIcon level={3} className="shrink-0" />, color: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-l-violet-300' },
  };

  const renderTreeNode = (node: TreeNode, parentKey: string = '', parentL1Name: string = '', parentL2Name: string = '') => {
    const key = `${parentKey}||${node.name}`;
    const isExpanded = expandedNodes.has(key);
    const count = countItems(node);
    const cfg = levelConfig[node.level] || levelConfig[3];
    const l1Name = node.level === 1 ? node.name : parentL1Name;
    const l2Name = node.level === 2 ? node.name : parentL2Name;

    return (
      <div key={key}>
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 border-l-3 ${cfg.borderColor} ${isExpanded ? cfg.bgColor : ''}`}
          style={{ paddingLeft: `${node.level * 20 + 12}px` }}
          onClick={() => toggleNode(key)}
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
          <span className={`${cfg.color} shrink-0`}>{cfg.icon}</span>
          <span className={`font-medium ${cfg.color} truncate`}>{node.name}</span>
          {node.owner && <span className="text-gray-400 text-xs ml-1 shrink-0">({node.owner})</span>}
          <span className={`ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color} font-medium`}>{count}</span>
          {editMode && can('edit_toggle') && (
            <button onClick={e => { e.stopPropagation(); handleArchEdit(node.level, node.name, node.owner, l1Name, l2Name); }} className="p-0.5 rounded hover:bg-gray-200/50 text-gray-400 hover:text-[#1e3a5f] shrink-0">
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {editMode && can('edit_toggle') && (
            <button onClick={e => { e.stopPropagation(); handleArchDeleteClick(node.level, node.name, l1Name, l2Name, count); }} className="p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        {isExpanded && node.children.map(child => renderTreeNode(child, key, l1Name, l2Name))}
        {isExpanded && node.level === 3 && node.items.map(item => (
          <div key={item.id} className="flex items-center gap-2 py-1.5 px-3 text-xs border-b border-gray-50 border-l-3 border-l-gray-200 bg-white/50" style={{ paddingLeft: `${4 * 20 + 12}px` }}>
            <LevelIcon level={4} className="shrink-0" />
            <span className="font-mono text-gray-400 shrink-0">{item.processCode}</span>
            <span className="text-gray-700 truncate">{item.l4Process}</span>
            <span className="text-gray-400 ml-1 shrink-0">{item.version}</span>
            <span className="ml-auto flex items-center gap-1.5 shrink-0">
              {formatBadge(item.format)}
              {categoryBadge(item.category)}
              {statusBadge(item.status)}
            </span>
          </div>
        ))}
        {isExpanded && editMode && can('edit_toggle') && node.level === 2 && (
          <div style={{ paddingLeft: `${3 * 20 + 12}px` }}>
            <button onClick={() => handleArchAddClick('L3', l1Name, l2Name)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded transition-colors">
              <Plus className="h-3 w-3" />添加L3业务段
            </button>
          </div>
        )}
        {isExpanded && editMode && can('edit_toggle') && node.level === 1 && (
          <div style={{ paddingLeft: `${2 * 20 + 12}px` }}>
            <button onClick={() => handleArchAddClick('L2', l1Name, '')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded transition-colors">
              <Plus className="h-3 w-3" />添加L2业务组
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  }

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'table' | 'tree')}>
            <TabsList className="h-8">
              <TabsTrigger value="table" className="text-xs px-3 h-6">表格视图</TabsTrigger>
              <TabsTrigger value="tree" className="text-xs px-3 h-6">树形视图</TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="text-sm text-gray-500">共 {filteredData.length} 条</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 编辑开关 */}
          {can('edit_toggle') && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-gray-50">
              {editMode ? <LockOpen className="h-3.5 w-3.5 text-green-600" /> : <Lock className="h-3.5 w-3.5 text-gray-400" />}
              <span className="text-xs text-gray-600">编辑</span>
              <Switch checked={editMode} onCheckedChange={setEditMode} className="h-4 w-7 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300" />
            </div>
          )}
          {can('export') && (
            <Button onClick={handleExport} variant="outline" size="sm" className="h-7 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" /> 导出
            </Button>
          )}
          {can('init') && (
            <Button onClick={() => setShowReinitDialog(true)} variant="outline" size="sm" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50">
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> 数据初始化
            </Button>
          )}
          {can('add') && editMode && (
            <Button onClick={handleCreate} size="sm" className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#2d4f7a]">
              <Plus className="h-3.5 w-3.5 mr-1" /> 新增
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <MultiSelectFilter label="L1业务域" options={l1Options} selected={selectedL1} onChange={v => { setSelectedL1(v); setSelectedL2([]); setSelectedL3([]); }} />
            <MultiSelectFilter label="L2业务组" options={l2Options} selected={selectedL2} onChange={v => { setSelectedL2(v); setSelectedL3([]); }} />
            <MultiSelectFilter label="L3业务段" options={l3Options} selected={selectedL3} onChange={setSelectedL3} />
            <MultiSelectFilter label="分类" options={categoryOptions} selected={selectedCategory} onChange={setSelectedCategory} />
            <MultiSelectFilter label="格式" options={formatOptions} selected={selectedFormat} onChange={setSelectedFormat} />
            <MultiSelectFilter label="IT覆盖" options={itOptions} selected={selectedIt} onChange={setSelectedIt} />
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="搜索流程名/编码/所有者" value={searchText} onChange={e => setSearchText(e.target.value)} className="h-7 text-xs pl-7" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[70vh]">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky left-0 top-0 bg-gray-50 z-20">序号</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap sticky top-0 bg-gray-50 z-10">L1业务域</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap sticky top-0 bg-gray-50 z-10">L2业务组</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap sticky top-0 bg-gray-50 z-10">L3业务段</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap sticky top-0 bg-gray-50 z-10">流程编码</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap sticky top-0 bg-gray-50 z-10">L4职能流程</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky top-0 bg-gray-50 z-10">版本</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap sticky top-0 bg-gray-50 z-10">L4所有者</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky top-0 bg-gray-50 z-10">格式</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky top-0 bg-gray-50 z-10">分类</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky top-0 bg-gray-50 z-10">IT覆盖</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky top-0 bg-gray-50 z-10">IT支撑分</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky right-[80px] top-0 bg-gray-50 z-20">状态</TableHead>
                    {(can('edit') || can('delete')) && (
                      <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky right-0 top-0 bg-gray-50 z-20">操作</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-12 text-gray-400">暂无数据</TableCell>
                    </TableRow>
                  ) : (
                    pagedData.map((item, idx) => (
                          <TableRow key={item.id} className={`cursor-pointer hover:bg-blue-50/50 ${item.status === '已废止' ? 'opacity-50' : ''}`} onClick={() => { setDetailItem(item); setDetailDialog(true); }}>
                            <TableCell className="text-gray-400 text-center sticky left-0 bg-white z-10">{(page - 1) * pageSize + idx + 1}</TableCell>
                            <TableCell><TruncateDiv content={item.l1Domain} maxWidth="100px" /></TableCell>
                            <TableCell><TruncateDiv content={item.l2Group} maxWidth="100px" /></TableCell>
                            <TableCell><TruncateDiv content={item.l3Segment} maxWidth="100px" /></TableCell>
                            <TableCell><TruncateDiv content={item.processCode} maxWidth="120px" className="font-mono text-gray-500" /></TableCell>
                            <TableCell><TruncateDiv content={item.l4Process} maxWidth="150px" className="font-medium" /></TableCell>
                            <TableCell className="text-center font-mono">{item.version}</TableCell>
                            <TableCell><TruncateDiv content={item.l4Owner} maxWidth="60px" /></TableCell>
                            <TableCell className="text-center">{formatBadge(item.format)}</TableCell>
                            <TableCell className="text-center">{categoryBadge(item.category)}</TableCell>
                            <TableCell className="text-center">{itBadge(item.itCoverage)}</TableCell>
                            <TableCell className="text-center">{itScoreDisplay(item.itScore, item.itCoverage)}</TableCell>
                            <TableCell className="text-center sticky right-[80px] bg-white z-10">{statusBadge(item.status)}</TableCell>
                            <TableCell className="text-center sticky right-0 bg-white z-10">
                              <div className="flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                                {editMode && can('edit_toggle') && item.status === '已废止' && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="恢复运行" onClick={() => handleRestore(item)}>
                                    <Undo2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {editMode && can('edit_toggle') && item.status !== '已废止' && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="编辑" onClick={() => handleEdit(item)}>
                                    <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                  </Button>
                                )}
                                {editMode && can('edit_toggle') && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="删除" onClick={() => handleDelete(item)}>
                                    <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tree View */}
      {viewMode === 'tree' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">职能流程层级结构</CardTitle>
              {editMode && can('edit_toggle') && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleArchAddClick('L1', '', '')}>
                  <Plus className="h-3.5 w-3.5 mr-1" />添加L1业务域
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto">
              {treeData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
              ) : (
                treeData.map(node => renderTreeNode(node))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {viewMode === 'table' && totalPages > 0 && (
        <PaginationBar
          page={page} totalPages={totalPages} total={filteredData.length}
          pageSize={pageSize} pageSizeOptions={pageSizeOptions}
          onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentItem ? '编辑流程' : '新增流程'}</DialogTitle>
          </DialogHeader>
          {currentItem && (
            <div className="space-y-3">
              {/* Action type selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">操作类型</label>
                <div className="flex gap-2">
                  <Button
                    variant={editAction === 'edit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditAction('edit')}
                    className={editAction === 'edit' ? 'bg-[#1e3a5f] hover:bg-[#2d4f7a]' : ''}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> 编辑信息
                  </Button>
                  <Button
                    variant={editAction === 'revise' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditAction('revise')}
                    className={editAction === 'revise' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1" /> 流程修订
                  </Button>
                  <Button
                    variant={editAction === 'abolish' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditAction('abolish')}
                    className={editAction === 'abolish' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> 流程废止
                  </Button>
                </div>
              </div>
              {/* Action hint */}
              {editAction === 'edit' && (
                <div className="p-2 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-700">
                  编辑信息：仅修改流程基本信息，不会产生修订记录
                </div>
              )}
              {editAction === 'revise' && (
                <div className="p-2 bg-amber-50 border border-amber-100 rounded-md text-xs text-amber-700">
                  流程修订：修改流程并升级版本号，系统将自动生成修订记录
                </div>
              )}
              {editAction === 'abolish' && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-md text-xs text-red-700">
                  流程废止：将流程状态标记为已废止，系统将自动生成修订记录
                </div>
              )}
            </div>
          )}
          {(!currentItem || editAction === 'edit') && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L1业务域</label>
              <Select value={editForm.l1Domain || ''} onValueChange={v => {
                const owner = allData.find(d => d.l1Domain === v)?.l1Owner || '';
                setEditForm(f => ({ ...f, l1Domain: v, l1Owner: owner || f.l1Owner, l2Group: '', l2Owner: '', l3Segment: '', l3Owner: '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="选择L1业务域" /></SelectTrigger>
                <SelectContent>
                  {l1EditOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L1流程所有者</label>
              <Input value={editForm.l1Owner || ''} onChange={e => setEditForm(f => ({ ...f, l1Owner: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L2业务组</label>
              <Select value={editForm.l2Group || ''} onValueChange={v => {
                const base = editForm.l1Domain ? allData.filter(d => d.l1Domain === editForm.l1Domain) : allData;
                const owner = base.find(d => d.l2Group === v)?.l2Owner || '';
                setEditForm(f => ({ ...f, l2Group: v, l2Owner: owner || f.l2Owner, l3Segment: '', l3Owner: '' }));
              }}>
                <SelectTrigger><SelectValue placeholder={editForm.l1Domain ? '选择L2业务组' : '请先选择L1业务域'} /></SelectTrigger>
                <SelectContent>
                  {l2EditOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L2流程所有者</label>
              <Input value={editForm.l2Owner || ''} onChange={e => setEditForm(f => ({ ...f, l2Owner: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L3业务段</label>
              <Select value={editForm.l3Segment || ''} onValueChange={v => {
                const base = allData.filter(d => d.l1Domain === editForm.l1Domain && d.l2Group === editForm.l2Group);
                const owner = base.find(d => d.l3Segment === v)?.l3Owner || '';
                setEditForm(f => ({ ...f, l3Segment: v, l3Owner: owner || f.l3Owner }));
              }}>
                <SelectTrigger><SelectValue placeholder={editForm.l2Group ? '选择L3业务段' : '请先选择L2业务组'} /></SelectTrigger>
                <SelectContent>
                  {l3EditOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L3流程所有者</label>
              <Input value={editForm.l3Owner || ''} onChange={e => setEditForm(f => ({ ...f, l3Owner: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">流程编码</label>
              <Input value={editForm.processCode || ''} onChange={e => setEditForm(f => ({ ...f, processCode: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L4职能流程</label>
              <Input value={editForm.l4Process || ''} onChange={e => setEditForm(f => ({ ...f, l4Process: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">最新版本号</label>
              <Input value={editForm.version || ''} onChange={e => setEditForm(f => ({ ...f, version: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L4流程所有者</label>
              <Input value={editForm.l4Owner || ''} onChange={e => setEditForm(f => ({ ...f, l4Owner: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">流程所属部门</label>
              <Input value={editForm.department || ''} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">格式</label>
              <Select value={editForm.format || ''} onValueChange={v => setEditForm(f => ({ ...f, format: v }))}>
                <SelectTrigger><SelectValue placeholder="选择格式" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="集团模板">集团模板</SelectItem>
                  <SelectItem value="旧格式">旧格式</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">分类</label>
              <Select value={editForm.category || ''} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="流程">流程</SelectItem>
                  <SelectItem value="办法">办法</SelectItem>
                  <SelectItem value="其它">其它</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">是否IT覆盖</label>
              <Select value={editForm.itCoverage || ''} onValueChange={v => setEditForm(f => ({ ...f, itCoverage: v, itScore: (v === '是' || v === '已覆盖') ? f.itScore : 0 }))}>
                <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="是">是</SelectItem>
                  <SelectItem value="否">否</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">IT支撑分(0-5)</label>
              {(editForm.itCoverage === '是' || editForm.itCoverage === '已覆盖') ? (
                <Select value={String(editForm.itScore ?? 0)} onValueChange={v => setEditForm(f => ({ ...f, itScore: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="选择分数" /></SelectTrigger>
                  <SelectContent>
                    {[0,1,2,3,4,5].map(s => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-muted-foreground">-</div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">状态</label>
              <Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="正式运行">正式运行</SelectItem>
                  <SelectItem value="试运行">试运行</SelectItem>
                  <SelectItem value="已废止">已废止</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          )}
          {currentItem && editAction === 'revise' && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-medium">{currentItem.l4Process}</div>
                <div className="text-gray-500 mt-1">编码: {currentItem.processCode} | 当前版本: {currentItem.version}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">修订内容描述 <span className="text-red-500">*</span></label>
                <Textarea
                  placeholder="请描述本次修订的内容..."
                  value={reviseContent}
                  onChange={e => setReviseContent(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          {currentItem && editAction === 'abolish' && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-medium">{currentItem.l4Process}</div>
                <div className="text-gray-500 mt-1">编码: {currentItem.processCode} | 当前版本: {currentItem.version}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">废止原因 <span className="text-red-500">*</span></label>
                <Textarea
                  placeholder="请输入废止原因..."
                  value={reviseReason}
                  onChange={e => setReviseReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>取消</Button>
            <Button
              onClick={handleSave}
              className={editAction === 'abolish' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e3a5f] hover:bg-[#2d4f7a]'}
              disabled={editAction === 'revise' ? !reviseContent.trim() : editAction === 'abolish' ? !reviseReason.trim() : false}
            >
              {editAction === 'abolish' ? '确认废止' : editAction === 'revise' ? '确认修订' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-gray-600">
            确定要删除流程「{currentItem?.l4Process}」吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>删除</Button>
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
              此操作将<strong className="text-red-600">清空所有现有流程清单数据</strong>并重新导入，此操作不可撤销！
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

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="sm:max-w-lg p-0 gap-0">
          <DialogHeader className="px-5 py-3 bg-[#1e3a5f] text-white rounded-t-lg">
            <DialogTitle className="text-white text-base font-semibold truncate">
              {detailItem?.l4Process || '(未命名流程)'}
            </DialogTitle>
            <DialogDescription className="text-blue-200 text-xs font-mono mt-0.5">
              {detailItem?.processCode || '-'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {detailFields.map(f => {
                const val = detailItem ? (f.key === 'itScore' ? String(detailItem[f.key]) : detailItem[f.key as keyof FlowItem] as string) : '';
                const isEmpty = !val && val !== '0';
                return (
                  <div key={f.key} className="flex items-start gap-2">
                    <span className="text-gray-400 shrink-0 min-w-[80px] text-right">{f.label}</span>
                    <span className="text-gray-300 shrink-0">:</span>
                    <span className={isEmpty ? 'text-gray-300' : 'text-gray-700 font-medium'}>
                      {isEmpty ? '-' : val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Architecture Edit Dialog */}
      <Dialog open={archEditOpen} onOpenChange={setArchEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑{archEditForm.level} - {archEditForm.oldName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{archEditForm.level}名称</Label>
              <Input value={archEditForm.newName} onChange={e => setArchEditForm(f => ({ ...f, newName: e.target.value }))} placeholder="请输入名称" />
            </div>
            <div className="space-y-2">
              <Label>{archEditForm.level}所有者</Label>
              <Input value={archEditForm.newOwner} onChange={e => setArchEditForm(f => ({ ...f, newOwner: e.target.value }))} placeholder="请输入所有者" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchEditOpen(false)}>取消</Button>
            <Button onClick={handleArchEditSave} disabled={archSaving || !archEditForm.newName.trim()} className="bg-[#1e3a5f] hover:bg-[#163050]">
              {archSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Architecture Delete Dialog */}
      <AlertDialog open={archDeleteOpen} onOpenChange={setArchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除{archDeleteTarget?.level}「{archDeleteTarget?.name}」吗？
              此操作将同时删除该层级下所有 {archDeleteTarget?.count} 个L4流程数据，且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchDeleteConfirm} disabled={archDeleting} className="bg-red-600 hover:bg-red-700">
              {archDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Architecture Add Dialog */}
      <Dialog open={archAddOpen} onOpenChange={setArchAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增{archAddLevel}层级</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{archAddLevel}名称</Label>
              <Input value={archAddName} onChange={e => setArchAddName(e.target.value)} placeholder={`请输入${archAddLevel}名称`} />
            </div>
            <div className="space-y-2">
              <Label>{archAddLevel}所有者</Label>
              <Input value={archAddOwner} onChange={e => setArchAddOwner(e.target.value)} placeholder="请输入所有者" />
            </div>
            <p className="text-xs text-gray-400">
              新增后将在此层级下创建一条占位流程记录，可在流程清单中进一步编辑。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchAddOpen(false)}>取消</Button>
            <Button onClick={handleArchAddSave} disabled={archAdding || !archAddName.trim()} className="bg-[#1e3a5f] hover:bg-[#163050]">
              {archAdding ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      </TooltipProvider>
  );
}
