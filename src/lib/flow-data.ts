export interface FlowItem {
  id: number;
  l1Domain: string;
  l1Owner: string;
  l2Group: string;
  l2Owner: string;
  l3Segment: string;
  l3Owner: string;
  processCode: string;
  l4Process: string;
  version: string;
  department: string;
  l4Owner: string;
  format: string;
  category: string;
  itCoverage: string;
  itSubCategory: string;
  itScore: number;
  status: '正式运行' | '试运行' | '已废止' | '';
}

export interface RevisionRecord {
  id: number;
  revisionDate: string;
  processCode: string;
  l4Process: string;
  version: string;
  l1Domain: string;
  l2Group: string;
  l3Segment: string;
  revisionType: '废止' | '修订' | '新增';
  description: string;
  operator: string;
}

export interface L1Stat {
  name: string;
  totalCount: number;
  l4Count: number;
  processCount: number;
  methodCount: number;
  otherCount: number;
  groupTemplateCount: number;
  oldFormatCount: number;
  itYesCount: number;
  itNoCount: number;
}

export interface OverviewStats {
  totalRows: number;
  l4ProcessCount: number;
  l1DomainCount: number;
  l2GroupCount: number;
  processCount: number;
  methodCount: number;
  otherCount: number;
  groupTemplateCount: number;
  oldFormatCount: number;
  itYesCount: number;
  itNoCount: number;
  l1Stats: L1Stat[];
  versionDistribution: { version: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
  formatDistribution: { format: string; count: number }[];
  itDistribution: { status: string; count: number }[];
}

export interface RevisionPlan {
  id: number;
  planMonth: string;
  planName: string;
  status: '草稿' | '已下发' | '已归档';
  taskCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanTask {
  id: number;
  planId: number;
  flowItemId: number | null;
  processCode: string;
  processName: string;
  owner: string;
  taskType: '新增流程' | '内容修订' | '格式修订';
  description: string;
  status: '待执行' | '进行中' | '已完成' | '已顺延';
  completedAt: string | null;
  carriedFromPlanId: number | null;
  carriedToPlanId: number | null;
  sortOrder: number;
  remarks: string;
  createdAt: string;
}

export interface OwnerProgress {
  owner: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  carriedOver: number;
  completionRate: number;
}

export function computeStats(data: FlowItem[]): OverviewStats {
  const l4Data = data.filter((d) => d.l4Process);

  const l1Map = new Map<string, L1Stat>();
  const versionMap = new Map<string, number>();

  for (const item of data) {
    // L1 stats
    if (!l1Map.has(item.l1Domain)) {
      l1Map.set(item.l1Domain, {
        name: item.l1Domain,
        totalCount: 0,
        l4Count: 0,
        processCount: 0,
        methodCount: 0,
        otherCount: 0,
        groupTemplateCount: 0,
        oldFormatCount: 0,
        itYesCount: 0,
        itNoCount: 0,
      });
    }
    const stat = l1Map.get(item.l1Domain)!;
    stat.totalCount++;
    if (item.l4Process) {
      stat.l4Count++;
      if (item.category === '流程') stat.processCount++;
      else if (item.category === '办法') stat.methodCount++;
      else if (item.category) stat.otherCount++;

      if (item.format === '集团模板') stat.groupTemplateCount++;
      else if (item.format === '旧格式') stat.oldFormatCount++;

      if (item.itCoverage === '是') stat.itYesCount++;
      else if (item.itCoverage === '否') stat.itNoCount++;
    }

    // Version distribution
    if (item.version) {
      versionMap.set(item.version, (versionMap.get(item.version) || 0) + 1);
    }
  }

  const l1Stats = Array.from(l1Map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-CN')
  );

  const versionDistribution = Array.from(versionMap.entries())
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => b.count - a.count);

  // Category distribution
  const catMap = new Map<string, number>();
  for (const item of l4Data) {
    const key = item.category || '未填写';
    catMap.set(key, (catMap.get(key) || 0) + 1);
  }
  const categoryDistribution = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Format distribution
  const fmtMap = new Map<string, number>();
  for (const item of l4Data) {
    const key = item.format || '未填写';
    fmtMap.set(key, (fmtMap.get(key) || 0) + 1);
  }
  const formatDistribution = Array.from(fmtMap.entries())
    .map(([format, count]) => ({ format, count }))
    .sort((a, b) => b.count - a.count);

  // IT distribution
  const itMap = new Map<string, number>();
  for (const item of l4Data) {
    const key = item.itCoverage || '未填写';
    itMap.set(key, (itMap.get(key) || 0) + 1);
  }
  const itDistribution = Array.from(itMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const l1Domains = new Set(data.map((d) => d.l1Domain).filter(Boolean));
  const l2Groups = new Set(data.map((d) => d.l2Group).filter(Boolean));

  return {
    totalRows: data.length,
    l4ProcessCount: l4Data.length,
    l1DomainCount: l1Domains.size,
    l2GroupCount: l2Groups.size,
    processCount: l4Data.filter((d) => d.category === '流程').length,
    methodCount: l4Data.filter((d) => d.category === '办法').length,
    otherCount: l4Data.filter((d) => d.category && d.category !== '流程' && d.category !== '办法').length,
    groupTemplateCount: l4Data.filter((d) => d.format === '集团模板').length,
    oldFormatCount: l4Data.filter((d) => d.format === '旧格式').length,
    itYesCount: l4Data.filter((d) => d.itCoverage === '是').length,
    itNoCount: l4Data.filter((d) => d.itCoverage === '否').length,
    l1Stats,
    versionDistribution,
    categoryDistribution,
    formatDistribution,
    itDistribution,
  };
}
