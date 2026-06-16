'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, Eye, Download } from 'lucide-react';
import { PaginationBar } from '@/components/pagination-bar';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

interface Assessment {
  id: number;
  name: string;
  period: string;
  status: string;
  total_score: string;
  mechanism_score: string;
  operation_score: string;
  it_score: string;
  remarks: string;
  created_by: string;
  created_at_ts: string;
  updated_by: string;
  updated_at_ts: string;
}

interface ComparisonReport {
  assessment1: { id: number; name: string; period: string };
  assessment2: { id: number; name: string; period: string };
  sections: {
    mechanism: { current: string; compare: string; diff: string };
    operation: { current: string; compare: string; diff: string };
    it: { current: string; compare: string; diff: string };
    total: { current: string; compare: string; diff: string };
  };
  items: {
    section_type: string;
    layer2: string;
    layer3: string;
    layer4: string;
    score_group_key: string;
    current_score: number;
    compare_score: number;
    diff: number;
    standard_max: number;
    current_rate: number;
    compare_rate: number;
    improvement_needed: boolean;
  }[];
  improvementAreas: string[];
}

const SECTION_LABELS: Record<string, string> = {
  mechanism: '流程管理机制建设评价',
  operation: '流程运行实际效果评价',
  it_coverage: 'L4级流程的IT覆盖度和IT支撑度提升',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function AssessmentHistoryPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const HISTORY_PATH = '/assessment/history';
  const MATURITY_PATH = '/assessment/maturity';
  const canExport = hasPermission(HISTORY_PATH, 'export');
  const canDelete = hasPermission(MATURITY_PATH, 'delete');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedId1, setSelectedId1] = useState<string>('');
  const [selectedId2, setSelectedId2] = useState<string>('');
  const [comparisonReport, setComparisonReport] = useState<ComparisonReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Search & pagination
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await fetch('/api/assessments');
      if (res.ok) {
        const data = await res.json();
        setAssessments(data);
      }
    } catch (e) {
      console.error('Failed to fetch assessments:', e);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Filtered + paginated data
  const filteredData = useMemo(() => {
    let data = [...assessments];
    if (statusFilter !== 'all') {
      data = data.filter(a => a.status === statusFilter);
    }
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      data = data.filter(a =>
        a.name.toLowerCase().includes(s) ||
        a.period.toLowerCase().includes(s) ||
        a.created_by.toLowerCase().includes(s)
      );
    }
    return data;
  }, [assessments, statusFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchText, statusFilter, pageSize]);

  const handleCompare = async () => {
    if (!selectedId1 || !selectedId2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${selectedId1}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compare', compareAssessmentId: parseInt(selectedId2) }),
      });
      if (res.ok) {
        const report = await res.json();
        setComparisonReport(report);
      }
    } catch (e) {
      console.error('Failed to compare:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/assessments/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        setDeleteName('');
        await fetchAssessments();
        // If the deleted assessment was selected for comparison, reset
        if (String(deleteId) === selectedId1) setSelectedId1('');
        if (String(deleteId) === selectedId2) setSelectedId2('');
      }
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleExport = async (id: number) => {
    try {
      const res = await fetch(`/api/assessments/${id}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const disposition = res.headers.get('Content-Disposition');
        let filename = '自评导出.xlsx';
        if (disposition) {
          const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
          if (match) filename = decodeURIComponent(match[1].replace(/"/g, ''));
        }
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Failed to export:', e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-[#1e3a5f] rounded" />
        <h1 className="text-xl font-bold text-foreground">自评历史</h1>
      </div>

      {/* Filters - matching flow list style */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="草稿">草稿</SelectItem>
                <SelectItem value="已提交">已提交</SelectItem>
              </SelectContent>
            </Select>
            <div className="col-span-2 md:col-span-3 lg:col-span-6 relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="搜索自评名称/周期/创建人" value={searchText} onChange={e => setSearchText(e.target.value)} className="h-7 text-xs pl-7" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[60vh]">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">自评名称</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">评价周期</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center">状态</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center">总分</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center">机制建设</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center">运行效果</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center">IT提升</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">创建人</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">创建时间</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap text-center sticky right-0 top-0 bg-gray-50 z-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      暂无自评记录
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedData.map(a => (
                    <TableRow key={a.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium whitespace-nowrap">{a.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.period}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={a.status === '草稿' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold tabular-nums">{a.total_score}</TableCell>
                      <TableCell className="text-center font-mono tabular-nums">{a.mechanism_score}</TableCell>
                      <TableCell className="text-center font-mono tabular-nums">{a.operation_score}</TableCell>
                      <TableCell className="text-center font-mono tabular-nums">{a.it_score}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.created_by}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{a.created_at_ts}</TableCell>
                      <TableCell className="text-center sticky right-0 bg-white z-10">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="查看详情"
                            onClick={() => router.push('/assessment/maturity')}
                          >
                            <Eye className="h-3.5 w-3.5 text-gray-500" />
                          </Button>
                          {canExport && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="导出"
                            onClick={() => handleExport(a.id)}
                          >
                            <Download className="h-3.5 w-3.5 text-gray-500" />
                          </Button>
                          )}
                          {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="删除"
                            onClick={() => { setDeleteId(a.id); setDeleteName(a.name); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Pagination */}
      {totalPages > 0 && (
        <PaginationBar
          page={page} totalPages={totalPages} total={filteredData.length}
          pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* Comparison Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">自评对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">自评 A（当前）</label>
              <Select value={selectedId1} onValueChange={setSelectedId1}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="选择第一个自评..." />
                </SelectTrigger>
                <SelectContent>
                  {assessments.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} ({a.period}) - {a.total_score}分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-lg text-muted-foreground pb-2">vs</div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">自评 B（对比）</label>
              <Select value={selectedId2} onValueChange={setSelectedId2}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="选择对比的自评..." />
                </SelectTrigger>
                <SelectContent>
                  {assessments.filter(a => String(a.id) !== selectedId1).map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} ({a.period}) - {a.total_score}分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCompare}
              disabled={!selectedId1 || !selectedId2 || loading}
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
              size="sm"
            >
              {loading ? '生成中...' : '生成对比报告'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Report */}
      {comparisonReport && (
        <>
          <div className="flex items-center justify-end">
            <Button
              className="h-7 text-xs"
              variant="outline"
              onClick={async () => {
                if (!comparisonReport) return;
                try {
                  const res = await fetch('/api/assessments/compare-export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      assessmentId1: comparisonReport.assessment1.id,
                      assessmentId2: comparisonReport.assessment2.id,
                    }),
                  });
                  if (!res.ok) throw new Error('导出失败');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `自评对比报告_${comparisonReport.assessment1.name}_vs_${comparisonReport.assessment2.name}.xlsx`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (e) {
                  console.error('Export comparison error:', e);
                  alert('导出对比报告失败');
                }
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              导出
            </Button>
          </div>

          {/* Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">总览对比</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">评价维度</th>
                    <th className="px-4 py-2 text-center font-medium">
                      {comparisonReport.assessment1.name}
                      <span className="block text-xs text-muted-foreground">{comparisonReport.assessment1.period}</span>
                    </th>
                    <th className="px-4 py-2 text-center font-medium">
                      {comparisonReport.assessment2.name}
                      <span className="block text-xs text-muted-foreground">{comparisonReport.assessment2.period}</span>
                    </th>
                    <th className="px-4 py-2 text-center font-medium">差异</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: '总得分', ...comparisonReport.sections.total },
                    { label: '机制建设评价', ...comparisonReport.sections.mechanism },
                    { label: '运行效果评价', ...comparisonReport.sections.operation },
                    { label: 'IT覆盖与支撑', ...comparisonReport.sections.it },
                  ].map(row => {
                    const diff = parseFloat(row.diff);
                    return (
                      <tr key={row.label} className="border-b last:border-b-0">
                        <td className="px-4 py-2 font-medium">{row.label}</td>
                        <td className="px-4 py-2 text-center font-mono tabular-nums font-semibold">{row.current}</td>
                        <td className="px-4 py-2 text-center font-mono tabular-nums">{row.compare}</td>
                        <td className={`px-4 py-2 text-center font-mono tabular-nums font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {diff > 0 ? '+' : ''}{row.diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Detail by section */}
          {['mechanism', 'operation', 'it_coverage'].map(sectionType => {
            const sectionItems = comparisonReport.items.filter(i => i.section_type === sectionType);
            if (sectionItems.length === 0) return null;
            return (
              <Card key={sectionType}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{SECTION_LABELS[sectionType]} - 明细对比</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">评价项</th>
                        <th className="px-4 py-2 text-center font-medium">A得分</th>
                        <th className="px-4 py-2 text-center font-medium">B得分</th>
                        <th className="px-4 py-2 text-center font-medium">差异</th>
                        <th className="px-4 py-2 text-center font-medium">A得分率</th>
                        <th className="px-4 py-2 text-center font-medium">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionItems.map((item, idx) => (
                        <tr key={idx} className={`border-b last:border-b-0 ${item.improvement_needed ? 'bg-red-50/50' : ''}`}>
                          <td className="px-4 py-2">
                            <span className="text-xs text-muted-foreground">{item.layer3} &gt;</span>
                            <span className="ml-1">{item.layer4}</span>
                          </td>
                          <td className="px-4 py-2 text-center font-mono tabular-nums">{item.current_score}</td>
                          <td className="px-4 py-2 text-center font-mono tabular-nums">{item.compare_score}</td>
                          <td className={`px-4 py-2 text-center font-mono tabular-nums font-semibold ${item.diff > 0 ? 'text-emerald-600' : item.diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {item.diff > 0 ? '+' : ''}{item.diff}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-[#1e3a5f] rounded-full" style={{ width: `${Math.min(item.current_rate * 100, 100)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{(item.current_rate * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.improvement_needed ? (
                              <Badge variant="outline" className="bg-red-50 text-red-600 text-xs">↓ 下降</Badge>
                            ) : item.diff > 0 ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 text-xs">↑ 提升</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-50 text-slate-500 text-xs">→ 持平</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}

          {/* Improvement Areas */}
          {comparisonReport.improvementAreas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-amber-600">待改进方向</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {comparisonReport.improvementAreas.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-0.5">●</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteName(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除自评「{deleteName}」吗？此操作不可撤销，所有自评明细也将一并删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
