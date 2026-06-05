'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, ChevronDown, Users } from 'lucide-react';

/* ========== Unified L1-L4 Hierarchy Icons ========== */
/* Nested rectangle icons showing containment: L1 (outermost) → L4 (innermost) */

function LevelIcon({ level, className }: { level: number; className?: string }) {
  const colors: Record<number, { stroke: string; fill: string }> = {
    1: { stroke: '#1e3a5f', fill: '#1e3a5f' },
    2: { stroke: '#2563eb', fill: '#2563eb' },
    3: { stroke: '#059669', fill: '#059669' },
    4: { stroke: '#d97706', fill: '#d97706' },
  };
  const c = colors[level] || colors[4];

  if (level === 1) {
    return (
      <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="14" height="14" rx="2.5" stroke={c.stroke} strokeWidth="1.5" fill={c.fill + '10'} />
        <rect x="4" y="4" width="8" height="8" rx="1.5" stroke={c.stroke} strokeWidth="1" strokeDasharray="2 1" fill="none" />
      </svg>
    );
  }
  if (level === 2) {
    return (
      <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="0.5" y="0.5" width="14" height="14" rx="2" stroke={c.stroke} strokeWidth="1.2" strokeDasharray="3 1.5" fill="none" />
        <rect x="3.5" y="3.5" width="8" height="8" rx="1.5" stroke={c.stroke} strokeWidth="1.2" fill={c.fill + '12'} />
        <rect x="5.5" y="5.5" width="4" height="4" rx="1" stroke={c.stroke} strokeWidth="0.8" strokeDasharray="1.5 1" fill="none" />
      </svg>
    );
  }
  if (level === 3) {
    return (
      <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="0.5" y="0.5" width="13" height="13" rx="2" stroke={c.stroke} strokeWidth="1" strokeDasharray="2.5 1.5" fill="none" />
        <rect x="3" y="3" width="8" height="8" rx="1.5" stroke={c.stroke} strokeWidth="1" strokeDasharray="1.5 1" fill="none" />
        <rect x="5" y="5" width="4" height="4" rx="1" stroke={c.stroke} strokeWidth="1" fill={c.fill + '15'} />
      </svg>
    );
  }
  // L4 - innermost solid filled dot/document
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0.5" y="0.5" width="12" height="12" rx="2" stroke={c.stroke} strokeWidth="0.8" strokeDasharray="2 1" fill="none" />
      <rect x="2.5" y="2.5" width="8" height="8" rx="1.5" stroke={c.stroke} strokeWidth="0.8" strokeDasharray="1.5 1" fill="none" />
      <rect x="4.5" y="4.5" width="4" height="4" rx="1" stroke={c.stroke} strokeWidth="0.8" strokeDasharray="1 0.5" fill="none" />
      <circle cx="6.5" cy="6.5" r="1.2" fill={c.fill} />
    </svg>
  );
}

/* Large level icon for stat cards */
function LevelIconLarge({ level }: { level: number }) {
  const colors: Record<number, { stroke: string; fill: string; label: string }> = {
    1: { stroke: '#1e3a5f', fill: '#1e3a5f', label: 'L1' },
    2: { stroke: '#2563eb', fill: '#2563eb', label: 'L2' },
    3: { stroke: '#059669', fill: '#059669', label: 'L3' },
    4: { stroke: '#d97706', fill: '#d97706', label: 'L4' },
  };
  const c = colors[level];

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      {level >= 1 && <rect x="1" y="1" width="18" height="18" rx="3" stroke={c.stroke} strokeWidth="1.5" fill={c.fill + '08'} />}
      {level >= 2 && <rect x="4" y="4" width="12" height="12" rx="2" stroke={c.stroke} strokeWidth="1.2" strokeDasharray="3 1.5" fill={c.fill + '0a'} />}
      {level >= 3 && <rect x="7" y="7" width="6" height="6" rx="1.5" stroke={c.stroke} strokeWidth="1" strokeDasharray="2 1" fill={c.fill + '0d'} />}
      {level >= 4 && <circle cx="10" cy="10" r="1.8" fill={c.fill} />}
      <text x="10" y="10" textAnchor="middle" dominantBaseline="central" fontSize="6" fontWeight="bold" fill={c.fill} opacity="0">
        {c.label}
      </text>
    </svg>
  );
}

interface FlowItem {
  id: number;
  l1Domain: string; l1Owner: string;
  l2Group: string; l2Owner: string;
  l3Segment: string; l3Owner: string;
  processCode: string; l4Process: string;
  version: string; department: string;
  l4Owner: string; format: string; category: string;
  itCoverage: string; itSubCategory: string;
  itScore: number; status: string;
}

interface L1Node {
  name: string; owner: string;
  l2Groups: L2Node[];
}
interface L2Node {
  name: string; owner: string;
  l3Segments: L3Node[];
}
interface L3Node {
  name: string; owner: string;
  l4Processes: { code: string; name: string; version: string; owner: string; format: string; category: string; status: string }[];
}

export default function ArchitecturePage() {
  const [data, setData] = useState<FlowItem[]>([]);
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set());
  const [expandedL3, setExpandedL3] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/flows?pageSize=9999')
      .then(r => r.json())
      .then(d => setData(d.items || []))
      .catch(() => {});
  }, []);

  // Build hierarchy
  const l1Map = new Map<string, { owner: string; l2Map: Map<string, { owner: string; l3Map: Map<string, { owner: string; items: FlowItem[] }> }> }>();
  for (const item of data) {
    if (!item.l4Process) continue;
    const l1 = item.l1Domain || '未分类';
    if (!l1Map.has(l1)) l1Map.set(l1, { owner: item.l1Owner, l2Map: new Map() });
    const l1Node = l1Map.get(l1)!;
    const l2 = item.l2Group || '未分组';
    if (!l1Node.l2Map.has(l2)) l1Node.l2Map.set(l2, { owner: item.l2Owner, l3Map: new Map() });
    const l2Node = l1Node.l2Map.get(l2)!;
    const l3 = item.l3Segment || '未分段';
    if (!l2Node.l3Map.has(l3)) l2Node.l3Map.set(l3, { owner: item.l3Owner, items: [] });
    l2Node.l3Map.get(l3)!.items.push(item);
  }

  const hierarchy: L1Node[] = [];
  for (const [l1Name, l1Node] of l1Map) {
    const l2Groups: L2Node[] = [];
    for (const [l2Name, l2Node] of l1Node.l2Map) {
      const l3Segments: L3Node[] = [];
      for (const [l3Name, l3Node] of l2Node.l3Map) {
        l3Segments.push({
          name: l3Name, owner: l3Node.owner,
          l4Processes: l3Node.items.map(i => ({
            code: i.processCode, name: i.l4Process, version: i.version,
            owner: i.l4Owner, format: i.format, category: i.category, status: i.status || '正式运行'
          }))
        });
      }
      l2Groups.push({ name: l2Name, owner: l2Node.owner, l3Segments });
    }
    hierarchy.push({ name: l1Name, owner: l1Node.owner, l2Groups });
  }

  // Stats table data
  const statsData = hierarchy.map(l1 => {
    const l2Count = l1.l2Groups.length;
    const l3Count = l1.l2Groups.reduce((s, l2) => s + l2.l3Segments.length, 0);
    const allL4 = l1.l2Groups.flatMap(l2 => l2.l3Segments.flatMap(l3 => l3.l4Processes));
    const l4Count = allL4.length;
    const templateCount = allL4.filter(p => p.format === '集团模板').length;
    const processCount = allL4.filter(p => p.category === '流程').length;
    const methodCount = allL4.filter(p => p.category === '办法').length;
    const otherCount = allL4.filter(p => p.category !== '流程' && p.category !== '办法').length;
    const templateRate = l4Count > 0 ? Math.round(templateCount / l4Count * 100) : 0;
    return { name: l1.name, owner: l1.owner, l2Count, l3Count, l4Count, templateCount, processCount, methodCount, otherCount, templateRate };
  });

  const totalL2 = statsData.reduce((s, d) => s + d.l2Count, 0);
  const totalL3 = statsData.reduce((s, d) => s + d.l3Count, 0);
  const totalL4 = statsData.reduce((s, d) => s + d.l4Count, 0);

  const toggleL1 = (name: string) => {
    setExpandedL1(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  };
  const toggleL2 = (key: string) => {
    setExpandedL2(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleL3 = (key: string) => {
    setExpandedL3(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const statusColor = (s: string) => {
    if (s === '已废止') return 'text-red-400 line-through';
    if (s === '试运行') return 'text-amber-600';
    return 'text-gray-700';
  };

  const formatTag = (f: string) => f === '集团模板'
    ? <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-medium">集团模板</span>
    : <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 font-medium">旧格式</span>;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'L1 业务域', value: hierarchy.length, level: 1, color: '#1e3a5f' },
          { label: 'L2 业务组', value: totalL2, level: 2, color: '#2563eb' },
          { label: 'L3 业务段', value: totalL3, level: 3, color: '#059669' },
          { label: 'L4 职能流程', value: totalL4, level: 4, color: '#d97706' },
        ].map(card => (
          <Card key={card.label} className="relative overflow-hidden transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{card.label}</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight leading-none" style={{ color: card.color }}>{card.value}</p>
                </div>
                <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl" style={{ backgroundColor: card.color + '15' }}>
                  <LevelIconLarge level={card.level} />
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(to right, ${card.color}, ${card.color}80, ${card.color})` }} />
          </Card>
        ))}
      </div>

      {/* Hierarchy View */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LevelIcon level={1} className="shrink-0" /> 流程架构层级
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {hierarchy.map(l1 => {
              const l1Open = expandedL1.has(l1.name);
              const l1L4Count = l1.l2Groups.reduce((s, l2) => s + l2.l3Segments.reduce((s2, l3) => s2 + l3.l4Processes.length, 0), 0);
              return (
                <div key={l1.name} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* L1 Header */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f]/5 cursor-pointer hover:bg-[#1e3a5f]/10 transition-colors"
                    onClick={() => toggleL1(l1.name)}
                  >
                    {l1Open ? <ChevronDown className="h-4 w-4 text-[#1e3a5f]" /> : <ChevronRight className="h-4 w-4 text-[#1e3a5f]" />}
                    <LevelIcon level={1} className="shrink-0" />
                    <span className="font-semibold text-sm text-[#1e3a5f]">{l1.name}</span>
                    <span className="text-xs text-gray-400 ml-1">{l1.l2Groups.length}个业务组 · {l1L4Count}个流程</span>
                    {l1.owner && <span className="ml-auto text-xs text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" />{l1.owner}</span>}
                  </div>

                  {/* L2 Children */}
                  {l1Open && l1.l2Groups.map(l2 => {
                    const l2Key = `${l1.name}/${l2.name}`;
                    const l2Open = expandedL2.has(l2Key);
                    const l2L4Count = l2.l3Segments.reduce((s, l3) => s + l3.l4Processes.length, 0);
                    return (
                      <div key={l2.name} className="ml-6 border-l-2 border-blue-200">
                        <div
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50/50 transition-colors"
                          onClick={() => toggleL2(l2Key)}
                        >
                          {l2Open ? <ChevronDown className="h-3.5 w-3.5 text-blue-600" /> : <ChevronRight className="h-3.5 w-3.5 text-blue-600" />}
                          <LevelIcon level={2} className="shrink-0" />
                          <span className="font-medium text-sm text-blue-800">{l2.name}</span>
                          <span className="text-xs text-gray-400">{l2.l3Segments.length}个业务段 · {l2L4Count}个流程</span>
                          {l2.owner && <span className="ml-auto text-xs text-gray-500">{l2.owner}</span>}
                        </div>

                        {/* L3 Children */}
                        {l2Open && l2.l3Segments.map(l3 => {
                          const l3Key = `${l2Key}/${l3.name}`;
                          const l3Open = expandedL3.has(l3Key);
                          return (
                            <div key={l3.name} className="ml-6 border-l-2 border-green-200">
                              <div
                                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-green-50/50 transition-colors"
                                onClick={() => toggleL3(l3Key)}
                              >
                                {l3Open ? <ChevronDown className="h-3 w-3 text-green-600" /> : <ChevronRight className="h-3 w-3 text-green-600" />}
                                <LevelIcon level={3} className="shrink-0" />
                                <span className="text-sm text-green-800">{l3.name}</span>
                                <span className="text-xs text-gray-400">{l3.l4Processes.length}个流程</span>
                                {l3.owner && <span className="ml-auto text-xs text-gray-500">{l3.owner}</span>}
                              </div>

                              {/* L4 List */}
                              {l3Open && (
                                <div className="ml-4 py-1">
                                  {l3.l4Processes.map((p, pi) => (
                                    <div key={pi} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 ${statusColor(p.status)}`}>
                                      <LevelIcon level={4} className="shrink-0" />
                                      <span className="font-mono text-gray-400 shrink-0">{p.code}</span>
                                      <span className={`${p.status === '已废止' ? 'line-through' : 'font-medium'} truncate`}>{p.name}</span>
                                      <span className="text-gray-400 shrink-0">v{p.version}</span>
                                      {formatTag(p.format)}
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 shrink-0">{p.category}</span>
                                      {p.status === '已废止' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-500 shrink-0">已废止</span>}
                                      {p.status === '试运行' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-600 shrink-0">试运行</span>}
                                      {p.owner && <span className="ml-auto text-gray-400 shrink-0">{p.owner}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LevelIconLarge level={1} /> 业务域详细统计
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-center w-10 font-semibold text-gray-700">序号</TableHead>
                <TableHead className="font-semibold text-gray-700">L1业务域</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">所有者</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">L2业务组</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">L3业务段</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">L4流程数</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">集团模板</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">模板占比</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">流程</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">办法</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">其它</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statsData.map((row, i) => (
                <TableRow key={row.name} className="hover:bg-gray-50/50">
                  <TableCell className="text-center text-gray-400">{i + 1}</TableCell>
                  <TableCell className="font-medium text-[#1e3a5f]">{row.name}</TableCell>
                  <TableCell className="text-center text-gray-500">{row.owner || '-'}</TableCell>
                  <TableCell className="text-center font-medium">{row.l2Count}</TableCell>
                  <TableCell className="text-center font-medium">{row.l3Count}</TableCell>
                  <TableCell className="text-center font-bold text-[#1e3a5f]">{row.l4Count}</TableCell>
                  <TableCell className="text-center">{row.templateCount}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.templateRate >= 50 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {row.templateRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{row.processCount}</span></TableCell>
                  <TableCell className="text-center"><span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{row.methodCount}</span></TableCell>
                  <TableCell className="text-center"><span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{row.otherCount}</span></TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow className="bg-[#1e3a5f]/5 font-bold">
                <TableCell className="text-center" colSpan={3}>合计</TableCell>
                <TableCell className="text-center">{totalL2}</TableCell>
                <TableCell className="text-center">{totalL3}</TableCell>
                <TableCell className="text-center text-[#1e3a5f]">{totalL4}</TableCell>
                <TableCell className="text-center">{statsData.reduce((s, d) => s + d.templateCount, 0)}</TableCell>
                <TableCell className="text-center">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                    {totalL4 > 0 ? Math.round(statsData.reduce((s, d) => s + d.templateCount, 0) / totalL4 * 100) : 0}%
                  </span>
                </TableCell>
                <TableCell className="text-center">{statsData.reduce((s, d) => s + d.processCount, 0)}</TableCell>
                <TableCell className="text-center">{statsData.reduce((s, d) => s + d.methodCount, 0)}</TableCell>
                <TableCell className="text-center">{statsData.reduce((s, d) => s + d.otherCount, 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
