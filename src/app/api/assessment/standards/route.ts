import { NextResponse } from 'next/server';
import { requireAuth, isSession } from '@/lib/api-auth';
import { getAllStandards, seedStandardsIfNeeded } from '@/lib/assessment-data';

// GET /api/assessment/standards - Get all assessment standards
export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    await seedStandardsIfNeeded();
    const standards = await getAllStandards();
    return NextResponse.json(standards);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '查询标准项失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
