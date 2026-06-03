'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Download, Upload, Plus, Pencil, Trash2, ChevronDown, ChevronRight, FolderOpen, Folder, FileText, RotateCw, XCircle } from 'lucide-react';

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
  key: string;
  label: string;
  level: string;
  owner?: string;
  children: TreeNode[];
  items?: FlowItem[];
}

export default function FunctionalListPage() {
  const [allData, setAllData] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const pageSizeOptions = [20, 50, 100];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterL1, setFilterL1] = useState('all');
  const [filterL2, setFilterL2] = useState('all');
  const [filterL3, setFilterL3] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterIT, setFilterIT] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState<FlowItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<FlowItem>>({});

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false);

  // Revise dialog
  const [reviseDialog, setReviseDialog] = useState(false);
  const [reviseItem, setReviseItem] = useState<FlowItem | null>(null);
  const [reviseType, setReviseType] = useState<'abolish' | 'upgrade'>('upgrade');
  const [reviseReason, setReviseReason] = useState('');
  const [reviseContent, setReviseContent] = useState('');

  // Tree
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      const res = await fetch('/api/flows?page=1&pageSize=10000');
      const data = await res.json();
      setAllData(data.items || []);
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Options
  const l1Options = useMemo(() => [...new Set(allData.map(d => d.l1Domain).filter(Boolean))], [allData]);
  const l2Options = useMemo(() => {
    let filtered = allData;
    if (filterL1 !== 'all') filtered = filtered.filter(d => d.l1Domain === filterL1);
    return [...new Set(filtered.map(d => d.l2Group).filter(Boolean))];
  }, [allData, filterL1]);
  const l3Options = useMemo(() => {
    let filtered = allData;
    if (filterL1 !== 'all') filtered = filtered.filter(d => d.l1Domain === filterL1);
    if (filterL2 !== 'all') filtered = filtered.filter(d => d.l2Group === filterL2);
    return [...new Set(filtered.map(d => d.l3Segment).filter(Boolean))];
  }, [allData, filterL1, filterL2]);
  const categoryOptions = useMemo(() => [...new Set(allData.map(d => d.category).filter(Boolean))], [allData]);
  const formatOptions = useMemo(() => [...new Set(allData.map(d => d.format).filter(Boolean))], [allData]);
  const itOptions = useMemo(() => [...new Set(allData.map(d => d.itCoverage).filter(Boolean))], [allData]);
  const statusOptions = useMemo(() => [...new Set(allData.map(d => d.status).filter(Boolean))], [allData]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = allData.filter(d => d.l4Process);
    if (filterL1 !== 'all') result = result.filter(d => d.l1Domain === filterL1);
    if (filterL2 !== 'all') result = result.filter(d => d.l2Group === filterL2);
    if (filterL3 !== 'all') result = result.filter(d => d.l3Segment === filterL3);
    if (filterCategory !== 'all') result = result.filter(d => d.category === filterCategory);
    if (filterFormat !== 'all') result = result.filter(d => d.format === filterFormat);
    if (filterIT !== 'all') result = result.filter(d => d.itCoverage === filterIT);
    if (filterStatus !== 'all') result = result.filter(d => d.status === filterStatus);
    if (searchText) {
      const s = searchText.toLowerCase();
      result = result.filter(d =>
        d.l4Process.toLowerCase().includes(s) ||
        d.processCode.toLowerCase().includes(s) ||
        d.l4Owner.toLowerCase().includes(s)
      );
    }
    return result;
  }, [allData, filterL1, filterL2, filterL3, filterCategory, filterFormat, filterIT, filterStatus, searchText]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pagedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [filterL1, filterL2, filterL3, filterCategory, filterFormat, filterIT, filterStatus, searchText]);
  useEffect(() => { setFilterL2('all'); setFilterL3('all'); }, [filterL1]);
  useEffect(() => { setFilterL3('all'); }, [filterL2]);

  // Build tree data
  const treeData = useMemo(() => {
    const l4Data = allData.filter(d => d.l4Process);
    let filtered = l4Data;
    if (filterL1 !== 'all') filtered = filtered.filter(d => d.l1Domain === filterL1);
    if (filterCategory !== 'all') filtered = filtered.filter(d => d.category === filterCategory);
    if (filterFormat !== 'all') filtered = filtered.filter(d => d.format === filterFormat);
    if (filterIT !== 'all') filtered = filtered.filter(d => d.itCoverage === filterIT);
    if (filterStatus !== 'all') filtered = filtered.filter(d => d.status === filterStatus);
    if (searchText) {
      const s = searchText.toLowerCase();
      filtered = filtered.filter(d =>
        d.l4Process.toLowerCase().includes(s) ||
        d.processCode.toLowerCase().includes(s)
      );
    }

    const tree: TreeNode[] = [];
    const l1Map = new Map<string, TreeNode>();
    const l2Map = new Map<string, TreeNode>();
    const l3Map = new Map<string, TreeNode>();

    for (const item of filtered) {
      const l1Key = `L1-${item.l1Domain}`;
      if (!l1Map.has(l1Key)) {
        const node: TreeNode = { key: l1Key, label: item.l1Domain, level: 'L1', owner: item.l1Owner, children: [] };
        l1Map.set(l1Key, node);
        tree.push(node);
      }
      const l2Key = `L2-${item.l1Domain}-${item.l2Group}`;
      if (!l2Map.has(l2Key)) {
        const node: TreeNode = { key: l2Key, label: item.l2Group, level: 'L2', owner: item.l2Owner, children: [] };
        l2Map.set(l2Key, node);
        l1Map.get(l1Key)!.children.push(node);
      }
      const l3Key = `L3-${item.l1Domain}-${item.l2Group}-${item.l3Segment}`;
      if (!l3Map.has(l3Key)) {
        const node: TreeNode = { key: l3Key, label: item.l3Segment, level: 'L3', owner: item.l3Owner, children: [] };
        l3Map.set(l3Key, node);
        l2Map.get(l2Key)!.children.push(node);
      }
      const l4Key = `L4-${item.id}`;
      const l4Node: TreeNode = {
        key: l4Key,
        label: item.l4Process,
        level: 'L4',
        owner: item.l4Owner,
        children: [],
        items: [item],
      };
      l3Map.get(l3Key)!.children.push(l4Node);
    }
    return tree;
  }, [allData, filterL1, filterCategory, filterFormat, filterIT, filterStatus, searchText]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // CRUD handlers
  const handleCreate = () => {
    setCurrentItem(null);
    setEditForm({
      l1Domain: filterL1 !== 'all' ? filterL1 : '',
      l2Group: filterL2 !== 'all' ? filterL2 : '',
      l3Segment: filterL3 !== 'all' ? filterL3 : '',
      format: '集团模板',
      category: '流程',
      status: '试运行',
    });
    setEditDialog(true);
  };

  const handleEdit = (item: FlowItem) => {
    setCurrentItem(item);
    setEditForm({ ...item });
    setEditDialog(true);
  };

  const handleDelete = (item: FlowItem) => {
    setCurrentItem(item);
    setDeleteDialog(true);
  };

  const handleSave = async () => {
    try {
      if (currentItem) {
        await fetch(`/api/flows/${currentItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      } else {
        // Create - also creates a revision record
        await fetch('/api/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      }
      setEditDialog(false);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentItem) return;
    try {
      await fetch(`/api/flows/${currentItem.id}`, { method: 'DELETE' });
      setDeleteDialog(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Revise handler
  const handleRevise = (item: FlowItem) => {
    setReviseItem(item);
    setReviseType('upgrade');
    setReviseReason('');
    setReviseContent('');
    setReviseDialog(true);
  };

  const handleConfirmRevise = async () => {
    if (!reviseItem) return;
    try {
      await fetch(`/api/flows/${reviseItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _action: reviseType,
          reason: reviseReason,
          content: reviseContent,
        }),
      });
      setReviseDialog(false);
      fetchData();
    } catch (err) {
      console.error('Revise failed:', err);
    }
  };

  // Export handler
  const handleExport = async () => {
    try {
      const res = await fetch('/api/flows/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'L1-L4流程文件清单.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Import handler
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/flows/import', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        alert(`导入成功！共导入 ${result.imported} 条数据`);
        fetchData();
      } else {
        alert(`导入失败：${result.error}`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('导入失败，请检查文件格式');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Render tree node
  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedKeys.has(node.key);
    const hasChildren = node.children.length > 0;
    const levelColors: Record<string, string> = {
      L1: 'text-[#1e3a5f] font-semibold',
      L2: 'text-[#334155] font-medium',
      L3: 'text-[#475569]',
      L4: 'text-[#64748b]',
    };
    const levelIcons: Record<string, typeof FolderOpen> = {
      L1: FolderOpen,
      L2: Folder,
      L3: Folder,
      L4: FileText,
    };
    const IconComp = levelIcons[node.level];

    return (
      <div key={node.key}>
        <div
          className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-gray-50 cursor-pointer rounded text-sm"
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
          onClick={() => hasChildren && toggleExpand(node.key)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <IconComp className={`h-4 w-4 shrink-0 ${node.level === 'L4' ? 'text-blue-400' : 'text-amber-500'}`} />
          <span className={levelColors[node.level]}>{node.label}</span>
          {node.owner && <span className="text-xs text-gray-400 ml-2">({node.owner})</span>}
          {node.level === 'L4' && node.items?.[0] && (
            <span className="ml-auto flex items-center gap-2">
              {statusBadge(node.items[0].status)}
              <Badge variant="outline" className="text-xs">{node.items[0].category}</Badge>
              <Badge variant="secondary" className="text-xs">{node.items[0].version}</Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleEdit(node.items![0]); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleRevise(node.items![0]); }}>
                <RotateCw className="h-3 w-3 text-amber-600" />
              </Button>
            </span>
          )}
          {hasChildren && node.level !== 'L4' && (
            <span className="ml-auto text-xs text-gray-400">{node.children.length}</span>
          )}
        </div>
        {hasChildren && isExpanded && node.children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  const formatBadge = (val: string) => {
    if (val === '集团模板') return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{val}</Badge>;
    if (val === '旧格式') return <Badge className="bg-amber-50 text-amber-700 border-amber-200">{val}</Badge>;
    return <Badge variant="outline">{val || '-'}</Badge>;
  };

  const categoryBadge = (val: string) => {
    if (val === '流程') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{val}</Badge>;
    if (val === '办法') return <Badge className="bg-purple-50 text-purple-700 border-purple-200">{val}</Badge>;
    if (val === '其它') return <Badge className="bg-gray-50 text-gray-700 border-gray-200">{val}</Badge>;
    return <Badge variant="outline">{val || '-'}</Badge>;
  };

  const itBadge = (val: string) => {
    if (val === '是') return <Badge className="bg-green-50 text-green-700 border-green-200">已覆盖</Badge>;
    if (val === '否') return <Badge className="bg-red-50 text-red-700 border-red-200">未覆盖</Badge>;
    return <Badge variant="outline">{val || '-'}</Badge>;
  };

  const statusBadge = (val: string) => {
    if (val === '正式运行') return <Badge className="bg-green-50 text-green-700 border-green-200">{val}</Badge>;
    if (val === '试运行') return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{val}</Badge>;
    if (val === '已废止') return <Badge className="bg-red-50 text-red-700 border-red-200">{val}</Badge>;
    return <span className="text-gray-300">-</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={() => setViewMode('table')} variant={viewMode === 'table' ? 'default' : 'outline'} size="sm">
            表格视图
          </Button>
          <Button onClick={() => setViewMode('tree')} variant={viewMode === 'tree' ? 'default' : 'outline'} size="sm">
            树形视图
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate} size="sm" className="bg-[#1e3a5f] hover:bg-[#2d4f7a]">
            <Plus className="h-4 w-4 mr-1" /> 新增
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> 导出
          </Button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" /> 导入
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <Select value={filterL1} onValueChange={setFilterL1}>
              <SelectTrigger><SelectValue placeholder="L1业务域" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部业务域</SelectItem>
                {l1Options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterL2} onValueChange={setFilterL2}>
              <SelectTrigger><SelectValue placeholder="L2业务组" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部业务组</SelectItem>
                {l2Options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterL3} onValueChange={setFilterL3}>
              <SelectTrigger><SelectValue placeholder="L3业务段" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部业务段</SelectItem>
                {l3Options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue placeholder="分类" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categoryOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterFormat} onValueChange={setFilterFormat}>
              <SelectTrigger><SelectValue placeholder="格式" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部格式</SelectItem>
                {formatOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterIT} onValueChange={setFilterIT}>
              <SelectTrigger><SelectValue placeholder="IT覆盖" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {itOptions.map(o => <SelectItem key={o} value={o}>{o === '是' ? '已覆盖' : o === '否' ? '未覆盖' : o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {statusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="搜索流程名/编码/所有者" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-gray-500">共 {filteredData.length} 条记录</div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">序号</TableHead>
                  <TableHead>L1业务域</TableHead>
                  <TableHead>L2业务组</TableHead>
                  <TableHead>L3业务段</TableHead>
                  <TableHead>流程编码</TableHead>
                  <TableHead>L4职能流程</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>L4所有者</TableHead>
                  <TableHead>格式</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>IT覆盖</TableHead>
                  <TableHead>IT支撑分</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-28">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedData.map((item, idx) => (
                  <TableRow key={item.id} className={item.status === '已废止' ? 'opacity-50' : ''}>
                    <TableCell className="text-gray-400 text-xs">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell className="text-xs">{item.l1Domain}</TableCell>
                    <TableCell className="text-xs">{item.l2Group}</TableCell>
                    <TableCell className="text-xs">{item.l3Segment}</TableCell>
                    <TableCell className="text-xs font-mono">{item.processCode}</TableCell>
                    <TableCell className="text-xs font-medium">{item.l4Process}</TableCell>
                    <TableCell className="text-xs font-mono">{item.version}</TableCell>
                    <TableCell className="text-xs">{item.l4Owner}</TableCell>
                    <TableCell className="text-xs">{formatBadge(item.format)}</TableCell>
                    <TableCell className="text-xs">{categoryBadge(item.category)}</TableCell>
                    <TableCell className="text-xs">{itBadge(item.itCoverage)}</TableCell>
                    <TableCell className="text-xs font-mono">{(item.itCoverage === '是' || item.itCoverage === '已覆盖') ? (item.itScore ?? 0) : '-'}</TableCell>
                    <TableCell className="text-xs">{statusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="编辑" onClick={() => handleEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {item.status !== '已废止' && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="修订" onClick={() => handleRevise(item)}>
                            <RotateCw className="h-3 w-3 text-amber-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" title="删除" onClick={() => handleDelete(item)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tree View */}
      {viewMode === 'tree' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">职能流程层级结构</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto">
              {treeData.map(node => renderTreeNode(node))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {viewMode === 'table' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              第 {page} / {totalPages} 页，共 {filteredData.length} 条
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-500">每页</span>
              <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-[72px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(s => (
                    <SelectItem key={s} value={String(s)}>{s}条</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentItem ? '编辑流程' : '新增流程'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L1业务域</label>
              <Input value={editForm.l1Domain || ''} onChange={e => setEditForm(f => ({ ...f, l1Domain: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L1流程所有者</label>
              <Input value={editForm.l1Owner || ''} onChange={e => setEditForm(f => ({ ...f, l1Owner: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L2业务组</label>
              <Input value={editForm.l2Group || ''} onChange={e => setEditForm(f => ({ ...f, l2Group: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L2流程所有者</label>
              <Input value={editForm.l2Owner || ''} onChange={e => setEditForm(f => ({ ...f, l2Owner: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">L3业务段</label>
              <Input value={editForm.l3Segment || ''} onChange={e => setEditForm(f => ({ ...f, l3Segment: e.target.value }))} />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>取消</Button>
            <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]">保存</Button>
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

      {/* Revise Dialog */}
      <Dialog open={reviseDialog} onOpenChange={setReviseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>流程修订操作</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="font-medium">{reviseItem?.l4Process}</div>
              <div className="text-gray-500 mt-1">编码: {reviseItem?.processCode} | 当前版本: {reviseItem?.version}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">修订类型</label>
              <div className="flex gap-2">
                <Button
                  variant={reviseType === 'upgrade' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviseType('upgrade')}
                  className={reviseType === 'upgrade' ? 'bg-[#1e3a5f] hover:bg-[#2d4f7a]' : ''}
                >
                  <RotateCw className="h-4 w-4 mr-1" /> 版本升级
                </Button>
                <Button
                  variant={reviseType === 'abolish' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviseType('abolish')}
                  className={reviseType === 'abolish' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <XCircle className="h-4 w-4 mr-1" /> 废止流程
                </Button>
              </div>
            </div>
            {reviseType === 'abolish' ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">废止原因 <span className="text-red-500">*</span></label>
                <Textarea
                  placeholder="请输入废止原因..."
                  value={reviseReason}
                  onChange={e => setReviseReason(e.target.value)}
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviseDialog(false)}>取消</Button>
            <Button
              onClick={handleConfirmRevise}
              className={reviseType === 'abolish' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e3a5f] hover:bg-[#2d4f7a]'}
              disabled={reviseType === 'abolish' ? !reviseReason.trim() : !reviseContent.trim()}
            >
              确认{reviseType === 'abolish' ? '废止' : '升级'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
