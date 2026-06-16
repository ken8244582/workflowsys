'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Search, Plus, Trash2, Copy, Download } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { PaginationBar } from '@/components/pagination-bar';

// Types
interface Standard {
  id: number;
  row_index: number;
  section_type: string;
  layer1: string;
  layer1_score: number;
  layer2: string;
  layer3: string;
  layer4: string;
  layer5: string;
  criteria_desc: string;
  standard_score: number;
  is_scoring_row: boolean;
  score_group_key: string;
  sort_order: number;
}

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

interface Detail {
  id: number;
  assessment_id: number;
  standard_id: number;
  current_status: string;
  self_score: string;
  score_group_key: string;
}

interface AssessmentWithDetails extends Assessment {
  details: Detail[];
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

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  '草稿': { bg: 'bg-slate-100', text: 'text-slate-600' },
  '已提交': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function MaturityAssessmentPage() {
  const { user, hasPermission } = useAuth();
  const MATURITY_PATH = '/assessment/maturity';
  const canAdd = hasPermission(MATURITY_PATH, 'add');
  const canEdit = hasPermission(MATURITY_PATH, 'edit');
  const canDelete = hasPermission(MATURITY_PATH, 'delete');
  const canExport = hasPermission(MATURITY_PATH, 'export');
  const [standards, setStandards] = useState<Standard[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentWithDetails | null>(null);
  const [detailMap, setDetailMap] = useState<Map<number, Detail>>(new Map());
  const [compareAssessmentId, setCompareAssessmentId] = useState<string>('');
  const [comparisonReport, setComparisonReport] = useState<ComparisonReport | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Search & pagination
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPeriod, setNewPeriod] = useState('');
  const [copyFromId, setCopyFromId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['mechanism', 'operation', 'it_coverage']));
  const [activeView, setActiveView] = useState<'list' | 'assess' | 'report'>('list');
  const [refAssessmentId, setRefAssessmentId] = useState<string>('');
  const [refDetailMap, setRefDetailMap] = useState<Map<number, Detail>>(new Map());

  // Fetch standards
  const fetchStandards = useCallback(async () => {
    try {
      const res = await fetch('/api/assessment/standards');
      if (res.ok) {
        const data = await res.json();
        setStandards(data);
      }
    } catch (e) {
      console.error('Failed to fetch standards:', e);
    }
  }, []);

  // Fetch assessments
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
    fetchStandards();
    fetchAssessments();
  }, [fetchStandards, fetchAssessments]);

  // Fetch reference assessment details when ref selection changes
  // fetchRefDetails effect moved after function definition

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

  // Load assessment with details
  const loadAssessment = async (id: number) => {
    try {
      const res = await fetch(`/api/assessments/${id}`);
      if (res.ok) {
        const data: AssessmentWithDetails = await res.json();
        setCurrentAssessment(data);
        const map = new Map<number, Detail>();
        // Initialize ALL standard rows with defaults first
        for (const std of standards) {
          map.set(std.id, {
            id: 0,
            assessment_id: id,
            standard_id: std.id,
            current_status: '',
            self_score: '0',
            score_group_key: std.score_group_key || '',
          });
        }
        // Then overlay with existing details from DB (normalize self_score to string)
        for (const d of data.details) {
          map.set(d.standard_id, {
            ...d,
            self_score: String(d.self_score ?? '0'),
            current_status: d.current_status || '',
          });
        }
        setDetailMap(map);
        setActiveView('assess');
      }
    } catch (e) {
      console.error('Failed to load assessment:', e);
    }
  };

  // Create new assessment (or copy)
  const handleCreate = async () => {
    if (!newName.trim() || !newPeriod.trim()) return;
    try {
      const body: { name: string; period: string; copyFromId?: number } = {
        name: newName.trim(),
        period: newPeriod.trim(),
      };
      if (copyFromId) {
        body.copyFromId = parseInt(copyFromId);
      }
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName('');
        setNewPeriod('');
        setCopyFromId('');
        await fetchAssessments();
      }
    } catch (e) {
      console.error('Failed to create assessment:', e);
    }
  };

  // Save assessment details
  const handleSave = async () => {
    if (!currentAssessment) return;
    setSaving(true);
    try {
      const details: { standard_id: number; current_status: string; self_score: string; score_group_key: string }[] = [];
      for (const [standardId, detail] of detailMap) {
        details.push({
          standard_id: standardId,
          current_status: detail.current_status,
          self_score: detail.self_score,
          score_group_key: detail.score_group_key,
        });
      }
      const res = await fetch(`/api/assessments/${currentAssessment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', details }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentAssessment(prev => prev ? { ...prev, ...updated } : null);
        await fetchAssessments();
      }
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  };

  // Submit assessment
  const handleSubmit = async () => {
    if (!currentAssessment) return;
    try {
      await handleSave();
      const res = await fetch(`/api/assessments/${currentAssessment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentAssessment(prev => prev ? { ...prev, ...updated } : null);
        await fetchAssessments();
      }
    } catch (e) {
      console.error('Failed to submit:', e);
    }
  };

  // Delete assessment (any status)
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/assessments/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        setDeleteName('');
        await fetchAssessments();
        if (currentAssessment?.id === deleteId) {
          setCurrentAssessment(null);
          setActiveView('list');
        }
      }
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  // Export assessment as Excel
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

  // Compare assessments
  const handleCompare = async () => {
    if (!currentAssessment || !compareAssessmentId) return;
    try {
      const res = await fetch(`/api/assessments/${currentAssessment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compare', compareAssessmentId: parseInt(compareAssessmentId) }),
      });
      if (res.ok) {
        const report = await res.json();
        setComparisonReport(report);
        setActiveView('report');
        setShowCompare(false);
      }
    } catch (e) {
      console.error('Failed to compare:', e);
    }
  };

  // Fetch reference assessment details for side-by-side comparison
  const fetchRefDetails = useCallback(async (assessmentId: number) => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      if (res.ok) {
        const data = await res.json();
        const map = new Map<number, Detail>();
        (data.details || []).forEach((d: Detail) => {
          map.set(d.standard_id, {
            ...d,
            self_score: String(d.self_score ?? '0'),
            current_status: d.current_status || '',
          });
        });
        setRefDetailMap(map);
      }
    } catch (e) {
      console.error('Failed to fetch reference details:', e);
    }
  }, []);

  // Fetch reference assessment details when selection changes
  useEffect(() => {
    if (refAssessmentId && activeView === 'assess') {
      fetchRefDetails(parseInt(refAssessmentId));
    } else {
      setRefDetailMap(new Map());
    }
  }, [refAssessmentId, activeView, fetchRefDetails]);

  // Update detail value
  const updateDetail = (standardId: number, field: 'current_status' | 'self_score', value: string) => {
    setDetailMap(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(standardId);
      const std = standards.find(s => s.id === standardId);
      newMap.set(standardId, {
        id: existing?.id || 0,
        assessment_id: currentAssessment?.id || 0,
        standard_id: standardId,
        current_status: field === 'current_status' ? value : (existing?.current_status || ''),
        self_score: field === 'self_score' ? value : String(existing?.self_score ?? '0'),
        score_group_key: existing?.score_group_key || std?.score_group_key || '',
      });
      return newMap;
    });
  };

  // Group standards by section
  const groupedStandards = standards.reduce((acc, std) => {
    if (!acc[std.section_type]) acc[std.section_type] = [];
    acc[std.section_type].push(std);
    return acc;
  }, {} as Record<string, Standard[]>);

  // Toggle section
  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Real-time score calculation based on current detailMap
  const liveScores = useMemo(() => {
    const mechanismStds = standards.filter(s => s.section_type === 'mechanism');
    const operationStds = standards.filter(s => s.section_type === 'operation');
    const itStds = standards.filter(s => s.section_type === 'it_coverage');

    // Mechanism: sum of self_score / 28 * 1
    const mechEarned = mechanismStds.reduce((sum, s) => {
      const detail = detailMap.get(s.id);
      return sum + (detail ? parseFloat(detail.self_score) || 0 : 0);
    }, 0);
    const mechanismScore = mechEarned / 28 * 1;

    // Operation: for each scoring group, find the max degree score, then scale to 28
    const opGroups = new Map<string, Standard[]>();
    for (const s of operationStds) {
      if (!opGroups.has(s.score_group_key)) opGroups.set(s.score_group_key, []);
      opGroups.get(s.score_group_key)!.push(s);
    }
    // Operation: sum of selected degrees / 99 * 3
    let opGroupEarnedTotal = 0;
    for (const [, groupStds] of opGroups) {
      const degreeRows = groupStds.filter(s => s.is_scoring_row);
      // Find the selected degree
      for (const dr of degreeRows) {
        const detail = detailMap.get(dr.id);
        if (detail && parseFloat(detail.self_score) > 0) {
          opGroupEarnedTotal += parseFloat(detail.self_score);
          break;
        }
      }
    }
    const operationScore = opGroupEarnedTotal / 99 * 3;

    // IT: same logic as operation, scale to 10
    const itGroups = new Map<string, Standard[]>();
    for (const s of itStds) {
      if (!itGroups.has(s.score_group_key)) itGroups.set(s.score_group_key, []);
      itGroups.get(s.score_group_key)!.push(s);
    }
    // IT: sum of selected degrees / 10 * 1
    let itGroupEarnedTotal = 0;
    for (const [, groupStds] of itGroups) {
      const degreeRows = groupStds.filter(s => s.is_scoring_row);
      for (const dr of degreeRows) {
        const detail = detailMap.get(dr.id);
        if (detail && parseFloat(detail.self_score) > 0) {
          itGroupEarnedTotal += parseFloat(detail.self_score);
          break;
        }
      }
    }
    const itScore = itGroupEarnedTotal / 10 * 1;

    const totalScore = mechanismScore + operationScore + itScore;

    return {
      total: totalScore,
      mechanism: mechanismScore,
      operation: operationScore,
      it: itScore,
    };
  }, [standards, detailMap]);

  // Get scoring groups for operation/it_coverage
  const getScoringGroups = (sectionStandards: Standard[]) => {
    const groups = new Map<string, Standard[]>();
    for (const std of sectionStandards) {
      const key = std.score_group_key;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(std);
    }
    return groups;
  };

  // Check if a scoring group has a score selected (for degree rows)
  const getGroupSelectedScore = (groupKey: string): number => {
    const groupStds = standards.filter(s => s.score_group_key === groupKey && s.is_scoring_row);
    for (const std of groupStds) {
      const detail = detailMap.get(std.id);
      if (detail && parseFloat(detail.self_score) > 0) {
        return std.id;
      }
    }
    return 0;
  };

  const getRefGroupSelectedScore = (groupKey: string): number => {
    const groupStds = standards.filter(s => s.score_group_key === groupKey && s.is_scoring_row);
    for (const std of groupStds) {
      const refDetail = refDetailMap.get(std.id);
      if (refDetail && parseFloat(refDetail.self_score) > 0) {
        return std.id;
      }
    }
    return 0;
  };

  // Select degree for a group
  const selectDegree = (groupKey: string, standardId: number) => {
    const std = standards.find(s => s.id === standardId);
    if (!std) return;
    
    // Clear all other degree rows in this group
    const groupStds = standards.filter(s => s.score_group_key === groupKey && s.is_scoring_row);
    for (const gs of groupStds) {
      if (gs.id === standardId) {
        // Set this one as selected
        updateDetail(gs.id, 'self_score', String(gs.standard_score));
      } else {
        // Clear others
        const existing = detailMap.get(gs.id);
        if (existing) {
          updateDetail(gs.id, 'self_score', '0');
        }
      }
    }
  };

  // Render the assessment list view
  const renderListView = () => (
    <>
      <div className="flex items-center justify-end">
        {canAdd && (
        <Button onClick={() => { setCopyFromId(''); setShowCreate(true); }} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 h-7 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />新增自评
        </Button>
        )}
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

      {/* Table - matching flow list style */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]">
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
                      暂无自评记录，点击"新增自评"开始
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedData.map(a => {
                    const badge = STATUS_BADGE[a.status] || STATUS_BADGE['草稿'];
                    return (
                      <TableRow key={a.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium whitespace-nowrap">{a.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{a.period}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {a.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono font-semibold tabular-nums">{a.total_score}</TableCell>
                        <TableCell className="text-center font-mono tabular-nums">{a.mechanism_score}</TableCell>
                        <TableCell className="text-center font-mono tabular-nums">{a.operation_score}</TableCell>
                        <TableCell className="text-center font-mono tabular-nums">{a.it_score}</TableCell>
                        <TableCell className="whitespace-nowrap">{a.created_by}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{a.created_at_ts}</TableCell>
                        <TableCell className="text-center sticky right-0 bg-white z-10">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => loadAssessment(a.id)}>
                              {a.status === '草稿' ? '填写' : '查看'}
                            </Button>
                            {canAdd && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="复制为新自评"
                              onClick={() => {
                                setCopyFromId(String(a.id));
                                setNewName(a.name + ' (副本)');
                                setNewPeriod(a.period);
                                setShowCreate(true);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 text-gray-500" />
                            </Button>
                            )}
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
                    );
                  })
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
    </>
  );

  // Render the assessment form view
  const renderAssessView = () => {
    if (!currentAssessment) return null;
    const isDraft = currentAssessment.status === '草稿';
    const canEditThis = isDraft && canEdit;

    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setCurrentAssessment(null); setActiveView('list'); }}>
              ← 返回列表
            </Button>
            <h2 className="text-lg font-semibold text-foreground">{currentAssessment.name}</h2>
            <Badge variant="outline" className={currentAssessment.status === '草稿' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'}>
              {currentAssessment.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {canEditThis && (
              <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
                {saving ? '保存中...' : '保存'}
              </Button>
            )}
            {canEditThis && (
              <Button onClick={handleSubmit} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" size="sm">
                提交
              </Button>
            )}
            {canExport && (
            <Button variant="outline" onClick={() => handleExport(currentAssessment.id)} className="h-7 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />导出
            </Button>
            )}
            {assessments.filter(a => a.id !== currentAssessment.id).length > 0 && (
              <Button variant="outline" onClick={() => setShowCompare(true)} size="sm">
                对比历史
              </Button>
            )}
          </div>
        </div>

        {/* Reference Assessment Selector */}
        {assessments.filter(a => a.id !== currentAssessment.id).length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm text-muted-foreground">参照历史自评：</span>
            <select
              className="text-sm border rounded-md px-2 py-1 bg-white"
              value={refAssessmentId}
              onChange={e => setRefAssessmentId(e.target.value)}
            >
              <option value="">不参照</option>
              {assessments
                .filter(a => a.id !== currentAssessment.id)
                .sort((a, b) => b.id - a.id)
                .map(a => (
                  <option key={a.id} value={a.id}>{a.name}（{a.period}）{a.status}</option>
                ))}
            </select>
            {refAssessmentId && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                参照列显示历史评分
              </span>
            )}
          </div>
        )}

        {/* Score Summary Cards - Sticky at top */}
        <div className="sticky top-14 z-30 bg-[#f8fafc] pt-1 pb-3 border-b">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '总得分', value: liveScores.total.toFixed(1), max: '5', color: 'text-[#1e3a5f]' },
              { label: '机制建设评价', value: liveScores.mechanism.toFixed(1), max: '1', color: 'text-blue-600' },
              { label: '运行效果评价', value: liveScores.operation.toFixed(1), max: '3', color: 'text-emerald-600' },
              { label: 'IT覆盖与支撑', value: liveScores.it.toFixed(1), max: '1', color: 'text-amber-600' },
            ].map(card => (
              <Card key={card.label} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                  <div className={`text-xl font-bold font-mono tabular-nums ${card.color}`}>
                    {card.value}
                    <span className="text-sm text-muted-foreground font-normal">/{card.max}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Assessment Sections */}
        {['mechanism', 'operation', 'it_coverage'].map(sectionType => {
          const sectionStds = groupedStandards[sectionType] || [];
          if (sectionStds.length === 0) return null;
          const isExpanded = expandedSections.has(sectionType);

          return (
            <Card key={sectionType}>
              <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection(sectionType)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {SECTION_LABELS[sectionType]}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (满分{sectionType === 'mechanism' ? '28' : sectionType === 'operation' ? '99' : '10'}分)
                    </span>
                  </CardTitle>
                  <span className="text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0">
                  {sectionType === 'mechanism' ? (
                    // Mechanism section: simple table with yes/no scoring
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead>
                          <tr className="bg-muted/50 border-b">
                            <th className="px-3 py-2 text-left font-medium w-12">序号</th>
                            <th className="px-3 py-2 text-left font-medium">分层2</th>
                            <th className="px-3 py-2 text-left font-medium">分层3</th>
                            <th className="px-3 py-2 text-left font-medium">评价项</th>
                            <th className="px-3 py-2 text-left font-medium">评价标准</th>
                            <th className="px-3 py-2 text-center font-medium w-16">标准分</th>
                            <th className="px-3 py-2 text-left font-medium min-w-[200px]">现状情况</th>
                            <th className="px-3 py-2 text-center font-medium w-20">自评分</th>
                            {refDetailMap.size > 0 && (
                              <th className="px-3 py-2 text-center font-medium w-20 text-amber-600">参照分</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {sectionStds.map((std, idx) => {
                            const detail = detailMap.get(std.id);
                            const statusVal = detail?.current_status || '';
                            const scoreVal = String(detail?.self_score ?? '0');
                            const refScore = String(refDetailMap.get(std.id)?.self_score ?? '');
                            return (
                              <tr key={std.id} className="border-b last:border-b-0 hover:bg-muted/20">
                                <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                <td className="px-3 py-2 text-muted-foreground text-xs">{std.layer2}</td>
                                <td className="px-3 py-2 text-muted-foreground text-xs">{std.layer3}</td>
                                <td className="px-3 py-2 font-medium">{std.layer4}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{std.criteria_desc}</td>
                                <td className="px-3 py-2 text-center font-mono">{std.standard_score}</td>
                                <td className="px-3 py-2">
                                  {canEditThis ? (
                                    <Textarea
                                      value={statusVal}
                                      onChange={e => updateDetail(std.id, 'current_status', e.target.value)}
                                      placeholder="填写现状..."
                                      className="text-sm min-h-[60px] resize-y"
                                      rows={2}
                                    />
                                  ) : (
                                    <span className="text-xs whitespace-pre-wrap">{statusVal || '-'}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {canEditThis ? (
                                    <Select
                                      value={scoreVal === '1' ? '1' : '0'}
                                      onValueChange={v => updateDetail(std.id, 'self_score', v)}
                                    >
                                      <SelectTrigger className="h-8 w-16 text-sm mx-auto">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">0</SelectItem>
                                        <SelectItem value="1">1</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className={`font-mono font-semibold ${parseFloat(scoreVal) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      {scoreVal}
                                    </span>
                                  )}
                                </td>
                                {refDetailMap.size > 0 && (
                                  <td className="px-3 py-2 text-center">
                                    {refScore ? (
                                      <span className={`font-mono font-semibold ${parseFloat(refScore) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                        {refScore}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : sectionType === 'it_coverage' ? (
                    // IT coverage section: degree-based reference + decimal score input
                    <div className="space-y-4">
                      {Array.from(getScoringGroups(sectionStds)).map(([groupKey, groupStds]) => {
                        const selectedId = getGroupSelectedScore(groupKey);
                        const firstStd = groupStds[0];
                        const degreeRows = groupStds.filter(s => s.layer5 && s.layer5.startsWith('程度'));
                        // Get current score - find the std with score > 0
                        const scoredStd = groupStds.find(s => {
                          const d = detailMap.get(s.id);
                          return d && parseFloat(d.self_score) > 0;
                        });
                        const currentScore = scoredStd ? String(detailMap.get(scoredStd.id)?.self_score ?? '0') : '0';
                        // Check if the score exactly matches a degree's standard_score (integer selection via click)
                        const matchedDegreeRow = scoredStd ? degreeRows.find(dr => dr.id === scoredStd.id && parseFloat(String(dr.standard_score)) === parseFloat(currentScore)) : null;
                        const isIntegerSelection = !!matchedDegreeRow;
                        const refScore = (() => {
                          if (refDetailMap.size === 0) return null;
                          const refScoredStd = groupStds.find(s => {
                            const d = refDetailMap.get(s.id);
                            return d && parseFloat(d.self_score) > 0;
                          });
                          return refScoredStd ? String(refDetailMap.get(refScoredStd.id)?.self_score ?? null) : null;
                        })();

                        const handleDecimalScoreChange = (value: string) => {
                          const num = parseFloat(value);
                          if (isNaN(num) || num < 0) return;
                          // Clear all degree rows first, then set the score on the first degree row
                          for (const gs of groupStds) {
                            const existing = detailMap.get(gs.id);
                            if (existing) {
                              updateDetail(gs.id, 'self_score', '0');
                            }
                          }
                          if (num > 0) {
                            updateDetail(firstStd.id, 'self_score', String(num));
                          }
                        };

                        return (
                          <div key={groupKey} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium">{firstStd.layer2}</span>
                                <span className="mx-1 text-muted-foreground">&gt;</span>
                                <span className="text-sm font-medium">{firstStd.layer3}</span>
                                <span className="mx-1 text-muted-foreground">&gt;</span>
                                <span className="text-sm font-medium">{firstStd.layer4}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {parseFloat(currentScore) > 0 && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-600">
                                    {isIntegerSelection
                                      ? `已选择程度${matchedDegreeRow?.layer5?.replace('程度', '') || ''}（${currentScore}分）`
                                      : `自定义评分：${currentScore}分`}
                                  </Badge>
                                )}
                                {refScore !== null && refScore !== '0' && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                                    参照: {refScore}分
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Current Status */}
                            <div className="flex items-start gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0 pt-1.5">现状:</Label>
                              {canEditThis ? (
                                <Textarea
                                  value={detailMap.get(firstStd.id)?.current_status || ''}
                                  onChange={e => {
                                    updateDetail(firstStd.id, 'current_status', e.target.value);
                                  }}
                                  placeholder="填写现状情况..."
                                  className="text-sm min-h-[60px] resize-y"
                                  rows={2}
                                />
                              ) : (
                                <span className="text-sm whitespace-pre-wrap">{detailMap.get(firstStd.id)?.current_status || '-'}</span>
                              )}
                            </div>
                            {refDetailMap.size > 0 && refDetailMap.get(firstStd.id)?.current_status && (
                              <div className="flex items-start gap-2">
                                <Label className="text-xs text-amber-500 shrink-0 pt-1.5">参照:</Label>
                                <span className="text-xs whitespace-pre-wrap text-amber-700 bg-amber-50 rounded px-2 py-1">
                                  {refDetailMap.get(firstStd.id)?.current_status}
                                </span>
                              </div>
                            )}

                            {/* Degree Options as reference - click to quick select integer score */}
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">评分标准（点击可快速选分）:</Label>
                              {degreeRows.map(std => {
                                const isSelected = isIntegerSelection && selectedId === std.id;
                                const isRefSelected = refDetailMap.size > 0 && refDetailMap.get(std.id) && parseFloat(refDetailMap.get(std.id)!.self_score) > 0;
                                return (
                                  <div
                                    key={std.id}
                                    className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-blue-50 border border-blue-200'
                                        : isRefSelected
                                        ? 'bg-amber-50 border border-amber-200'
                                        : canEditThis
                                        ? 'hover:bg-muted/50 border border-transparent'
                                        : 'border border-transparent'
                                    }`}
                                    onClick={() => canEditThis && selectDegree(groupKey, std.id)}
                                  >
                                    <span className={`text-xs font-mono w-12 ${isSelected ? 'text-blue-600 font-semibold' : isRefSelected ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                                      {std.layer5}:
                                    </span>
                                    <span className={`text-xs flex-1 ${isSelected ? 'text-blue-700' : 'text-muted-foreground'}`}>
                                      {std.criteria_desc}
                                    </span>
                                    <span className={`text-xs font-mono ${isSelected ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}`}>
                                      {std.standard_score}分
                                    </span>
                                    {isSelected && (
                                      <span className="text-blue-600 text-sm">✓</span>
                                    )}
                                    {isRefSelected && !isSelected && (
                                      <span className="text-amber-500 text-xs">● 参照</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Decimal Score Input */}
                            <div className="flex items-center gap-3 pt-1">
                              <Label className="text-sm font-medium shrink-0">自评分值:</Label>
                              {canEditThis ? (
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="5"
                                  value={parseFloat(currentScore) > 0 ? currentScore : ''}
                                  onChange={e => handleDecimalScoreChange(e.target.value)}
                                  placeholder="输入分值，支持小数（如3.5）"
                                  className="w-48 text-sm"
                                />
                              ) : (
                                <span className="text-sm font-mono font-semibold text-blue-600">
                                  {parseFloat(currentScore) > 0 ? currentScore : '-'}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">支持小数分，如3.5分</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Operation section: degree-based scoring with group selection
                    <div className="space-y-4">
                      {Array.from(getScoringGroups(sectionStds)).map(([groupKey, groupStds]) => {
                        const selectedId = getGroupSelectedScore(groupKey);
                        const firstStd = groupStds[0];
                        const degreeRows = groupStds.filter(s => s.layer5 && s.layer5.startsWith('程度'));
                        
                        return (
                          <div key={groupKey} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium">{firstStd.layer2}</span>
                                <span className="mx-1 text-muted-foreground">&gt;</span>
                                <span className="text-sm font-medium">{firstStd.layer3}</span>
                                <span className="mx-1 text-muted-foreground">&gt;</span>
                                <span className="text-sm font-medium">{firstStd.layer4}</span>
                              </div>
                              {selectedId > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                                  已选择程度{standards.find(s => s.id === selectedId)?.layer5?.replace('程度', '') || ''}
                                </Badge>
                              )}
                              {refDetailMap.size > 0 && (() => {
                                const refSelectedId = getRefGroupSelectedScore(groupKey);
                                if (refSelectedId > 0) {
                                  const refStd = standards.find(s => s.id === refSelectedId);
                                  return (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                                      参照: 程度{refStd?.layer5?.replace('程度', '') || ''} ({refStd?.standard_score}分)
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            
                            {/* Current Status */}
                            <div className="flex items-start gap-2">
                              <Label className="text-xs text-muted-foreground shrink-0 pt-1.5">现状:</Label>
                              {canEditThis ? (
                                <Textarea
                                  value={detailMap.get(firstStd.id)?.current_status || ''}
                                  onChange={e => {
                                    updateDetail(firstStd.id, 'current_status', e.target.value);
                                  }}
                                  placeholder="填写现状情况..."
                                  className="text-sm min-h-[60px] resize-y"
                                  rows={2}
                                />
                              ) : (
                                <span className="text-sm whitespace-pre-wrap">{detailMap.get(firstStd.id)?.current_status || '-'}</span>
                              )}
                            </div>
                            {refDetailMap.size > 0 && refDetailMap.get(firstStd.id)?.current_status && (
                              <div className="flex items-start gap-2">
                                <Label className="text-xs text-amber-500 shrink-0 pt-1.5">参照:</Label>
                                <span className="text-xs whitespace-pre-wrap text-amber-700 bg-amber-50 rounded px-2 py-1">
                                  {refDetailMap.get(firstStd.id)?.current_status}
                                </span>
                              </div>
                            )}
                            
                            {/* Degree Options */}
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">评分标准:</Label>
                              {degreeRows.map(std => {
                                const isSelected = selectedId === std.id;
                                const isRefSelected = refDetailMap.size > 0 && refDetailMap.get(std.id) && parseFloat(refDetailMap.get(std.id)!.self_score) > 0;
                                return (
                                  <div
                                    key={std.id}
                                    className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-blue-50 border border-blue-200'
                                        : isRefSelected
                                        ? 'bg-amber-50 border border-amber-200'
                                        : canEditThis
                                        ? 'hover:bg-muted/50 border border-transparent'
                                        : 'border border-transparent'
                                    }`}
                                    onClick={() => canEditThis && selectDegree(groupKey, std.id)}
                                  >
                                    <span className={`text-xs font-mono w-12 ${isSelected ? 'text-blue-600 font-semibold' : isRefSelected ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                                      {std.layer5}:
                                    </span>
                                    <span className={`text-xs flex-1 ${isSelected ? 'text-blue-700' : 'text-muted-foreground'}`}>
                                      {std.criteria_desc}
                                    </span>
                                    <span className={`text-xs font-mono ${isSelected ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}`}>
                                      {std.standard_score}分
                                    </span>
                                    {isSelected && (
                                      <span className="text-blue-600 text-sm">✓</span>
                                    )}
                                    {isRefSelected && !isSelected && (
                                      <span className="text-amber-500 text-xs">● 参照</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </>
    );
  };

  // Render comparison report view
  const renderReportView = () => {
    if (!comparisonReport) return null;

    const { assessment1, assessment2, sections, items, improvementAreas } = comparisonReport;

    return (
      <>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setComparisonReport(null); setActiveView('assess'); }}>
            ← 返回自评
          </Button>
          <h2 className="text-lg font-semibold">自评对比报告</h2>
          <div className="flex-1" />
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

        {/* Overview comparison */}
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
                    {assessment1.name}
                    <span className="block text-xs text-muted-foreground">{assessment1.period}</span>
                  </th>
                  <th className="px-4 py-2 text-center font-medium">
                    {assessment2.name}
                    <span className="block text-xs text-muted-foreground">{assessment2.period}</span>
                  </th>
                  <th className="px-4 py-2 text-center font-medium">差异</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '总得分', ...sections.total },
                  { label: '机制建设评价', ...sections.mechanism },
                  { label: '运行效果评价', ...sections.operation },
                  { label: 'IT覆盖与支撑', ...sections.it },
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

        {/* Detail comparison by section */}
        {['mechanism', 'operation', 'it_coverage'].map(sectionType => {
          const sectionItems = items.filter(i => i.section_type === sectionType);
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
                      <th className="px-4 py-2 text-center font-medium">本次得分</th>
                      <th className="px-4 py-2 text-center font-medium">对比得分</th>
                      <th className="px-4 py-2 text-center font-medium">差异</th>
                      <th className="px-4 py-2 text-center font-medium">得分率</th>
                      <th className="px-4 py-2 text-center font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionItems.map((item, idx) => {
                      const diff = item.diff;
                      return (
                        <tr key={idx} className={`border-b last:border-b-0 ${item.improvement_needed ? 'bg-red-50/50' : ''}`}>
                          <td className="px-4 py-2">
                            <span className="text-xs text-muted-foreground">{item.layer3} &gt;</span>
                            <span className="ml-1">{item.layer4}</span>
                          </td>
                          <td className="px-4 py-2 text-center font-mono tabular-nums">{item.current_score}</td>
                          <td className="px-4 py-2 text-center font-mono tabular-nums">{item.compare_score}</td>
                          <td className={`px-4 py-2 text-center font-mono tabular-nums font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#1e3a5f] rounded-full"
                                  style={{ width: `${Math.min(item.current_rate * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{(item.current_rate * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.improvement_needed ? (
                              <Badge variant="outline" className="bg-red-50 text-red-600 text-xs">↓ 下降</Badge>
                            ) : diff > 0 ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 text-xs">↑ 提升</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-50 text-slate-500 text-xs">→ 持平</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}

        {/* Improvement Areas */}
        {improvementAreas.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-600">待改进方向</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {improvementAreas.map((area, idx) => (
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
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
        <h1 className="text-xl font-semibold text-[#1e3a5f]">成熟度自评</h1>
      </div>

      {activeView === 'list' && renderListView()}
      {activeView === 'assess' && renderAssessView()}
      {activeView === 'report' && renderReportView()}

      {/* Create Assessment Dialog (also used for copy) */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) { setCopyFromId(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copyFromId ? '从历史自评复制' : '新增自评'}</DialogTitle>
            <DialogDescription>
              {copyFromId
                ? '将基于选定的历史自评创建新草稿，包含所有评分明细，可在其基础上修改。'
                : '创建一个新的空白自评草稿。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!copyFromId && assessments.length > 0 && (
              <div className="space-y-2">
                <Label>从历史自评复制（可选）</Label>
                <Select value={copyFromId} onValueChange={setCopyFromId}>
                  <SelectTrigger>
                    <SelectValue placeholder="不复制，创建空白自评..." />
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
            )}
            {copyFromId && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                <Copy className="h-4 w-4" />
                <span>将复制自: {assessments.find(a => String(a.id) === copyFromId)?.name}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>自评名称</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="如：2026年Q1自评"
              />
            </div>
            <div className="space-y-2">
              <Label>评价周期</Label>
              <Input
                value={newPeriod}
                onChange={e => setNewPeriod(e.target.value)}
                placeholder="如：2026-Q1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setCopyFromId(''); }}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" disabled={!newName.trim() || !newPeriod.trim()}>
              {copyFromId ? '复制创建' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>选择对比的自评</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>选择历史自评</Label>
              <Select value={compareAssessmentId} onValueChange={setCompareAssessmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择要对比的自评..." />
                </SelectTrigger>
                <SelectContent>
                  {assessments
                    .filter(a => a.id !== currentAssessment?.id)
                    .map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} ({a.period}) - {a.total_score}分
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompare(false)}>取消</Button>
            <Button onClick={handleCompare} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" disabled={!compareAssessmentId}>
              生成对比报告
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation - with assessment name */}
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
