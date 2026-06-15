import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import { getAssessmentWithDetails } from '@/lib/assessment-data';
import * as XLSX from 'xlsx';

// GET /api/assessments/[id]/export - Export assessment as Excel (matching template format)
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

    // Build the Excel from the assessment standards data
    // Structure matches the template: A-H columns + I (现状情况) + J (自评分值)
    const wb = XLSX.utils.book_new();

    // Header row (row 1)
    const headerRow = [
      '分层1', '项目分值', '分层2', '分层3', '分层4',
      '分层5', '评价标准描述', '该项标准分值', '现状情况',
      `${assessment.period || '自评'}实际值`,
    ];

    // Use STANDARDS_DATA to rebuild the structure
    const { STANDARDS_DATA } = await import('@/lib/assessment-standards-data');

    // Build data rows (rows 2-179)
    const dataRows: (string | number)[][] = [];
    let currentLayer1 = '';
    let currentLayer1Score: number | string = '';
    let currentLayer2 = '';
    let currentLayer3 = '';
    let currentLayer4 = '';

    for (let idx = 0; idx < STANDARDS_DATA.length; idx++) {
      const std = STANDARDS_DATA[idx];
      // standard_id in DB = idx + 1 (since STANDARDS_DATA is seeded in order)
      const dbId = idx + 1;

      // Track hierarchical changes for merged cells display
      const layer1 = std.layer1 !== currentLayer1 ? std.layer1 : '';
      const layer1Score = std.layer1 !== currentLayer1 ? std.layer1_score : '';
      if (std.layer1) currentLayer1 = std.layer1;
      if (std.layer1_score) currentLayer1Score = std.layer1_score;

      const layer2 = std.layer2 !== currentLayer2 ? std.layer2 : '';
      if (std.layer2) currentLayer2 = std.layer2;

      const layer3 = std.layer3 !== currentLayer3 ? std.layer3 : '';
      if (std.layer3) currentLayer3 = std.layer3;

      const layer4 = std.layer4 !== currentLayer4 ? std.layer4 : '';
      if (std.layer4) currentLayer4 = std.layer4;

      // Get detail data for this standard by DB id
      const detail = detailMap.get(dbId);

      let currentStatus = '';
      let selfScore: string | number = '';

      if (detail) {
        currentStatus = detail.currentStatus;
        selfScore = detail.selfScore;
      }

      dataRows.push([
        layer1,
        layer1Score as string | number,
        layer2,
        layer3,
        layer4,
        std.layer5,
        std.criteria_desc,
        std.standard_score,
        currentStatus,
        selfScore,
      ]);
    }

    // Summary rows (180-183)
    const totalScore = parseFloat(String(assessment.total_score)) || 0;
    const mechanismScore = parseFloat(String(assessment.mechanism_score)) || 0;
    const operationScore = parseFloat(String(assessment.operation_score)) || 0;
    const itScore = parseFloat(String(assessment.it_score)) || 0;

    dataRows.push(['', '', '', '', '', '', '流程管理机制建设评价', '/', mechanismScore]);
    dataRows.push(['', '', '备注：程度描述按本项分数在不同程度之间平均分配，程度达到最高程度描述即为本项满分，结果保留1位小数', '', '', '', '流程运行实际效果评价', '', operationScore]);
    dataRows.push(['', '', '', '', '', '', 'L4级流程的IT覆盖度和IT支撑度提升', '', itScore]);
    dataRows.push(['', '', '', '', '', '', '合计', '', totalScore]);

    // Build the sheet
    const aoaData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoaData);

    // Set column widths
    ws['!cols'] = [
      { wch: 22 },  // A: 分层1
      { wch: 8 },   // B: 项目分值
      { wch: 14 },  // C: 分层2
      { wch: 14 },  // D: 分层3
      { wch: 22 },  // E: 分层4
      { wch: 6 },   // F: 分层5
      { wch: 60 },  // G: 评价标准描述
      { wch: 12 },  // H: 该项标准分值
      { wch: 60 },  // I: 现状情况
      { wch: 14 },  // J: 自评分值
    ];

    // Build merges matching the template structure
    const merges: XLSX.Range[] = [];

    // A column: A2-A29 (mechanism), A30-A169 (operation), A170-A179 (IT)
    merges.push({ s: { r: 1, c: 0 }, e: { r: 28, c: 0 } });
    merges.push({ s: { r: 29, c: 0 }, e: { r: 168, c: 0 } });
    merges.push({ s: { r: 169, c: 0 }, e: { r: 178, c: 0 } });

    // B column: same as A
    merges.push({ s: { r: 1, c: 1 }, e: { r: 28, c: 1 } });
    merges.push({ s: { r: 29, c: 1 }, e: { r: 168, c: 1 } });
    merges.push({ s: { r: 169, c: 1 }, e: { r: 178, c: 1 } });

    // C column (layer2) - merge by group
    const cGroups = [
      [1, 4], [5, 13], [14, 22], [23, 28],  // mechanism section
      [29, 48], [49, 93], [94, 138], [139, 168],  // operation section
      [169, 178],  // IT section
    ];
    for (const [start, end] of cGroups) {
      if (end > start) merges.push({ s: { r: start, c: 2 }, e: { r: end, c: 2 } });
    }

    // D column (layer3) - merge groups based on actual data
    const dGroups: [number, number][] = [];
    let dStart = 1;
    for (let i = 2; i <= 178; i++) {
      const currentD = STANDARDS_DATA[i - 1]?.layer3 || '';
      const prevD = STANDARDS_DATA[i - 2]?.layer3 || '';
      if (currentD !== prevD || i === 178) {
        if (i - 1 > dStart) {
          dGroups.push([dStart, i === 178 ? 178 : i - 1]);
        }
        dStart = i;
      }
    }
    // Use simpler approach: merge D by same layer3 contiguous groups
    let dGroupStart = 1;
    for (let i = 2; i <= 179; i++) {
      const currVal = i <= 178 ? (STANDARDS_DATA[i - 1]?.layer3 || '') : '__END__';
      const prevVal = STANDARDS_DATA[i - 2]?.layer3 || '';
      if (currVal !== prevVal) {
        if (i - 1 > dGroupStart) {
          merges.push({ s: { r: dGroupStart, c: 3 }, e: { r: i - 2, c: 3 } });
        }
        dGroupStart = i - 1;
      }
    }

    // E column (layer4) - merge groups for operation/IT sections
    let eGroupStart = 29; // Start from operation section
    for (let i = 30; i <= 179; i++) {
      const currVal = i <= 178 ? (STANDARDS_DATA[i - 1]?.layer4 || '') : '__END__';
      const prevVal = STANDARDS_DATA[i - 2]?.layer4 || '';
      if (currVal !== prevVal) {
        if (i - 1 > eGroupStart) {
          merges.push({ s: { r: eGroupStart, c: 4 }, e: { r: i - 2, c: 4 } });
        }
        eGroupStart = i - 1;
      }
    }

    // F column: merge for mechanism (F2-F29)
    merges.push({ s: { r: 1, c: 5 }, e: { r: 28, c: 5 } });

    // I column: merge for operation/IT sections (same layer4 groups)
    let iGroupStart = 29;
    for (let i = 30; i <= 179; i++) {
      const currVal = i <= 178 ? (STANDARDS_DATA[i - 1]?.layer4 || '') : '__END__';
      const prevVal = STANDARDS_DATA[i - 2]?.layer4 || '';
      if (currVal !== prevVal) {
        if (i - 1 > iGroupStart) {
          merges.push({ s: { r: iGroupStart, c: 8 }, e: { r: i - 2, c: 8 } });
        }
        iGroupStart = i - 1;
      }
    }

    // J column: merge for operation/IT sections (same as I)
    let jGroupStart = 29;
    for (let i = 30; i <= 179; i++) {
      const currVal = i <= 178 ? (STANDARDS_DATA[i - 1]?.layer4 || '') : '__END__';
      const prevVal = STANDARDS_DATA[i - 2]?.layer4 || '';
      if (currVal !== prevVal) {
        if (i - 1 > jGroupStart) {
          merges.push({ s: { r: jGroupStart, c: 9 }, e: { r: i - 2, c: 9 } });
        }
        jGroupStart = i - 1;
      }
    }

    // Summary row merges
    merges.push({ s: { r: 181, c: 3 }, e: { r: 181, c: 4 } }); // D182-E182 备注

    ws['!merges'] = merges;

    XLSX.utils.book_append_sheet(wb, ws, '流程管理评价标准');

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
