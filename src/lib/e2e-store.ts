/**
 * e2e-store.ts — E2E process & plan data access via Supabase database
 * Migrated from JSON file storage to database persistence (Bug B001 fix)
 */
import { getSupabaseClient } from './supabase';
import { beijingNow } from './utils';

// ---- Types ----

export interface E2EProcess {
  id: string;
  name: string;
  owner: string;
  department: string;
  responsible_person: string;
  current_progress: number;
  target_progress: number;
  status: string;
  start_date: string;
  completed_date: string;
  description: string;
  created_by: string;
  created_at_ts: string;
  updated_by: string;
  updated_at_ts: string;
}

export interface E2EPlan {
  id: string;
  process_id: string;
  plan_type: string;
  year: number;
  period: number;
  plan_content: string;
  plan_progress: number;
  actual_progress: number;
  status: string;
  notes: string;
  created_by: string;
  created_at_ts: string;
  updated_by: string;
  updated_at_ts: string;
}

export interface E2EProcessWithPlans extends E2EProcess {
  plans: E2EPlan[];
}

// ---- Process CRUD ----

export async function getAllProcesses(): Promise<E2EProcess[]> {
  const { data, error } = await getSupabaseClient()
    .from('e2e_processes')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getProcessById(id: string): Promise<E2EProcess | null> {
  const { data, error } = await getSupabaseClient()
    .from('e2e_processes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}

export async function createProcess(process: Omit<E2EProcess, 'id' | 'created_at_ts' | 'updated_at_ts'>, username: string): Promise<E2EProcess> {
  const now = beijingNow();
  const { data, error } = await getSupabaseClient()
    .from('e2e_processes')
    .insert({
      ...process,
      created_by: username,
      created_at_ts: now,
      updated_by: username,
      updated_at_ts: now,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProcess(id: string, updates: Partial<Omit<E2EProcess, 'id' | 'created_by' | 'created_at_ts'>>, username: string): Promise<E2EProcess> {
  const now = beijingNow();
  const { data, error } = await getSupabaseClient()
    .from('e2e_processes')
    .update({
      ...updates,
      updated_by: username,
      updated_at_ts: now,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProcess(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('e2e_processes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---- Plan CRUD ----

export async function getPlansByProcessId(processId: string): Promise<E2EPlan[]> {
  const { data, error } = await getSupabaseClient()
    .from('e2e_plans')
    .select('*')
    .eq('process_id', processId)
    .order('year', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAllPlans(): Promise<E2EPlan[]> {
  const { data, error } = await getSupabaseClient()
    .from('e2e_plans')
    .select('*')
    .order('year', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createPlan(plan: Omit<E2EPlan, 'id' | 'created_at_ts' | 'updated_at_ts'>, username: string): Promise<E2EPlan> {
  const now = beijingNow();
  const { data, error } = await getSupabaseClient()
    .from('e2e_plans')
    .insert({
      ...plan,
      created_by: username,
      created_at_ts: now,
      updated_by: username,
      updated_at_ts: now,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlan(id: string, updates: Partial<Omit<E2EPlan, 'id' | 'created_by' | 'created_at_ts'>>, username: string): Promise<E2EPlan> {
  const now = beijingNow();
  const { data, error } = await getSupabaseClient()
    .from('e2e_plans')
    .update({
      ...updates,
      updated_by: username,
      updated_at_ts: now,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('e2e_plans')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---- Composite: Process with Plans ----

export async function getAllProcessesWithPlans(): Promise<E2EProcessWithPlans[]> {
  const processes = await getAllProcesses();
  const allPlans = await getAllPlans();

  return processes.map(p => ({
    ...p,
    plans: allPlans.filter(plan => plan.process_id === p.id),
  }));
}

// ---- Statistics helpers ----

export interface E2EStats {
  totalProcesses: number;
  avgProgress: number;
  completedCount: number;
  maxYoYGrowth: { name: string; growth: number } | null;
}

export async function getE2EStats(): Promise<E2EStats> {
  const processes = await getAllProcesses();
  const total = processes.length;
  const avgProgress = total > 0
    ? Math.round(processes.reduce((sum, p) => sum + p.current_progress, 0) / total)
    : 0;
  const completedCount = processes.filter(p => p.status === 'completed').length;

  // Calculate year-over-year growth from plans
  const allPlans = await getAllPlans();
  const currentYear = new Date().getFullYear();
  const processYoY: Record<string, number> = {};

  for (const plan of allPlans) {
    if (plan.year === currentYear || plan.year === currentYear - 1) {
      if (!processYoY[plan.process_id]) processYoY[plan.process_id] = 0;
      if (plan.year === currentYear) {
        processYoY[plan.process_id] += plan.actual_progress;
      }
    }
  }

  let maxYoYGrowth: { name: string; growth: number } | null = null;
  for (const [processId, growth] of Object.entries(processYoY)) {
    if (!maxYoYGrowth || growth > maxYoYGrowth.growth) {
      const process = processes.find(p => p.id === processId);
      maxYoYGrowth = { name: process?.name || processId, growth };
    }
  }

  return { totalProcesses: total, avgProgress, completedCount, maxYoYGrowth };
}
