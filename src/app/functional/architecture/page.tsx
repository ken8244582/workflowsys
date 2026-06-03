'use client';

import { useEffect, useState } from 'react';
import { FlowItem, computeStats, OverviewStats } from '@/lib/flow-data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CHART_COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#84cc16', '#f43f5e', '#a855f7', '#14b8a6', '#e11d48', '#7c3aed', '#0ea5e9', '#d946ef'];

export default function FunctionalArchitecturePage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    fetch('/flow-data.json')
      .then((r) => r.json())
      .then((data: FlowItem[]) => {
        setStats(computeStats(data));
      });
  }, []);

  if (!stats) return <div className="py-20 text-center text-muted-foreground">加载中...</div>;

  // 分类分布饼图数据
  const categoryPie = stats.categoryDistribution.filter((d) => d.count > 0);

  // 格式分布饼图数据
  const formatPie = stats.formatDistribution.filter((d) => d.count > 0);

  // 业务域分类堆叠柱状图数据
  const stackedData = stats.l1Stats.map((s) => ({
    name: s.name.length > 8 ? s.name.slice(0, 8) + '…' : s.name,
    fullName: s.name,
    流程: s.processCount,
    办法: s.methodCount,
    其它: s.otherCount,
  }));

  // 版本分布 TOP10
  const versionTop10 = stats.versionDistribution
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((d) => ({ name: d.version, value: d.count }));

  return (
    <div className="space-y-8">
      {/* Section 标题 */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
        <h2 className="text-xl font-semibold text-[#1e3a5f]">职能流程工作情况</h2>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'L1 业务域', value: stats.l1DomainCount, suffix: '个' },
          { label: 'L4 流程总数', value: stats.l4ProcessCount, suffix: '个' },
          { label: '集团模板占比', value: stats.l4ProcessCount ? ((stats.groupTemplateCount / stats.l4ProcessCount) * 100).toFixed(1) : '0', suffix: '%' },
          { label: 'IT 覆盖率', value: stats.l4ProcessCount ? ((stats.itYesCount / stats.l4ProcessCount) * 100).toFixed(1) : '0', suffix: '%' },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#1e3a5f]">
                {card.value}<span className="ml-0.5 text-sm font-normal text-muted-foreground">{card.suffix}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 图表区域：左-分类堆叠柱状图 | 右-双饼图 */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">各业务域分类构成</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stackedData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value, '']} labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || '';
                }} />
                <Legend />
                <Bar dataKey="流程" stackId="a" fill={CHART_COLORS[0]} />
                <Bar dataKey="办法" stackId="a" fill={CHART_COLORS[2]} />
                <Bar dataKey="其它" stackId="a" fill={CHART_COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <div className="col-span-2 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">格式分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={formatPie} cx="50%" cy="50%" outerRadius={60} dataKey="count" nameKey="format" label={({ format, percent }: { format: string; percent: number }) => `${format} ${(percent * 100).toFixed(0)}%`}>
                    {formatPie.map((_, i) => (
                      <Cell key={i} fill={[CHART_COLORS[0], CHART_COLORS[3]][i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">分类分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryPie} cx="50%" cy="50%" outerRadius={60} dataKey="count" nameKey="category" label={({ category, percent }: { category: string; percent: number }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                    {categoryPie.map((_, i) => (
                      <Cell key={i} fill={[CHART_COLORS[0], CHART_COLORS[2], CHART_COLORS[3]][i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 版本分布 TOP10 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">版本分布 TOP10</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={versionTop10} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={60} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 业务域明细表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">业务域详细统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">业务域</th>
                  <th className="pb-2 pr-4 font-medium text-right">L4总数</th>
                  <th className="pb-2 pr-4 font-medium text-right">流程</th>
                  <th className="pb-2 pr-4 font-medium text-right">办法</th>
                  <th className="pb-2 pr-4 font-medium text-right">其它</th>
                  <th className="pb-2 pr-4 font-medium text-right">集团模板</th>
                  <th className="pb-2 pr-4 font-medium text-right">旧格式</th>
                  <th className="pb-2 font-medium text-right">IT覆盖</th>
                </tr>
              </thead>
              <tbody>
                {stats.l1Stats.map((s) => (
                  <tr key={s.name} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{s.name}</td>
                    <td className="py-2 pr-4 text-right">{s.l4Count}</td>
                    <td className="py-2 pr-4 text-right">{s.processCount}</td>
                    <td className="py-2 pr-4 text-right">{s.methodCount}</td>
                    <td className="py-2 pr-4 text-right">{s.otherCount}</td>
                    <td className="py-2 pr-4 text-right">{s.groupTemplateCount}</td>
                    <td className="py-2 pr-4 text-right">{s.oldFormatCount}</td>
                    <td className="py-2 text-right">{s.itYesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
