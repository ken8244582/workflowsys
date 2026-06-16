'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
  Building2, FileText, Shield, Wifi,
  ClipboardList, CheckCircle,
  GitBranch, TrendingUp, Target, ChartBar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { computeStats, type FlowItem, type OverviewStats, type L1Stat } from '@/lib/flow-data';

// =============================================
// Color palette
// =============================================
const CHART_COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

// =============================================
// Section Title
// =============================================
function SectionTitle({ number, title, linkHref, linkText }: { number: string; title: string; linkHref?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-1">
      <div className="flex items-center gap-3">
        <div className="w-1 self-stretch rounded-full bg-[#1e3a5f]" />
        <h2 className="text-lg font-semibold text-foreground">{number}{title}</h2>
      </div>
      {linkHref && linkText && (
        <Link href={linkHref} className="text-sm text-[#1e3a5f] hover:underline">{linkText} →</Link>
      )}
    </div>
  );
}

// =============================================
// Stat Card
// =============================================
function StatCard({
  title, value, subtitle, icon, accent,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      {accent && <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6]" />}
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight">{value}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// L1 Stacked Bar Chart
// =============================================
function L1BarChart({ data }: { data: L1Stat[] }) {
  const topData = [...data].sort((a, b) => b.l4Count - a.l4Count).slice(0, 10);
  const chartData = topData.map((d) => {
    const shortName = d.name.replace(/^\d+[\.\、\s]+/, '');
    return {
      name: shortName.length > 12 ? shortName.slice(0, 12) + '…' : shortName,
      流程: d.processCount,
      办法: d.methodCount,
      其它: d.otherCount,
    };
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">业务域分类构成</CardTitle>
        <CardDescription>L1业务域流程数量分布</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="流程" stackId="a" fill="#1e3a5f" radius={[0, 0, 0, 0]} barSize={20} />
            <Bar dataKey="办法" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={20} />
            <Bar dataKey="其它" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================
// Pie Charts
// =============================================
function CategoryPieChart({ data }: { data: { category: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">分类分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={65} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {data.map((_, i) => (
                <Cell key={i} fill={['#1e3a5f', '#3b82f6', '#94a3b8'][i] || '#64748b'} />
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
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">格式分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="format" cx="50%" cy="50%" outerRadius={65} label={({ format, percent }) => `${format} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {data.map((_, i) => (
                <Cell key={i} fill={['#10b981', '#f59e0b', '#94a3b8'][i] || '#64748b'} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================
// Revision Plan Monthly Trend Chart
// =============================================
function RevisionTrendChart({ data }: { data: { month: string; totalTasks: number; completed: number }[] }) {
  const displayData = data.slice(-6).map((d) => ({
    month: d.month.slice(5) + '月',
    总任务: d.totalTasks,
    已完成: d.completed,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">修订计划月度完成趋势</CardTitle>
        <CardDescription>各月任务数与完成数对比</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="总任务" fill="#1e3a5f" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="已完成" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================
// Task Status Donut Chart
// =============================================
function TaskStatusDonut({ data, total, label }: { data: { status: string; count: number }[]; total: number; label: string }) {
  const colorMap: Record<string, string> = { '待执行': '#3b82f6', '进行中': '#f59e0b', '已完成': '#10b981' };

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">修订任务状态分布</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} label={({ status, count }) => `${status} ${count}`} fontSize={11}>
              {data.map((d, i) => (
                <Cell key={i} fill={colorMap[d.status] || CHART_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip />
            <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold tabular-nums">
              {total}
            </text>
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">
              任务总数
            </text>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================
// L1 Detail Table
// =============================================
function L1Table({ data }: { data: L1Stat[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">业务域明细统计</CardTitle>
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
// E2E Progress Chart
// =============================================
interface E2EProcess {
  id: string;
  name: string;
  owner: string;
  department: string;
  currentProgress: number;
  targetProgress: number;
  status: string;
}

function E2EProgressChart({ data }: { data: E2EProcess[] }) {
  const chartData = [...data]
    .sort((a, b) => b.currentProgress - a.currentProgress)
    .map((d) => ({
      name: d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name,
      当前完成: d.currentProgress,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">端到端流程贯通进度</CardTitle>
        <CardDescription>各端到端流程当前完成进度</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 45 + 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
            <Tooltip formatter={(value: number) => [`${value}%`, '当前完成']} />
            <Bar dataKey="当前完成" fill="#1e3a5f" radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================
// E2E Plan Progress Comparison Chart
// =============================================
function E2EPlanProgressChart({ data }: { data: { name: string; planProgress: number; actualProgress: number }[] }) {
  const chartData = data.map((d) => ({
    name: d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name,
    计划进度: d.planProgress,
    实际进度: d.actualProgress,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">梳理计划进度对比</CardTitle>
        <CardDescription>各流程计划进度与实际进度</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="计划进度" fill="#1e3a5f" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="实际进度" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================
// E2E Plan Status Donut Chart
// =============================================
function E2EPlanStatusDonut({ data, total }: { data: { status: string; count: number }[]; total: number }) {
  const colorMap: Record<string, string> = { '已完成': '#10b981', '进行中': '#3b82f6', '计划中': '#94a3b8' };

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">梳理计划状态分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} label={({ status, count }) => `${status} ${count}`} fontSize={11}>
              {data.map((d, i) => (
                <Cell key={i} fill={colorMap[d.status] || CHART_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip />
            <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold tabular-nums">
              {total}
            </text>
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">
              计划总数
            </text>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================
// E2E Detail Table
// =============================================
function E2EDetailTable({ data }: { data: E2EProcess[] }) {
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
// Dashboard data types
// =============================================
interface DashboardData {
  revision: {
    totalPlans: number;
    publishedPlans: number;
    completedPlans: number;
    totalTasks: number;
    totalCompleted: number;
    completionRate: string;
    monthlyTrend: { month: string; totalTasks: number; completed: number }[];
    currentMonthTaskStatus: { status: string; count: number }[];
    currentMonth: string;
  };
  e2e: {
    total: number;
    completed: number;
    inProgress: number;
    avgProgress: number;
    processes: E2EProcess[];
    planTotal: number;
    planCompleted: number;
    planInProgress: number;
    planCompletionRate: string;
    avgPlanProgress: string;
    avgActualProgress: string;
    planStatusDist: { status: string; count: number }[];
    processPlanProgress: { name: string; planProgress: number; actualProgress: number }[];
  };
}

// =============================================
// Main Page
// =============================================
export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/flows?pageSize=9999').then((res) => res.json()).then((d) => d.items || []),
      fetch('/api/dashboard').then((res) => res.json()).catch(() => null),
    ])
      .then(([flowData, dashData]) => {
        setStats(computeStats(flowData as FlowItem[]));
        if (dashData && !dashData.error) setDashboard(dashData as DashboardData);
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

  const revision = dashboard?.revision;
  const e2e = dashboard?.e2e;

  const avgE2ERate = e2e ? e2e.avgProgress : 0;
  const completedE2E = e2e ? e2e.completed : 0;
  const e2eTotal = e2e ? e2e.total : 0;

  return (
    <div className="space-y-4">

      {/* ============================================ */}
      {/* Section 1: 职能流程工作情况 */}
      {/* ============================================ */}
      <SectionTitle number="一、" title="职能流程工作情况" linkHref="/functional/list" linkText="查看完整流程清单" />

      {/* 6指标卡 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard title="L1 业务域" value={stats.l1DomainCount} accent icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="L4 职能流程" value={stats.l4ProcessCount} subtitle={`总条目 ${stats.totalRows}`} accent icon={<FileText className="h-5 w-5" />} />
        <StatCard title="集团模板占比" value={`${groupTemplateRate}%`} subtitle={`${stats.groupTemplateCount} / ${stats.l4ProcessCount}`} icon={<Shield className="h-5 w-5" />} />
        <StatCard title="IT 覆盖率" value={`${coverageRate}%`} subtitle={`已覆盖 ${stats.itYesCount}`} icon={<Wifi className="h-5 w-5" />} />
        <StatCard title="修订计划数" value={revision?.totalPlans ?? '--'} subtitle={`已下发 ${revision?.publishedPlans ?? 0}`} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard title="修订完成率" value={revision ? `${revision.completionRate}%` : '--'} subtitle={`完成 ${revision?.totalCompleted ?? 0} / ${revision?.totalTasks ?? 0}`} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      {/* 图表区：堆叠柱状图 + 双饼图 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <L1BarChart data={stats.l1Stats} />
        <div className="space-y-4">
          <CategoryPieChart data={stats.categoryDistribution} />
          <FormatPieChart data={stats.formatDistribution} />
        </div>
      </div>

      {/* 修订计划统计区：月度趋势 + 任务状态分布 */}
      {revision && revision.monthlyTrend.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RevisionTrendChart data={revision.monthlyTrend} />
          <TaskStatusDonut
            data={revision.currentMonthTaskStatus}
            total={revision.currentMonthTaskStatus.reduce((s, d) => s + d.count, 0)}
            label={`${revision.currentMonth}计划`}
          />
        </div>
      )}

      {/* 业务域明细统计表 */}
      <L1Table data={stats.l1Stats} />

      {/* ============================================ */}
      {/* Section 2: 端到端流程工作情况 */}
      {/* ============================================ */}
      <div className="pt-4">
        <SectionTitle number="二、" title="端到端流程工作情况" linkHref="/e2e/overview" linkText="端到端流程概览" />
      </div>

      {/* 6指标卡 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard title="端到端流程总数" value={e2eTotal} accent icon={<GitBranch className="h-5 w-5" />} />
        <StatCard title="平均贯通率" value={`${avgE2ERate}%`} accent icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="已完成数" value={completedE2E} subtitle={`共 ${e2eTotal} 条`} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard title="梳理计划数" value={e2e?.planTotal ?? '--'} subtitle={`进行中 ${e2e?.planInProgress ?? 0}`} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard title="梳理完成率" value={e2e ? `${e2e.planCompletionRate}%` : '--'} subtitle={`完成 ${e2e?.planCompleted ?? 0} / ${e2e?.planTotal ?? 0}`} icon={<Target className="h-5 w-5" />} />
        <StatCard title="平均计划进度" value={e2e ? `${e2e.avgPlanProgress}%` : '--'} subtitle={`实际进度 ${e2e?.avgActualProgress ?? 0}%`} icon={<ChartBar className="h-5 w-5" />} />
      </div>

      {/* 端到端流程图表 */}
      {e2e && e2e.processes.length > 0 ? (
        <>
          <E2EProgressChart data={e2e.processes} />

          {/* 梳理计划统计区 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <E2EPlanProgressChart data={e2e.processPlanProgress} />
            <E2EPlanStatusDonut data={e2e.planStatusDist} total={e2e.planTotal} />
          </div>

          <E2EDetailTable data={e2e.processes} />
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">暂无端到端流程数据</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="border-t pt-4 text-xs text-muted-foreground">
        <span>数据统计截止时间：{new Date().toLocaleDateString('zh-CN')}，数据来源：流程清单 / 修订计划 / 端到端流程 / 梳理计划</span>
      </div>
    </div>
  );
}
