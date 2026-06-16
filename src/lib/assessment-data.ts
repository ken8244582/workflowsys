import { getSupabaseClient } from '@/storage/database/supabase-client';
import { beijingNow } from './utils';
import { STANDARDS_DATA } from './assessment-standards-data';

// Types
export interface AssessmentStandard {
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

export interface Assessment {
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

export interface AssessmentDetail {
  id: number;
  assessment_id: number;
  standard_id: number;
  current_status: string;
  self_score: string;
  score_group_key: string;
}

export interface AssessmentWithDetails extends Assessment {
  details: AssessmentDetail[];
}

// Get all standards
export async function getAllStandards(): Promise<AssessmentStandard[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('assessment_standards')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(`查询标准项失败: ${error.message}`);
  return (data || []) as AssessmentStandard[];
}

// Get scoring groups (unique groups for the operation/it_coverage sections)
export async function getScoringGroups(): Promise<{ score_group_key: string; section_type: string; layer2: string; layer3: string; layer4: string }[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('assessment_standards')
    .select('score_group_key, section_type, layer2, layer3, layer4')
    .eq('is_scoring_row', true)
    .neq('section_type', 'mechanism')
    .order('sort_order');
  if (error) throw new Error(`查询评分组失败: ${error.message}`);
  
  // Deduplicate by score_group_key
  const seen = new Set<string>();
  const groups: { score_group_key: string; section_type: string; layer2: string; layer3: string; layer4: string }[] = [];
  for (const row of (data || [])) {
    if (!seen.has(row.score_group_key)) {
      seen.add(row.score_group_key);
      groups.push(row);
    }
  }
  return groups;
}

// Get all assessments (list view)
export async function getAssessments(): Promise<Assessment[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('assessments')
    .select('*')
    .order('id', { ascending: false });
  if (error) throw new Error(`查询自评列表失败: ${error.message}`);
  return (data || []) as Assessment[];
}

// Get single assessment with details
export async function getAssessmentWithDetails(assessmentId: number): Promise<AssessmentWithDetails | null> {
  const client = getSupabaseClient();
  
  const { data: assessment, error: aError } = await client
    .from('assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle();
  if (aError) throw new Error(`查询自评失败: ${aError.message}`);
  if (!assessment) return null;

  const { data: details, error: dError } = await client
    .from('assessment_details')
    .select('*')
    .eq('assessment_id', assessmentId);
  if (dError) throw new Error(`查询自评明细失败: ${dError.message}`);

  return {
    ...assessment,
    details: (details || []) as AssessmentDetail[],
  } as AssessmentWithDetails;
}

// Create a new assessment
export async function createAssessment(
  name: string,
  period: string,
  username: string
): Promise<Assessment> {
  const client = getSupabaseClient();
  const now = beijingNow();
  
  const { data, error } = await client
    .from('assessments')
    .insert({
      name,
      period,
      status: '草稿',
      total_score: '0',
      mechanism_score: '0',
      operation_score: '0',
      it_score: '0',
      remarks: '',
      created_by: username,
      created_at_ts: now,
      updated_by: username,
      updated_at_ts: now,
    })
    .select()
    .single();
  if (error) throw new Error(`创建自评失败: ${error.message}`);
  
  return data as Assessment;
}

// Save assessment details and calculate scores
export async function saveAssessmentDetails(
  assessmentId: number,
  details: { standard_id: number; current_status: string; self_score: string; score_group_key: string }[],
  username: string
): Promise<Assessment> {
  const client = getSupabaseClient();
  const now = beijingNow();
  
  // Delete existing details
  await client.from('assessment_details').delete().eq('assessment_id', assessmentId);
  
  // Insert new details
  if (details.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < details.length; i += batchSize) {
      const batch = details.slice(i, i + batchSize).map(d => ({
        assessment_id: assessmentId,
        standard_id: d.standard_id,
        current_status: d.current_status,
        self_score: d.self_score,
        score_group_key: d.score_group_key,
      }));
      const { error } = await client.from('assessment_details').insert(batch);
      if (error) throw new Error(`保存自评明细失败: ${error.message}`);
    }
  }
  
  // Calculate scores
  const scores = await calculateScores(assessmentId);
  
  // Update assessment
  const { data, error } = await client
    .from('assessments')
    .update({
      total_score: scores.total,
      mechanism_score: scores.mechanism,
      operation_score: scores.operation,
      it_score: scores.it,
      updated_by: username,
      updated_at_ts: now,
    })
    .eq('id', assessmentId)
    .select()
    .single();
  if (error) throw new Error(`更新自评得分失败: ${error.message}`);
  
  return data as Assessment;
}

// Calculate scores based on assessment details
async function calculateScores(assessmentId: number): Promise<{ mechanism: string; operation: string; it: string; total: string }> {
  const client = getSupabaseClient();
  
  // Get all details for this assessment
  const { data: details } = await client
    .from('assessment_details')
    .select('*')
    .eq('assessment_id', assessmentId);
  
  const detailMap = new Map<number, { self_score: string; score_group_key: string }>();
  for (const d of (details || [])) {
    detailMap.set(d.standard_id, { self_score: d.self_score, score_group_key: d.score_group_key });
  }
  
  // Get all standards
  const { data: standards } = await client
    .from('assessment_standards')
    .select('*')
    .order('sort_order');
  
  if (!standards) return { mechanism: '0', operation: '0', it: '0', total: '0' };
  
  // Section 1: Mechanism - simple sum of self_score for mechanism rows
  let mechanismSum = 0;
  const mechanismRows = standards.filter(s => s.section_type === 'mechanism');
  for (const row of mechanismRows) {
    const detail = detailMap.get(row.id);
    if (detail) {
      mechanismSum += parseFloat(detail.self_score) || 0;
    }
  }
  // Mechanism score = sum / 28 * 1
  const mechanismScore = mechanismSum / 28 * 1;
  
  // Section 2: Operation - for each scoring group, get the max self_score
  const operationGroups = new Map<string, number>(); // group_key -> max self_score
  const operationRows = standards.filter(s => s.section_type === 'operation');
  let operationMaxScore = 0;
  
  for (const row of operationRows) {
    if (row.is_scoring_row && row.score_group_key) {
      const detail = detailMap.get(row.id);
      const score = detail ? (parseFloat(detail.self_score) || 0) : 0;
      const currentMax = operationGroups.get(row.score_group_key) || 0;
      if (score > currentMax) {
        operationGroups.set(row.score_group_key, score);
      }
    }
    // Calculate max possible score for operation (max degree score per group)
  }
  
  // For operation, we need to know the max score per group
  const operationGroupMaxScores = new Map<string, number>();
  for (const row of operationRows) {
    if (row.is_scoring_row && row.score_group_key) {
      const currentMax = operationGroupMaxScores.get(row.score_group_key) || 0;
      if (row.standard_score > currentMax) {
        operationGroupMaxScores.set(row.score_group_key, row.standard_score);
      }
    }
  }
  
  let operationActualSum = 0;
  let operationMaxSum = 0;
  for (const [key, maxScore] of operationGroupMaxScores) {
    operationMaxSum += maxScore;
    operationActualSum += operationGroups.get(key) || 0;
  }
  
  // For non-degree rows in operation section (like row 30-34 管理标准 has degree rows)
  // Operation score = sum / 99 * 3
  const operationScore = operationActualSum / 99 * 3;
  
  // Section 3: IT coverage
  const itGroups = new Map<string, number>();
  const itRows = standards.filter(s => s.section_type === 'it_coverage');
  const itGroupMaxScores = new Map<string, number>();
  
  for (const row of itRows) {
    if (row.is_scoring_row && row.score_group_key) {
      const detail = detailMap.get(row.id);
      const score = detail ? (parseFloat(detail.self_score) || 0) : 0;
      const currentMax = itGroups.get(row.score_group_key) || 0;
      if (score > currentMax) {
        itGroups.set(row.score_group_key, score);
      }
      const groupMax = itGroupMaxScores.get(row.score_group_key) || 0;
      if (row.standard_score > groupMax) {
        itGroupMaxScores.set(row.score_group_key, row.standard_score);
      }
    }
  }
  
  let itActualSum = 0;
  let itMaxSum = 0;
  for (const [key, maxScore] of itGroupMaxScores) {
    itMaxSum += maxScore;
    itActualSum += itGroups.get(key) || 0;
  }
  
  // IT score = sum / 10 * 1
  const itScore = itActualSum / 10 * 1;
  
  const totalScore = mechanismScore + operationScore + itScore;
  
  return {
    mechanism: mechanismScore.toFixed(1),
    operation: operationScore.toFixed(1),
    it: itScore.toFixed(1),
    total: totalScore.toFixed(1),
  };
}

// Submit assessment (change status to 已提交)
export async function submitAssessment(assessmentId: number, username: string): Promise<Assessment> {
  const client = getSupabaseClient();
  const now = beijingNow();
  
  const { data, error } = await client
    .from('assessments')
    .update({
      status: '已提交',
      updated_by: username,
      updated_at_ts: now,
    })
    .eq('id', assessmentId)
    .select()
    .single();
  if (error) throw new Error(`提交自评失败: ${error.message}`);
  return data as Assessment;
}

// Delete assessment (any status allowed)
export async function deleteAssessment(assessmentId: number): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('assessments').delete().eq('id', assessmentId);
  if (error) throw new Error(`删除自评失败: ${error.message}`);
}

// Copy assessment from an existing one (creates a new draft with same details)
export async function copyAssessment(
  sourceId: number,
  name: string,
  period: string,
  username: string
): Promise<Assessment> {
  const client = getSupabaseClient();
  const now = beijingNow();

  // 1. Get source assessment details
  const source = await getAssessmentWithDetails(sourceId);
  if (!source) throw new Error('源自评不存在');

  // 2. Create new assessment as draft
  const { data: newAssessment, error: createError } = await client
    .from('assessments')
    .insert({
      name,
      period,
      status: '草稿',
      total_score: 0,
      mechanism_score: 0,
      operation_score: 0,
      it_score: 0,
      remarks: '',
      created_by: username,
      created_at_ts: now,
      updated_by: username,
      updated_at_ts: now,
    })
    .select()
    .single();

  if (createError) throw new Error(`复制自评失败: ${createError.message}`);
  const newId = (newAssessment as Assessment).id;

  // 3. Copy details from source
  if (source.details && source.details.length > 0) {
    const detailRows = source.details.map((d: AssessmentDetail) => ({
      assessment_id: newId,
      standard_id: d.standard_id,
      current_status: d.current_status,
      self_score: d.self_score,
      score_group_key: d.score_group_key,
    }));
    const { error: detailError } = await client.from('assessment_details').insert(detailRows);
    if (detailError) throw new Error(`复制自评明细失败: ${detailError.message}`);
  }

  // 4. Calculate and update scores based on copied details
  const scores = await calculateScores(newId);
  const { data: updated, error: updateError } = await client
    .from('assessments')
    .update({
      total_score: scores.total,
      mechanism_score: scores.mechanism,
      operation_score: scores.operation,
      it_score: scores.it,
      updated_by: username,
      updated_at_ts: now,
    })
    .eq('id', newId)
    .select()
    .single();
  if (updateError) throw new Error(`更新自评得分失败: ${updateError.message}`);
  return updated as Assessment;
}

// Update assessment info (name, period, remarks)
export async function updateAssessment(
  assessmentId: number,
  updates: { name?: string; period?: string; remarks?: string },
  username: string
): Promise<Assessment> {
  const client = getSupabaseClient();
  const now = beijingNow();
  
  const { data, error } = await client
    .from('assessments')
    .update({
      ...updates,
      updated_by: username,
      updated_at_ts: now,
    })
    .eq('id', assessmentId)
    .select()
    .single();
  if (error) throw new Error(`更新自评失败: ${error.message}`);
  return data as Assessment;
}

// Compare two assessments
export async function compareAssessments(
  assessmentId1: number,
  assessmentId2: number
): Promise<{ assessment1: AssessmentWithDetails; assessment2: AssessmentWithDetails }> {
  const a1 = await getAssessmentWithDetails(assessmentId1);
  const a2 = await getAssessmentWithDetails(assessmentId2);
  
  if (!a1) throw new Error('自评1不存在');
  if (!a2) throw new Error('自评2不存在');
  
  return { assessment1: a1, assessment2: a2 };
}

// Generate comparison report
export interface ComparisonReportItem {
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
}

export interface ComparisonReport {
  assessment1: { id: number; name: string; period: string };
  assessment2: { id: number; name: string; period: string };
  sections: {
    mechanism: { current: string; compare: string; diff: string };
    operation: { current: string; compare: string; diff: string };
    it: { current: string; compare: string; diff: string };
    total: { current: string; compare: string; diff: string };
  };
  items: ComparisonReportItem[];
  improvementAreas: string[];
}

export async function generateComparisonReport(
  currentAssessmentId: number,
  compareAssessmentId: number
): Promise<ComparisonReport> {
  const { assessment1, assessment2 } = await compareAssessments(currentAssessmentId, compareAssessmentId);
  
  const standards = await getAllStandards();
  
  // Build detail maps
  const detailMap1 = new Map<number, AssessmentDetail>();
  for (const d of assessment1.details) {
    detailMap1.set(d.standard_id, d);
  }
  const detailMap2 = new Map<number, AssessmentDetail>();
  for (const d of assessment2.details) {
    detailMap2.set(d.standard_id, d);
  }
  
  // Build comparison items for non-mechanism sections (group-based scoring)
  const groupScores1 = new Map<string, number>();
  const groupScores2 = new Map<string, number>();
  const groupMaxScores = new Map<string, number>();
  const groupInfo = new Map<string, { section_type: string; layer2: string; layer3: string; layer4: string }>();
  
  for (const std of standards) {
    if (!std.is_scoring_row || std.section_type === 'mechanism') continue;
    
    const key = std.score_group_key;
    const d1 = detailMap1.get(std.id);
    const d2 = detailMap2.get(std.id);
    
    const score1 = d1 ? (parseFloat(d1.self_score) || 0) : 0;
    const score2 = d2 ? (parseFloat(d2.self_score) || 0) : 0;
    
    const current1 = groupScores1.get(key) || 0;
    const current2 = groupScores2.get(key) || 0;
    
    if (score1 > current1) groupScores1.set(key, score1);
    if (score2 > current2) groupScores2.set(key, score2);
    
    const currentMax = groupMaxScores.get(key) || 0;
    if (std.standard_score > currentMax) {
      groupMaxScores.set(key, std.standard_score);
    }
    
    if (!groupInfo.has(key)) {
      groupInfo.set(key, {
        section_type: std.section_type,
        layer2: std.layer2,
        layer3: std.layer3,
        layer4: std.layer4,
      });
    }
  }
  
  const items: ComparisonReportItem[] = [];
  
  // Add mechanism items (each row is an item)
  for (const std of standards.filter(s => s.section_type === 'mechanism')) {
    const d1 = detailMap1.get(std.id);
    const d2 = detailMap2.get(std.id);
    const score1 = d1 ? (parseFloat(d1.self_score) || 0) : 0;
    const score2 = d2 ? (parseFloat(d2.self_score) || 0) : 0;
    
    items.push({
      section_type: std.section_type,
      layer2: std.layer2,
      layer3: std.layer3,
      layer4: std.layer4,
      score_group_key: std.score_group_key,
      current_score: score1,
      compare_score: score2,
      diff: score1 - score2,
      standard_max: std.standard_score,
      current_rate: std.standard_score > 0 ? score1 / std.standard_score : 0,
      compare_rate: std.standard_score > 0 ? score2 / std.standard_score : 0,
      improvement_needed: score1 < score2,
    });
  }
  
  // Add group-based items
  for (const [key, info] of groupInfo) {
    const score1 = groupScores1.get(key) || 0;
    const score2 = groupScores2.get(key) || 0;
    const maxScore = groupMaxScores.get(key) || 1;
    
    items.push({
      section_type: info.section_type,
      layer2: info.layer2,
      layer3: info.layer3,
      layer4: info.layer4,
      score_group_key: key,
      current_score: score1,
      compare_score: score2,
      diff: score1 - score2,
      standard_max: maxScore,
      current_rate: maxScore > 0 ? score1 / maxScore : 0,
      compare_rate: maxScore > 0 ? score2 / maxScore : 0,
      improvement_needed: score1 < score2,
    });
  }
  
  // Calculate section score differences
  const calcDiff = (a: string, b: string) => (parseFloat(a) - parseFloat(b)).toFixed(1);
  
  const sections = {
    mechanism: {
      current: assessment1.mechanism_score,
      compare: assessment2.mechanism_score,
      diff: calcDiff(assessment1.mechanism_score, assessment2.mechanism_score),
    },
    operation: {
      current: assessment1.operation_score,
      compare: assessment2.operation_score,
      diff: calcDiff(assessment1.operation_score, assessment2.operation_score),
    },
    it: {
      current: assessment1.it_score,
      compare: assessment2.it_score,
      diff: calcDiff(assessment1.it_score, assessment2.it_score),
    },
    total: {
      current: assessment1.total_score,
      compare: assessment2.total_score,
      diff: calcDiff(assessment1.total_score, assessment2.total_score),
    },
  };
  
  // Identify improvement areas
  const improvementAreas: string[] = [];
  const declinedItems = items.filter(i => i.improvement_needed);
  for (const item of declinedItems) {
    improvementAreas.push(`${item.layer3} > ${item.layer4}: 本次${item.current_score}分 vs 对比${item.compare_score}分 (下降${Math.abs(item.diff)}分)`);
  }
  
  // Also identify areas with low score rate
  const lowRateItems = items.filter(i => i.current_rate < 0.5 && i.current_rate > 0);
  for (const item of lowRateItems) {
    if (!item.improvement_needed) {
      improvementAreas.push(`${item.layer3} > ${item.layer4}: 得分率仅${(item.current_rate * 100).toFixed(0)}%，有较大提升空间`);
    }
  }
  
  return {
    assessment1: { id: assessment1.id, name: assessment1.name, period: assessment1.period },
    assessment2: { id: assessment2.id, name: assessment2.name, period: assessment2.period },
    sections,
    items,
    improvementAreas,
  };
}

// Seed assessment standards if not exist
export async function seedStandardsIfNeeded(): Promise<void> {
  const client = getSupabaseClient();
  
  const { count } = await client
    .from('assessment_standards')
    .select('*', { count: 'exact', head: true });
  
  if (count && count > 0) return;
  
  const records = STANDARDS_DATA.map((item, idx) => ({
    row_index: item.row_index,
    section_type: item.section_type,
    layer1: item.layer1,
    layer1_score: item.layer1_score,
    layer2: item.layer2,
    layer3: item.layer3,
    layer4: item.layer4,
    layer5: item.layer5,
    criteria_desc: item.criteria_desc,
    standard_score: item.standard_score,
    is_scoring_row: item.is_scoring_row,
    score_group_key: item.score_group_key,
    sort_order: idx + 1,
  }));
  
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await client.from('assessment_standards').insert(batch);
    if (error) throw new Error(`初始化标准项失败: ${error.message}`);
  }
}
