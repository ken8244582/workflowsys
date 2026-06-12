import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth, isSession } from '@/lib/api-auth';

// GET /api/flows/l4-owners - Get unique L4 owners from flows
export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('flows')
    .select('l4_owner')
    .neq('l4_owner', '')
    .is('l4_owner', 'not.null');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unique owners
  const owners = Array.from(new Set(data?.map(f => f.l4_owner).filter(Boolean))).sort();

  return NextResponse.json({ owners });
}