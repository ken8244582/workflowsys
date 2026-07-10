import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import { getAssessmentWithDetails } from '@/lib/assessment-data';
import * as XLSX from 'xlsx';
import { ASSESSMENT_TEMPLATE_BASE64 } from '@/lib/assessment-template';

// GET /api/assessments/[id]/export - Export assessment as Excel (based on template)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const { id } = await params;
    const assessmentId = parseInt(id);
    if (isNaN(assessmentId)) {
      return NextResponse.json({ error: '无效的ID' }, { status: 400 });
    }

    const assessment = await getAssessmentWithDetails(assessmentId);
    if (!assessment) {
      return NextResponse.json({ error: '自评不存在' }, { status: 404 });
    }

    const details = assessment.details || [];

    // Build assessment detail lookup: standard_id (DB id) -> { current_status, self_score }
    const detailMap = new Map<number, { currentStatus: string; selfScore: number }>();
    for (const d of details) {
      detailMap.set(d.standard_id, {
        currentStatus: d.current_status || '',
        selfScore: typeof d.self_score === 'number' ? d.self_score : parseFloat(String(d.self_score)) || 0,
      });
    }

    // Load template Excel
    const templateBuffer = Buffer.from(ASSESSMENT_TEMPLATE_BASE64, 'base64');
    const wb = XLSX.read(templateBuffer, { type: 'buffer' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];

    // Update J1 header with assessment period
    const j1Cell = ws['J1'];
    if (j1Cell) {
      j1Cell.v = `${assessment.period || '自评'}实际值`;
    }

    // Clear all I and J data cells (rows 2-179) first
    for (let R = 2; R <= 179; R++) {
      const iAddr = 'I' + R;
      const jAddr = 'J' + R;
      const iCell = ws[iAddr];
      const jCell = ws[jAddr];
      if (iCell) { iCell.v = ''; iCell.t = 's'; }
      if (jCell) { jCell.v = ''; jCell.t = 's'; }
    }

    // Mechanism section (rows 2-29): no I/J merges, each row has its own I and J
    // DB id = row - 1 (row 2 -> id 1, row 3 -> id 2, etc.)
    for (let R = 2; R <= 29; R++) {
      const dbId = R - 1;
      const detail = detailMap.get(dbId);

      if (detail && detail.currentStatus) {
        const addr = 'I' + R;
        if (ws[addr]) { ws[addr].v = detail.currentStatus; ws[addr].t = 's'; }
        else { ws[addr] = { t: 's', v: detail.currentStatus }; }
      }

      if (detail && detail.selfScore > 0) {
        const addr = 'J' + R;
        if (ws[addr]) { ws[addr].v = detail.selfScore; ws[addr].t = 'n'; }
        else { ws[addr] = { t: 'n', v: detail.selfScore }; }
      }
    }

    // Operation/IT section (rows 30-179): I and J are merged in groups of 5 rows
    // For each merged group, we need to:
    // 1. Find the current_status from the first standard in the group (程度1)
    // 2. Find the self_score from whichever standard in the group has score > 0
    // Both values go into the first cell of the merged region

    const merges = ws['!merges'] || [];

    // I column merges in operation/IT section (col I = 8 in 0-indexed)
    const iMerges = merges.filter((m: XLSX.Range) => m.s.c === 8 && m.s.r >= 29 && m.s.r <= 178);
    // J column merges in operation/IT section (col J = 9 in 0-indexed)
    const jMerges = merges.filter((m: XLSX.Range) => m.s.c === 9 && m.s.r >= 29 && m.s.r <= 178);

    // For I column (current_status): get from the first standard in the group
    for (const merge of iMerges) {
      const firstRow = merge.s.r + 1; // 1-indexed Excel row
      const lastRow = merge.e.r + 1;
      const firstDbId = firstRow - 1; // DB id for first row in group

      // Get current_status from first standard (程度1)
      const detail = detailMap.get(firstDbId);

      if (detail && detail.currentStatus) {
        const addr = 'I' + firstRow;
        if (ws[addr]) { ws[addr].v = detail.currentStatus; ws[addr].t = 's'; }
        else { ws[addr] = { t: 's', v: detail.currentStatus }; }
      }
    }

    // For J column (self_score): find the standard in the group with score > 0
    for (const merge of jMerges) {
      const firstRow = merge.s.r + 1; // 1-indexed Excel row
      const lastRow = merge.e.r + 1;

      // Search all rows in this merge group for a non-zero score
      let scoreValue = 0;
      for (let R = firstRow; R <= lastRow; R++) {
        const dbId = R - 1;
        const detail = detailMap.get(dbId);
        if (detail && detail.selfScore > 0) {
          scoreValue = detail.selfScore;
          break;
        }
      }

      if (scoreValue > 0) {
        const addr = 'J' + firstRow;
        if (ws[addr]) { ws[addr].v = scoreValue; ws[addr].t = 'n'; }
        else { ws[addr] = { t: 'n', v: scoreValue }; }
      }
    }

    // Update summary rows (180-183)
    const totalScore = parseFloat(String(assessment.total_score)) || 0;
    const mechanismScore = parseFloat(String(assessment.mechanism_score)) || 0;
    const operationScore = parseFloat(String(assessment.operation_score)) || 0;
    const itScore = parseFloat(String(assessment.it_score)) || 0;

    const j180 = ws['J180'];
    if (j180) { j180.v = mechanismScore; j180.t = 'n'; }
    const j181 = ws['J181'];
    if (j181) { j181.v = operationScore; j181.t = 'n'; }
    const j182 = ws['J182'];
    if (j182) { j182.v = itScore; j182.t = 'n'; }
    const j183 = ws['J183'];
    if (j183) { j183.v = totalScore; j183.t = 'n'; }

    // Generate Excel buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = encodeURIComponent(`${assessment.name || '自评'}_${assessment.period || ''}.xlsx`);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '导出自评失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
