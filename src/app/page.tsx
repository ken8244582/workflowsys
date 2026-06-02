'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FlowItem, OverviewStats, computeStats, L1Stat } from '@/lib/flow-data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CHART_COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#84cc16', '#f43f5e', '#a855f7', '#14b8a6', '#e11d48', '#7c3aed', '#0ea5e9', '#d946ef'];

const NAV_SCRIPT = `
(function() {
  function updateNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(function(link) {
      const href = link.getAttribute('href');
      if (href === path) {
        link.classList.add('bg-accent', 'text-foreground');
        link.classList.remove('text-muted-foreground');
      } else {
        link.classList.remove('bg-accent', 'text-foreground');
        link.classList.add('text-muted-foreground');
      }
    });
  }
  updateNav();
  window.addEventListener('popstate', updateNav);
})();
`;

function StatCard({ title, value, subtitle, icon, accent }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-[#1e3a5f]/20 bg-[#1e3a5f]/5' : ''}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${accent ? 'text-[#1e3a5f]' : ''}`}>{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {icon && <div className="text-muted-foreground/60">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryPieChart({ data }: { data: { category: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">分类分布</CardTitle>
        <CardDescription>L4流程按分类统计</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(1)}%`} labelLine={true}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function FormatPieChart({ data }: { data: { format: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">格式分布</CardTitle>
        <CardDescription>L4流程按格式统计</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="format" cx="50%" cy="50%" outerRadius={90} label={({ format, percent }) => `${format} ${(percent * 100).toFixed(1)}%`} labelLine={true}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index + 2 % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function L1BarChart({ data }: { data: L1Stat[] }) {
  const chartData = data.map((d) => ({
    name: d.name.replace(/^\d+/, '').slice(0, 6),
    流程: d.processCount,
    办法: d.methodCount,
    其它: d.otherCount,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">各业务域分类统计</CardTitle>
        <CardDescription>L1业务域下L4流程的分类构成</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="流程" stackId="a" fill="#1e3a5f" radius={[0, 0, 0, 0]} />
            <Bar dataKey="办法" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="其它" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function L1CountBarChart({ data }: { data: L1Stat[] }) {
  const chartData = data.map((d) => ({
    name: d.name.replace(/^\d+/, '').slice(0, 6),
    集团模板: d.groupTemplateCount,
    旧格式: d.oldFormatCount,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">各业务域格式统计</CardTitle>
        <CardDescription>L1业务域下集团模板 vs 旧格式</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="集团模板" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="旧格式" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function VersionBarChart({ data }: { data: { version: string; count: number }[] }) {
  const top10 = data.slice(0, 10);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">版本分布 TOP10</CardTitle>
        <CardDescription>流程版本号数量统计</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="version" tick={{ fontSize: 12 }} width={50} />
            <Tooltip />
            <Bar dataKey="count" fill="#1e3a5f" radius={[0, 4, 4, 0]} name="数量" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function L1Table({ data }: { data: L1Stat[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">业务域详细统计</CardTitle>
        <CardDescription>各L1业务域的流程数据明细</CardDescription>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">业务域</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">总条目</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">L4流程</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">流程</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">办法</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">其它</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">集团模板</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">旧格式</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">IT覆盖</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name} className="border-b last:border-0 hover:bg-muted/50">
                <td className="whitespace-nowrap px-3 py-2 font-medium">{row.name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{row.totalCount}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-semibold">{row.l4Count}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{row.processCount}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{row.methodCount}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{row.otherCount}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{row.groupTemplateCount}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{row.oldFormatCount}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  <span className="text-[#10b981]">{row.itYesCount}</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-[#f59e0b]">{row.itNoCount}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Execute nav highlight script
    const script = document.createElement('script');
    script.textContent = NAV_SCRIPT;
    document.head.appendChild(script);

    fetch('/flow-data.json')
      .then((res) => res.json())
      .then((data: FlowItem[]) => {
        setStats(computeStats(data));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  if (!stats) {
    return <div className="text-center text-muted-foreground">数据加载失败</div>;
  }

  const coverageRate = stats.l4ProcessCount > 0
    ? ((stats.itYesCount / stats.l4ProcessCount) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="L1 业务域" value={stats.l1DomainCount} accent />
        <StatCard title="L2 业务组" value={stats.l2GroupCount} accent />
        <StatCard title="L4 职能流程" value={stats.l4ProcessCount} subtitle={`总条目 ${stats.totalRows}`} accent />
        <StatCard title="流程类" value={stats.processCount} subtitle={`占比 ${stats.l4ProcessCount > 0 ? ((stats.processCount / stats.l4ProcessCount) * 100).toFixed(1) : 0}%`} />
        <StatCard title="办法类" value={stats.methodCount} subtitle={`占比 ${stats.l4ProcessCount > 0 ? ((stats.methodCount / stats.l4ProcessCount) * 100).toFixed(1) : 0}%`} />
        <StatCard title="IT 覆盖率" value={`${coverageRate}%`} subtitle={`是 ${stats.itYesCount} / 否 ${stats.itNoCount}`} />
      </div>

      {/* Row: Pie Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryPieChart data={stats.categoryDistribution} />
        <FormatPieChart data={stats.formatDistribution} />
      </div>

      {/* Row: Bar Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <L1BarChart data={stats.l1Stats} />
        <L1CountBarChart data={stats.l1Stats} />
      </div>

      {/* Version + IT */}
      <div className="grid gap-6 lg:grid-cols-2">
        <VersionBarChart data={stats.versionDistribution} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">IT 覆盖情况</CardTitle>
            <CardDescription>流程是否已IT覆盖</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.itDistribution}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(1)}%`}
                  labelLine={true}
                >
                  {stats.itDistribution.map((entry, index) => {
                    const colorMap: Record<string, string> = { '是': '#10b981', '否': '#f59e0b', '未填写': '#94a3b8' };
                    return <Cell key={`cell-${index}`} fill={colorMap[entry.status] || CHART_COLORS[index]} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <L1Table data={stats.l1Stats} />

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>数据来源：L1-L4流程文件清单20260515</span>
        <Link href="/flows" className="text-[#1e3a5f] hover:underline">查看完整流程清单 →</Link>
      </div>
    </div>
  );
}
