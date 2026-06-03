'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const CHART_COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4'];

interface RevisionItem {
  计划修订时间: string;
  流程编码: string;
  L4流程名称: string;
  修订前版本: string;
  修订后版本: string;
  修订内容: string;
  所属部门: string;
  修订类型: string;
  完成时间: string;
  完成情况: string;
}

const TYPE_STYLES: Record<string, string> = {
  '修订': 'bg-[#1e3a5f] text-white',
  '新增': 'bg-[#f59e0b] text-white',
};

function StatCard({ title, value, subtitle, accent }: {
  title: string;
  value: number | string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-[#1e3a5f]/20 bg-[#1e3a5f]/5' : ''}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? 'text-[#1e3a5f]' : ''}`}>{value}</p>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function RevisionPage() {
  const [data, setData] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    fetch('/revision-plan.json')
      .then((res) => res.json())
      .then((raw: RevisionItem[]) => {
        setData(raw);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const deptOptions = useMemo(() => {
    const set = new Set(data.map((d) => d.所属部门).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (deptFilter !== 'all') result = result.filter((d) => d.所属部门 === deptFilter);
    if (typeFilter !== 'all') result = result.filter((d) => d.修订类型 === typeFilter);
    if (statusFilter !== 'all') {
      if (statusFilter === '未完成') {
        result = result.filter((d) => !d.完成情况);
      } else {
        result = result.filter((d) => d.完成情况 === statusFilter);
      }
    }
    return result;
  }, [data, deptFilter, typeFilter, statusFilter]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [deptFilter, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const total = data.length;
    const completed = data.filter((d) => d.完成情况 === '已完成').length;
    const revision = data.filter((d) => d.修订类型 === '修订').length;
    const newAdd = data.filter((d) => d.修订类型 === '新增').length;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    return { total, completed, revision, newAdd, completionRate };
  }, [data]);

  // Chart data: type distribution
  const typeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => {
      if (d.修订类型) map.set(d.修订类型, (map.get(d.修订类型) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Chart data: completion status
  const statusDistribution = useMemo(() => {
    const completed = data.filter((d) => d.完成情况 === '已完成').length;
    const incomplete = data.filter((d) => !d.完成情况).length;
    return [
      { name: '已完成', value: completed },
      { name: '未完成', value: incomplete },
    ];
  }, [data]);

  // Chart data: department distribution (horizontal bar)
  const deptDistribution = useMemo(() => {
    const map = new Map<string, { 修订: number; 新增: number; total: number }>();
    data.forEach((d) => {
      if (!d.所属部门) return;
      const entry = map.get(d.所属部门) || { 修订: 0, 新增: 0, total: 0 };
      if (d.修订类型 === '修订') entry.修订++;
      else if (d.修订类型 === '新增') entry.新增++;
      entry.total++;
      map.set(d.所属部门, entry);
    });
    return Array.from(map.entries())
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">加载修订计划数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-[#1e3a5f]">流程修订计划</h1>
        <p className="mt-1 text-sm text-muted-foreground">2026年6月流程修订与新增计划跟踪</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="修订计划总数" value={stats.total} accent />
        <StatCard title="已完成" value={stats.completed} subtitle={`完成率 ${stats.completionRate}%`} />
        <StatCard title="修订类" value={stats.revision} />
        <StatCard title="新增类" value={stats.newAdd} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">修订类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {typeDistribution.map((_, index) => (
                    <Cell key={`type-${index}`} fill={['#1e3a5f', '#f59e0b'][index] || CHART_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">完成情况</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusDistribution.map((_, index) => (
                    <Cell key={`status-${index}`} fill={['#10b981', '#94a3b8'][index] || CHART_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">各业务域修订计划</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                <Tooltip />
                <Legend />
                <Bar dataKey="修订" fill="#1e3a5f" radius={[0, 4, 4, 0]} stackId="a" />
                <Bar dataKey="新增" fill="#f59e0b" radius={[0, 4, 4, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">修订计划明细</CardTitle>
            <span className="text-sm text-muted-foreground">
              共 <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span> 条
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px] text-sm">
                <SelectValue placeholder="所属业务域" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部业务域</SelectItem>
                {deptOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] text-sm">
                <SelectValue placeholder="修订类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="修订">修订</SelectItem>
                <SelectItem value="新增">新增</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] text-sm">
                <SelectValue placeholder="完成情况" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="已完成">已完成</SelectItem>
                <SelectItem value="未完成">未完成</SelectItem>
              </SelectContent>
            </Select>
            {(deptFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all') && (
              <Button variant="outline" size="sm" onClick={() => { setDeptFilter('all'); setTypeFilter('all'); setStatusFilter('all'); }}>重置</Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">计划时间</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">流程编码</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">L4流程名称</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">修订前版本</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">修订后版本</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">所属业务域</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">修订类型</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">完成情况</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">{item.计划修订时间 || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">{item.流程编码 || '-'}</td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-xs font-medium" title={item.L4流程名称}>{item.L4流程名称 || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">{item.修订前版本 || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">{item.修订后版本 || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{item.所属部门 || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {item.修订类型 && (
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_STYLES[item.修订类型] || 'bg-gray-200 text-gray-700'}`}>
                          {item.修订类型}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${item.完成情况 === '已完成' ? 'bg-[#10b981] text-white' : 'bg-[#94a3b8] text-white'}`}>
                        {item.完成情况 || '未完成'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                      无匹配结果
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                第 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} 条，共 {filtered.length} 条
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <span key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-xs text-muted-foreground">...</span>}
                      <Button variant={p === page ? 'default' : 'outline'} size="sm" className="min-w-[32px]" onClick={() => setPage(p)}>{p}</Button>
                    </span>
                  ))}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
