'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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

export default function AssessmentHistoryPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedId1, setSelectedId1] = useState<string>('');
  const [selectedId2, setSelectedId2] = useState<string>('');
  const [comparisonReport, setComparisonReport] = useState<ComparisonReport | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-[#1e3a5f] rounded" />
        <h1 className="text-xl font-bold text-foreground">自评历史与对比</h1>
      </div>

      {/* History List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">自评记录</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">自评名称</th>
                <th className="px-4 py-2 text-left font-medium">评价周期</th>
                <th className="px-4 py-2 text-left font-medium">状态</th>
                <th className="px-4 py-2 text-center font-medium">总分</th>
                <th className="px-4 py-2 text-center font-medium">机制建设</th>
                <th className="px-4 py-2 text-center font-medium">运行效果</th>
                <th className="px-4 py-2 text-center font-medium">IT提升</th>
                <th className="px-4 py-2 text-left font-medium">创建人</th>
                <th className="px-4 py-2 text-left font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {assessments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    暂无自评记录
                  </td>
                </tr>
              ) : (
                assessments.map(a => (
                  <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{a.name}</td>
                    <td className="px-4 py-2">{a.period}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={a.status === '草稿' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-semibold tabular-nums">{a.total_score}</td>
                    <td className="px-4 py-2 text-center font-mono tabular-nums">{a.mechanism_score}</td>
                    <td className="px-4 py-2 text-center font-mono tabular-nums">{a.operation_score}</td>
                    <td className="px-4 py-2 text-center font-mono tabular-nums">{a.it_score}</td>
                    <td className="px-4 py-2">{a.created_by}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{a.created_at_ts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
                <SelectTrigger>
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
                <SelectTrigger>
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
            >
              {loading ? '生成中...' : '生成对比报告'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Report */}
      {comparisonReport && (
        <>
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
    </div>
  );
}
