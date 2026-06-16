import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { generateComparisonReport } from '@/lib/assessment-data';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult || 'error' in authResult) {
    return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assessmentId1, assessmentId2 } = body;

    if (!assessmentId1 || !assessmentId2) {
      return NextResponse.json({ error: '请提供两个自评ID' }, { status: 400 });
    }

    const report = await generateComparisonReport(Number(assessmentId1), Number(assessmentId2));
    if (!report) {
      return NextResponse.json({ error: '生成对比报告失败' }, { status: 500 });
    }

    const workbook = new ExcelJS.Workbook();
    const { assessment1, assessment2, sections, items, improvementAreas } = report;

    const SECTION_LABELS: Record<string, string> = {
      mechanism: '机制建设评价',
      operation: '运行效果评价',
      it_coverage: 'IT覆盖与支撑',
    };

    // Sheet1: 总览对比
    const overviewSheet = workbook.addWorksheet('总览对比');
    overviewSheet.columns = [
      { header: '评价维度', key: 'dimension', width: 20 },
      { header: `${assessment1.name}(${assessment1.period})`, key: 'a', width: 22 },
      { header: `${assessment2.name}(${assessment2.period})`, key: 'b', width: 22 },
      { header: '差异', key: 'diff', width: 14 },
    ];

    // Style header
    const headerRow = overviewSheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    headerRow.alignment = { horizontal: 'center' };

    const overviewData = [
      { dimension: '总得分', a: sections.total.current, b: sections.total.compare, diff: sections.total.diff },
      { dimension: '机制建设评价', a: sections.mechanism.current, b: sections.mechanism.compare, diff: sections.mechanism.diff },
      { dimension: '运行效果评价', a: sections.operation.current, b: sections.operation.compare, diff: sections.operation.diff },
      { dimension: 'IT覆盖与支撑', a: sections.it.current, b: sections.it.compare, diff: sections.it.diff },
    ];

    overviewData.forEach(row => {
      const r = overviewSheet.addRow(row);
      const diffVal = parseFloat(row.diff);
      const diffCell = r.getCell(4);
      if (diffVal > 0) {
        diffCell.font = { color: { argb: 'FF059669' }, bold: true };
      } else if (diffVal < 0) {
        diffCell.font = { color: { argb: 'FFDC2626' }, bold: true };
      }
      diffCell.alignment = { horizontal: 'center' };
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).alignment = { horizontal: 'center' };
    });

    // Sheet2-4: 各板块明细对比
    for (const sectionType of ['mechanism', 'operation', 'it_coverage'] as const) {
      const sectionItems = items.filter(i => i.section_type === sectionType);
      if (sectionItems.length === 0) continue;

      const sheet = workbook.addWorksheet(SECTION_LABELS[sectionType]);
      sheet.columns = [
        { header: '评价项', key: 'item', width: 40 },
        { header: `${assessment1.name}得分`, key: 'a_score', width: 18 },
        { header: `${assessment2.name}得分`, key: 'b_score', width: 18 },
        { header: '差异', key: 'diff', width: 12 },
        { header: 'A得分率', key: 'a_rate', width: 14 },
        { header: '状态', key: 'status', width: 12 },
      ];

      const sHeaderRow = sheet.getRow(1);
      sHeaderRow.font = { bold: true, size: 11 };
      sHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      sHeaderRow.alignment = { horizontal: 'center' };

      sectionItems.forEach(item => {
        const statusText = item.improvement_needed ? '↓ 下降' : item.diff > 0 ? '↑ 提升' : '→ 持平';
        const r = sheet.addRow({
          item: `${item.layer3} > ${item.layer4}`,
          a_score: item.current_score,
          b_score: item.compare_score,
          diff: item.diff > 0 ? `+${item.diff}` : `${item.diff}`,
          a_rate: `${(item.current_rate * 100).toFixed(0)}%`,
          status: statusText,
        });
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(3).alignment = { horizontal: 'center' };
        r.getCell(4).alignment = { horizontal: 'center' };
        r.getCell(5).alignment = { horizontal: 'center' };
        r.getCell(6).alignment = { horizontal: 'center' };

        const diffCell = r.getCell(4);
        if (item.diff > 0) {
          diffCell.font = { color: { argb: 'FF059669' }, bold: true };
        } else if (item.diff < 0) {
          diffCell.font = { color: { argb: 'FFDC2626' }, bold: true };
        }

        if (item.improvement_needed) {
          r.eachCell((cell: ExcelJS.Cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
          });
        }
      });
    }

    // Sheet5: 待改进方向
    if (improvementAreas.length > 0) {
      const impSheet = workbook.addWorksheet('待改进方向');
      impSheet.columns = [
        { header: '序号', key: 'idx', width: 8 },
        { header: '待改进方向', key: 'area', width: 80 },
      ];
      const impHeader = impSheet.getRow(1);
      impHeader.font = { bold: true, size: 11 };
      impHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      impHeader.alignment = { horizontal: 'center' };

      improvementAreas.forEach((area, idx) => {
        const r = impSheet.addRow({ idx: idx + 1, area });
        r.getCell(1).alignment = { horizontal: 'center' };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `自评对比报告_${assessment1.name}_vs_${assessment2.name}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('Compare export error:', error);
    return NextResponse.json({ error: '导出对比报告失败' }, { status: 500 });
  }
}
