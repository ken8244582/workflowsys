'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FlowItem, OverviewStats, computeStats, L1Stat } from '@/lib/flow-data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2, FileText, Shield, Wifi,
  GitBranch, TrendingUp, CheckCircle2, Trophy,
} from 'lucide-react';

const CHART_COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#84cc16', '#f43f5e', '#a855f7', '#14b8a6', '#e11d48', '#7c3aed', '#0ea5e9', '#d946ef'];

// --- 端到端流程数据（从API加载） ---
interface E2EProcessData {
  id: string;
  name: string;
  owner: string;
  department: string;
  responsiblePerson: string;
  currentProgress: number;
  targetProgress: number;
  status: string;
}

// --- Section 标题组件 ---
function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-2 pt-6">
      <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
      <div>
        <h2 className="text-xl font-semibold text-[#1e3a5f]">
          <span className="mr-2 text-base font-medium text-[#64748b]">{number}</span>
          {title}
        </h2>
      </div>
    </div>
  );
}

// --- 指标卡片 ---
function StatCard({ title, value, subtitle, accent, icon }: {
  title: string;
  value: number | string;
  subtitle?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card className={`relative overflow-hidden transition-shadow hover:shadow-md ${accent ? 'border-[#1e3a5f]/30 bg-gradient-to-br from-[#1e3a5f]/8 via-white to-[#1e3a5f]/3' : 'bg-white'}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</p>
            <p className={`mt-2 text-3xl font-extrabold tabular-nums tracking-tight leading-none ${accent ? 'text-[#1e3a5f]' : 'text-slate-800'}`}>{value}</p>
            {subtitle && <p className="mt-2 text-xs text-slate-400 font-medium">{subtitle}</p>}
          </div>
          {icon && (
            <div className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl ${accent ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]' : 'bg-slate-100 text-slate-400'}`}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
      {accent && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1e3a5f] via-[#3b82f6] to-[#1e3a5f]" />}
    </Card>
  );
}

// =============================================
// Section 1: 职能流程工作
// =============================================

function CategoryPieChart({ data }: { data: { category: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">分类分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
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
        <CardTitle className="text-sm">格式分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="format" cx="50%" cy="50%" outerRadius={70} label={({ format, percent }) => `${format} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#94a3b8'][index] || CHART_COLORS[index]} />
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
    name: d.name.replace(/^\d+/, ''),
    流程: d.processCount,
    办法: d.methodCount,
    其它: d.otherCount,
  }));

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">各业务域分类构成</CardTitle>
        <CardDescription>横向堆叠柱状图 — L1业务域下L4流程的分类数量</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip />
            <Legend />
            <Bar dataKey="流程" stackId="a" fill="#1e3a5f" />
            <Bar dataKey="办法" stackId="a" fill="#3b82f6" />
            <Bar dataKey="其它" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} />
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
        <CardTitle className="text-sm">版本分布 TOP10</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="version" tick={{ fontSize: 11 }} width={50} />
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
        <CardTitle className="text-sm">业务域详细统计</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left">
              <th className="whitespace-nowrap px-2 py-1.5 font-medium text-muted-foreground">业务域</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-muted-foreground">L4流程</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-muted-foreground">流程</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-muted-foreground">办法</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-muted-foreground">其它</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-muted-foreground">集团模板</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-muted-foreground">旧格式</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-muted-foreground">IT覆盖</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name} className="border-b last:border-0 hover:bg-muted/50">
                <td className="whitespace-nowrap px-2 py-1.5 font-medium">{row.name}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums font-semibold">{row.l4Count}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{row.processCount}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{row.methodCount}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{row.otherCount}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{row.groupTemplateCount}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{row.oldFormatCount}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
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

// =============================================
// Section 2: 端到端流程工作
// =============================================

function E2EProgressChart({ data }: { data: E2EProcessData[] }) {
  const chartData = data
    .sort((a, b) => b.currentProgress - a.currentProgress)
    .map((d) => ({
      name: d.name,
      current: d.currentProgress,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">端到端流程贯通进度</CardTitle>
        <CardDescription>各端到端流程当前完成进度</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 130, bottom: 5 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} />
            <Tooltip formatter={(value: number, name: string) => [`${value}%`, name]} />
            <Bar dataKey="current" fill="#1e3a5f" radius={[0, 4, 4, 0]} name="当前完成值" barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function E2EDetailTable({ data }: { data: E2EProcessData[] }) {
  const sortedData = [...data].sort((a, b) => b.currentProgress - a.currentProgress);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">端到端流程明细</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left">
              <th className="whitespace-nowrap px-2 py-1.5 font-medium text-muted-foreground">端到端流程</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-medium text-muted-foreground">负责部门</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-muted-foreground">当前完成</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-medium text-muted-foreground">状态</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-medium text-muted-foreground">进度条</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => {
              const statusLabel = row.status === 'completed' ? '已完成' : row.status === 'in_progress' ? '进行中' : '未开始';
              const statusColor = row.status === 'completed' ? 'text-[#10b981]' : row.status === 'in_progress' ? 'text-[#3b82f6]' : 'text-[#94a3b8]';
              return (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-2 py-1.5 font-medium">{row.name}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">{row.department}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums font-semibold">{row.currentProgress}%</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5" style={{ minWidth: 160 }}>
                    <div className="relative h-4 w-full rounded-full bg-muted">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-[#1e3a5f]" style={{ width: `${row.currentProgress}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// =============================================
// 主页面
// =============================================

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [e2eData, setE2eData] = useState<E2EProcessData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/flow-data.json').then((res) => res.json()),
      fetch('/api/e2e/processes').then((res) => res.json()).catch(() => []),
    ])
      .then(([flowData, e2eProcData]) => {
        setStats(computeStats(flowData as FlowItem[]));
        setE2eData(Array.isArray(e2eProcData) ? e2eProcData : []);
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

  const groupTemplateRate = stats.l4ProcessCount > 0
    ? ((stats.groupTemplateCount / stats.l4ProcessCount) * 100).toFixed(1)
    : '0';
  const coverageRate = stats.l4ProcessCount > 0
    ? ((stats.itYesCount / stats.l4ProcessCount) * 100).toFixed(1)
    : '0';

  const avgE2ERate = e2eData.length > 0 ? Math.round(e2eData.reduce((s, d) => s + d.currentProgress, 0) / e2eData.length) : 0;
  const completedE2E = e2eData.filter(d => d.currentProgress >= 100).length;
  const maxProgressE2E = e2eData.length > 0 ? e2eData.reduce((max, d) => d.currentProgress > max.currentProgress ? d : max, e2eData[0]) : null;

  return (
    <div className="space-y-2">

      {/* ============================================ */}
      {/* Section 1: 职能流程工作 */}
      {/* ============================================ */}
      <SectionTitle number="一、" title="职能流程工作情况" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="L1 业务域" value={stats.l1DomainCount} accent icon={<Building2 className="w-5 h-5" />} />
        <StatCard title="L4 职能流程" value={stats.l4ProcessCount} subtitle={`总条目 ${stats.totalRows}`} accent icon={<FileText className="w-5 h-5" />} />
        <StatCard title="集团模板占比" value={`${groupTemplateRate}%`} subtitle={`${stats.groupTemplateCount} / ${stats.l4ProcessCount}`} icon={<Shield className="w-5 h-5" />} />
        <StatCard title="IT 覆盖率" value={`${coverageRate}%`} subtitle={`已覆盖 ${stats.itYesCount}`} icon={<Wifi className="w-5 h-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <L1BarChart data={stats.l1Stats} />
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <CategoryPieChart data={stats.categoryDistribution} />
            <FormatPieChart data={stats.formatDistribution} />
          </div>
          <VersionBarChart data={stats.versionDistribution} />
        </div>
      </div>

      <L1Table data={stats.l1Stats} />

      {/* ============================================ */}
      {/* Section 2: 端到端流程工作 */}
      {/* ============================================ */}
      <div className="pt-4">
        <SectionTitle number="二、" title="端到端流程工作情况" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="端到端流程总数" value={e2eData.length} accent icon={<GitBranch className="w-5 h-5" />} />
        <StatCard title="平均贯通率" value={`${avgE2ERate}%`} accent icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="已完成数" value={completedE2E} subtitle={`共 ${e2eData.length} 条`} icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatCard title="进度最高" value={maxProgressE2E ? `${maxProgressE2E.currentProgress}%` : '--'} subtitle={maxProgressE2E?.name} icon={<Trophy className="w-5 h-5" />} />
      </div>

      {e2eData.length > 0 ? (
        <>
          <E2EProgressChart data={e2eData} />
          <E2EDetailTable data={e2eData} />
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">暂无端到端流程数据</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>数据来源：L1-L4流程文件清单20260515 / 流程修订计划表 / 端到端流程管理</span>
        <div className="flex items-center gap-4">
          <Link href="/flows" className="text-[#1e3a5f] hover:underline">查看完整流程清单 →</Link>
          <Link href="/e2e/overview" className="text-[#1e3a5f] hover:underline">端到端流程概览 →</Link>
        </div>
      </div>
    </div>
  );
}
