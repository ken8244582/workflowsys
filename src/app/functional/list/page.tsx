'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FlowItem } from '@/lib/flow-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 50;

const CATEGORY_COLORS: Record<string, string> = {
  '流程': 'bg-[#1e3a5f] text-white',
  '办法': 'bg-[#3b82f6] text-white',
  '其它': 'bg-[#94a3b8] text-white',
};

const FORMAT_COLORS: Record<string, string> = {
  '集团模板': 'bg-[#10b981] text-white',
  '旧格式': 'bg-[#f59e0b] text-white',
};

const IT_COLORS: Record<string, string> = {
  '是': 'bg-[#10b981] text-white',
  '否': 'bg-[#f59e0b] text-white',
};

export default function FunctionalListPage() {
  const [data, setData] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [l1Filter, setL1Filter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [itFilter, setItFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch('/flow-data.json')
      .then((res) => res.json())
      .then((raw: FlowItem[]) => {
        setData(raw.filter((d) => d.l4Process));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const l1Options = useMemo(() => {
    const set = new Set(data.map((d) => d.l1Domain).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (l1Filter && l1Filter !== 'all') result = result.filter((d) => d.l1Domain === l1Filter);
    if (categoryFilter && categoryFilter !== 'all') result = result.filter((d) => d.category === categoryFilter);
    if (formatFilter && formatFilter !== 'all') result = result.filter((d) => d.format === formatFilter);
    if (itFilter && itFilter !== 'all') result = result.filter((d) => d.itCoverage === itFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.l4Process.toLowerCase().includes(q) ||
          d.processCode.toLowerCase().includes(q) ||
          d.l1Domain.toLowerCase().includes(q) ||
          d.l2Group.toLowerCase().includes(q) ||
          d.l3Segment.toLowerCase().includes(q) ||
          d.l4Owner.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, l1Filter, categoryFilter, formatFilter, itFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const resetFilters = useCallback(() => {
    setSearch('');
    setL1Filter('all');
    setCategoryFilter('all');
    setFormatFilter('all');
    setItFilter('all');
    setPage(1);
  }, []);

  useEffect(() => { setPage(1); }, [l1Filter, categoryFilter, formatFilter, itFilter, search]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">加载流程数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
        <h2 className="text-xl font-semibold text-[#1e3a5f]">职能流程清单</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">筛选</CardTitle>
            <span className="text-sm text-muted-foreground">
              共 <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span> 条
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Input placeholder="搜索流程名/编码/所有者..." value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm" />
            <Select value={l1Filter} onValueChange={setL1Filter}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="L1 业务域" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部业务域</SelectItem>
                {l1Options.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="分类" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="流程">流程</SelectItem>
                <SelectItem value="办法">办法</SelectItem>
                <SelectItem value="其它">其它</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="格式" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部格式</SelectItem>
                <SelectItem value="集团模板">集团模板</SelectItem>
                <SelectItem value="旧格式">旧格式</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itFilter} onValueChange={setItFilter}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="IT覆盖" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="是">已覆盖</SelectItem>
                <SelectItem value="否">未覆盖</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>重置筛选</Button>
            {(l1Filter !== 'all' || categoryFilter !== 'all' || formatFilter !== 'all' || itFilter !== 'all' || search) && (
              <div className="flex flex-wrap items-center gap-1">
                {l1Filter !== 'all' && <Badge variant="secondary" className="text-xs">{l1Filter}</Badge>}
                {categoryFilter !== 'all' && <Badge variant="secondary" className="text-xs">{categoryFilter}</Badge>}
                {formatFilter !== 'all' && <Badge variant="secondary" className="text-xs">{formatFilter}</Badge>}
                {itFilter !== 'all' && <Badge variant="secondary" className="text-xs">IT: {itFilter}</Badge>}
                {search && <Badge variant="secondary" className="text-xs">搜索: {search}</Badge>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">L1 业务域</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">L2 业务组</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">L3 业务段</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">流程编码</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">L4 职能流程</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">版本</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">L4 所有者</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">格式</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">分类</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">IT覆盖</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{item.l1Domain}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{item.l2Group}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{item.l3Segment}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">{item.processCode}</td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-xs font-medium">{item.l4Process}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">{item.version}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{item.l4Owner}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {item.format && <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${FORMAT_COLORS[item.format] || 'bg-gray-200 text-gray-700'}`}>{item.format}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {item.category && <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[item.category] || 'bg-gray-200 text-gray-700'}`}>{item.category}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {item.itCoverage && <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${IT_COLORS[item.itCoverage] || 'bg-gray-200 text-gray-700'}`}>{item.itCoverage}</span>}
                    </td>
                  </tr>
                ))}
                {pageData.length === 0 && (
                  <tr><td colSpan={10} className="px-3 py-12 text-center text-muted-foreground">无匹配结果，请调整筛选条件</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">第 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} 条，共 {filtered.length} 条</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, i, arr) => (
                  <span key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-xs text-muted-foreground">...</span>}
                    <Button variant={p === page ? 'default' : 'outline'} size="sm" className="min-w-[32px]" onClick={() => setPage(p)}>{p}</Button>
                  </span>
                ))}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>下一页</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
