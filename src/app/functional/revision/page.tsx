'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Trash2, AlertTriangle } from 'lucide-react';
import { MultiSelectFilter } from '@/components/multi-select-filter';
import { usePermission } from '@/lib/use-permission';

interface RevisionRecord {
  id: number;
  revisionDate: string;
  processCode: string;
  l4Process: string;
  version: string;
  l1Domain: string;
  l2Group: string;
  l3Segment: string;
  revisionType: string;
  description: string;
  operator?: string;
}

/* ========== Shared Pagination Component ========== */
function PaginationBar({
  page, totalPages, total, pageSize, pageSizeOptions,
  onPageChange, onPageSizeChange
}: {
  page: number; totalPages: number; total: number;
  pageSize: number; pageSizeOptions: number[];
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const [inputPage, setInputPage] = useState(String(page));
  useEffect(() => { setInputPage(String(page)); }, [page]);

  const handleJump = () => {
    const p = parseInt(inputPage);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setInputPage(String(page));
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">共 {total} 条</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">每页</span>
          <Select value={String(pageSize)} onValueChange={v => onPageSizeChange(Number(v))}>
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
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPageChange(1)}>«</Button>
        <Button variant="outline" size="sm" className="h-7 px-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</Button>
        {getPageNumbers().map((p, i) =>
          typeof p === 'string' ? (
            <span key={`e${i}`} className="px-1 text-gray-400 text-sm">...</span>
          ) : (
            <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0 text-xs"
              onClick={() => onPageChange(p)}
              style={p === page ? { backgroundColor: '#1e3a5f' } : undefined}>
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>›</Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>»</Button>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-gray-500">跳至</span>
          <Input className="h-7 w-12 text-xs text-center" value={inputPage}
            onChange={e => setInputPage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleJump(); }}
            onBlur={handleJump} />
          <span className="text-xs text-gray-500">页</span>
        </div>
      </div>

    </div>
  );
}

export default function FunctionalRevisionPage() {
  const { canExport, canDelete } = usePermission('/functional/revision');
  const [allData, setAllData] = useState<RevisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const pageSizeOptions = [20, 50, 100, 200];

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/revisions?page=1&pageSize=10000');
      const data = await res.json();
      setAllData(data.items || []);
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/revisions/${deleteId}`, { method: 'DELETE' });
      setDeleteConfirmOpen(false);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Options - derived from actual data
  const domainOptions = useMemo(() => [...new Set(allData.map(d => d.l1Domain).filter(Boolean))], [allData]);
  const typeOptions = useMemo(() => [...new Set(allData.map(d => d.revisionType).filter(Boolean))], [allData]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = allData;
    if (selectedTypes.length > 0) result = result.filter(d => selectedTypes.includes(d.revisionType));
    if (selectedDomains.length > 0) result = result.filter(d => selectedDomains.includes(d.l1Domain));
    if (searchText) {
      const s = searchText.toLowerCase();
      result = result.filter(d =>
        d.l4Process.toLowerCase().includes(s) ||
        d.processCode.toLowerCase().includes(s) ||
        d.description.toLowerCase().includes(s)
      );
    }
    result = [...result].sort((a, b) => b.revisionDate.localeCompare(a.revisionDate));
    return result;
  }, [allData, selectedTypes, selectedDomains, searchText]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pagedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [selectedTypes, selectedDomains, searchText, pageSize]);

  // Export handler
  const handleExport = async () => {
    try {
      const res = await fetch('/api/revisions/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = '职能流程修订记录.xlsx'; a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const typeBadge = (val: string) => {
    if (val === '新增') return <Badge className="bg-green-50 text-green-700 border-green-200">{val}</Badge>;
    if (val === '修订') return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{val}</Badge>;
    if (val === '废止') return <Badge className="bg-red-50 text-red-700 border-red-200">{val}</Badge>;
    if (val === '恢复') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{val}</Badge>;
    return <Badge variant="outline">{val || '-'}</Badge>;
  };

  const versionChange = (version: string, type: string) => {
    if (type === '新增') return <span className="text-green-600">{version}</span>;
    if (type === '废止') return <span className="text-red-600 line-through">{version}</span>;
    if (type === '恢复') return <span className="text-emerald-600">{version}</span>;
    return <span className="text-blue-600">{version}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
          <h2 className="text-xl font-semibold text-[#1e3a5f]">修订记录</h2>
        </div>
        <div className="flex items-center gap-2">
          {canExport() && (
            <Button onClick={handleExport} variant="outline" size="sm" className="h-7 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" /> 导出
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-500">共 {filteredData.length} 条修订记录</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <MultiSelectFilter
              label="修订类型"
              options={typeOptions}
              selected={selectedTypes}
              onChange={setSelectedTypes}
            />
            <MultiSelectFilter
              label="所属业务域"
              options={domainOptions}
              selected={selectedDomains}
              onChange={setSelectedDomains}
            />
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="搜索流程名/编码/修订内容" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="w-10 text-center">序号</TableHead>
                <TableHead>修订日期</TableHead>
                <TableHead>流程编码</TableHead>
                <TableHead>L4职能流程</TableHead>
                <TableHead className="text-center">版本变更</TableHead>
                <TableHead>所属业务域-业务组-业务段</TableHead>
                <TableHead className="text-center">修订类型</TableHead>
                <TableHead>修订说明</TableHead>
                {canDelete() && <TableHead className="text-center w-16">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canDelete() ? 9 : 8} className="text-center py-12 text-gray-400">
                    暂无修订记录
                  </TableCell>
                </TableRow>
              ) : (
                pagedData.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-gray-400 text-center">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell className="font-mono whitespace-nowrap">{item.revisionDate}</TableCell>
                    <TableCell className="font-mono">{item.processCode}</TableCell>
                    <TableCell className="font-medium">{item.l4Process}</TableCell>
                    <TableCell className="text-center">{versionChange(item.version, item.revisionType)}</TableCell>
                    <TableCell>
                      <span className="text-[#1e3a5f]">{item.l1Domain}</span>
                      <span className="text-gray-300 mx-1">&gt;</span>
                      <span>{item.l2Group}</span>
                      <span className="text-gray-300 mx-1">&gt;</span>
                      <span className="text-gray-500">{item.l3Segment}</span>
                    </TableCell>
                    <TableCell className="text-center">{typeBadge(item.revisionType)}</TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate" title={item.description}>
                      {item.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {canDelete() && (
                        <button
                          onClick={() => { setDeleteId(item.id); setDeleteConfirmOpen(true); }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                          title="删除此记录"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <PaginationBar
          page={page} totalPages={totalPages} total={filteredData.length}
          pageSize={pageSize} pageSizeOptions={pageSizeOptions}
          onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* 删除确认对话框 */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除这条修订记录吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteConfirmOpen(false); setDeleteId(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
