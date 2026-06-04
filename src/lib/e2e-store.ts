import path from 'path';
import fs from 'fs';

// ---- 数据类型 ----

export interface E2EProcess {
  id: string;
  name: string;
  owner: string;
  department: string;
  responsiblePerson: string;
  currentProgress: number;
  targetProgress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  startDate?: string;
  completedDate?: string;
  description?: string;
}

export interface E2EPlan {
  id: string;
  processId: string;
  planType: 'monthly' | 'quarterly';
  year: number;
  period: number;
  planContent: string;
  planProgress: number;
  actualProgress?: number;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
  notes?: string;
}

// ---- 文件读写工具 ----

function getDataDir(): string {
  const isProd = process.env.COZE_PROJECT_ENV === 'PROD';
  if (isProd) {
    const dir = '/tmp/e2e-data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      // 从 public 初始数据复制
      const publicDir = path.join(process.cwd(), 'public');
      ['e2e-processes.json', 'e2e-plans.json'].forEach((file) => {
        const src = path.join(publicDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(dir, file));
        }
      });
    }
    return dir;
  }
  return path.join(process.cwd(), 'public');
}

function readJsonFile<T>(filename: string): T[] {
  const filePath = path.join(getDataDir(), filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T[];
  } catch {
    return [];
  }
}

function writeJsonFile<T>(filename: string, data: T[]): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---- E2E Process CRUD ----

export function getProcesses(): E2EProcess[] {
  return readJsonFile<E2EProcess>('e2e-processes.json');
}

export function getProcessById(id: string): E2EProcess | undefined {
  return getProcesses().find((p) => p.id === id);
}

export function createProcess(process: Omit<E2EProcess, 'id'>): E2EProcess {
  const processes = getProcesses();
  const maxNum = processes.reduce((max, p) => {
    const num = parseInt(p.id.replace('e2e-', ''), 10);
    return num > max ? num : max;
  }, 0);
  const id = `e2e-${String(maxNum + 1).padStart(3, '0')}`;
  const newProcess: E2EProcess = { ...process, id };
  processes.push(newProcess);
  writeJsonFile('e2e-processes.json', processes);
  return newProcess;
}

export function updateProcess(id: string, updates: Partial<E2EProcess>): E2EProcess | null {
  const processes = getProcesses();
  const index = processes.findIndex((p) => p.id === id);
  if (index === -1) return null;
  processes[index] = { ...processes[index], ...updates, id };
  writeJsonFile('e2e-processes.json', processes);
  return processes[index];
}

export function deleteProcess(id: string): boolean {
  const processes = getProcesses();
  const filtered = processes.filter((p) => p.id !== id);
  if (filtered.length === processes.length) return false;
  writeJsonFile('e2e-processes.json', filtered);
  return true;
}

// ---- E2E Plan CRUD ----

export function getPlans(): E2EPlan[] {
  return readJsonFile<E2EPlan>('e2e-plans.json');
}

export function getPlansByProcessId(processId: string): E2EPlan[] {
  return getPlans().filter((p) => p.processId === processId);
}

export function createPlan(plan: Omit<E2EPlan, 'id'>): E2EPlan {
  const plans = getPlans();
  const id = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newPlan: E2EPlan = { ...plan, id };
  plans.push(newPlan);
  writeJsonFile('e2e-plans.json', plans);
  return newPlan;
}

export function updatePlan(id: string, updates: Partial<E2EPlan>): E2EPlan | null {
  const plans = getPlans();
  const index = plans.findIndex((p) => p.id === id);
  if (index === -1) return null;
  plans[index] = { ...plans[index], ...updates, id };
  writeJsonFile('e2e-plans.json', plans);
  return plans[index];
}

export function deletePlan(id: string): boolean {
  const plans = getPlans();
  const filtered = plans.filter((p) => p.id !== id);
  if (filtered.length === plans.length) return false;
  writeJsonFile('e2e-plans.json', filtered);
  return true;
}
