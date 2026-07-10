import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { STANDARDS_DATA } from '@/lib/assessment-standards-data';

// POST /api/assessment/seed - Seed assessment standards from embedded data
export async function POST() {
  const supabase = getSupabaseClient();

  // Check if already seeded
  const { count } = await supabase
    .from('assessment_standards')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    return NextResponse.json({ message: `已存在${count}条标准项，跳过初始化` });
  }

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

  // Insert in batches
  const batchSize = 50;
  let totalInserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from('assessment_standards').insert(batch);
    if (error) {
      return NextResponse.json({ error: `插入失败(batch ${i}): ${error.message}` }, { status: 500 });
    }
    totalInserted += batch.length;
  }

  return NextResponse.json({ message: `成功初始化${totalInserted}条标准项` });
}
