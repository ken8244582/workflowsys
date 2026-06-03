'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download } from 'lucide-react';

interface RevisionRecord {
  id: number;
  revisionDate: string;
  processCode: string;
  l4Process: string;
  versionAfter: string;
  versionBefore: string;
  l1Domain: string;
  l2Group: string;
  l3Segment: string;
  revisionType: string;
  reason: string;
  content: string;
  operator?: string;
}

export default function FunctionalRevisionPage() {
  const [allData, setAllData] = useState<RevisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const pageSizeOptions = [20, 50, 100];

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');
  const [searchText, setSearchText] = useState('');

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

  // Options
  const domainOptions = useMemo(() => [...new Set(allData.map(d => d.l1Domain).filter(Boolean))], [allData]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = allData;
    if (filterType !== 'all') result = result.filter(d => d.revisionType === filterType);
    if (filterDomain !== 'all') result = result.filter(d => d.l1Domain === filterDomain);
    if (searchText) {
      const s = searchText.toLowerCase();
      result = result.filter(d =>
        d.l4Process.toLowerCase().includes(s) ||
        d.processCode.toLowerCase().includes(s) ||
        d.reason.toLowerCase().includes(s) ||
        d.content.toLowerCase().includes(s)
      );
    }
    // Sort by date descending
    result = [...result].sort((a, b) => b.revisionDate.localeCompare(a.revisionDate));
    return result;
  }, [allData, filterType, filterDomain, searchText]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pagedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [filterType, filterDomain, searchText]);

  // Export handler
  const handleExport = async () => {
    try {
      const res = await fetch('/api/revisions/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '职能流程修订记录.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const typeBadge = (val: string) => {
    if (val === '新增') return <Badge className="bg-green-50 text-green-700 border-green-200">{val}</Badge>;
    if (val === '修订') return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{val}</Badge>;
    if (val === '废止') return <Badge className="bg-red-50 text-red-700 border-red-200">{val}</Badge>;
    return <Badge variant="outline">{val || '-'}</Badge>;
  };

  const versionChange = (before: string, after: string, type: string) => {
    if (type === '新增') return <span className="text-green-600">{after}</span>;
    if (type === '废止') return <span className="text-red-600 line-through">{before}</span>;
    return (
      <span>
        <span className="text-gray-400 line-through">{before}</span>
        <span className="mx-1 text-gray-300">&rarr;</span>
        <span className="text-blue-600">{after}</span>
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">共 {filteredData.length} 条修订记录</div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> 批量导出
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="修订类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="新增">新增</SelectItem>
                <SelectItem value="修订">修订</SelectItem>
                <SelectItem value="废止">废止</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDomain} onValueChange={setFilterDomain}>
              <SelectTrigger><SelectValue placeholder="所属业务域" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部业务域</SelectItem>
                {domainOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">序号</TableHead>
                <TableHead>修订日期</TableHead>
                <TableHead>流程编码</TableHead>
                <TableHead>L4职能流程</TableHead>
                <TableHead>版本变更</TableHead>
                <TableHead>所属业务域-业务组-业务段</TableHead>
                <TableHead>修订类型</TableHead>
                <TableHead>修订说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                    暂无修订记录
                  </TableCell>
                </TableRow>
              ) : (
                pagedData.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-gray-400 text-xs">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell className="text-xs font-mono whitespace-nowrap">{item.revisionDate}</TableCell>
                    <TableCell className="text-xs font-mono">{item.processCode}</TableCell>
                    <TableCell className="text-xs font-medium">{item.l4Process}</TableCell>
                    <TableCell className="text-xs">
                      {versionChange(item.versionBefore, item.versionAfter, item.revisionType)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="text-[#1e3a5f]">{item.l1Domain}</span>
                      <span className="text-gray-300 mx-1">&gt;</span>
                      <span>{item.l2Group}</span>
                      <span className="text-gray-300 mx-1">&gt;</span>
                      <span className="text-gray-500">{item.l3Segment}</span>
                    </TableCell>
                    <TableCell className="text-xs">{typeBadge(item.revisionType)}</TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[200px] truncate" title={item.reason || item.content}>
                      {item.reason || item.content || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
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
    </div>
  );
}
