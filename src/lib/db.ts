import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'flow-management.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  _db.pragma('journal_mode = WAL');

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      l1_domain TEXT NOT NULL DEFAULT '',
      l1_owner TEXT NOT NULL DEFAULT '',
      l2_group TEXT NOT NULL DEFAULT '',
      l2_owner TEXT NOT NULL DEFAULT '',
      l3_segment TEXT NOT NULL DEFAULT '',
      l3_owner TEXT NOT NULL DEFAULT '',
      process_code TEXT NOT NULL DEFAULT '',
      l4_process TEXT NOT NULL DEFAULT '',
      version TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      l4_owner TEXT NOT NULL DEFAULT '',
      format TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      it_coverage TEXT NOT NULL DEFAULT '',
      it_sub_category TEXT NOT NULL DEFAULT '',
      it_score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS revision_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revision_date TEXT NOT NULL,
      process_code TEXT NOT NULL DEFAULT '',
      l4_process TEXT NOT NULL DEFAULT '',
      version TEXT NOT NULL DEFAULT '',
      l1_domain TEXT NOT NULL DEFAULT '',
      l2_group TEXT NOT NULL DEFAULT '',
      l3_segment TEXT NOT NULL DEFAULT '',
      revision_type TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      operator TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_flows_l1_domain ON flows(l1_domain);
    CREATE INDEX IF NOT EXISTS idx_flows_l2_group ON flows(l2_group);
    CREATE INDEX IF NOT EXISTS idx_flows_l3_segment ON flows(l3_segment);
    CREATE INDEX IF NOT EXISTS idx_flows_category ON flows(category);
    CREATE INDEX IF NOT EXISTS idx_flows_format ON flows(format);
    CREATE INDEX IF NOT EXISTS idx_flows_it_coverage ON flows(it_coverage);
    CREATE INDEX IF NOT EXISTS idx_flows_status ON flows(status);
    CREATE INDEX IF NOT EXISTS idx_revision_type ON revision_records(revision_type);
    CREATE INDEX IF NOT EXISTS idx_revision_l1_domain ON revision_records(l1_domain);

    CREATE TABLE IF NOT EXISTS revision_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_month TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '草稿',
      task_count INTEGER NOT NULL DEFAULT 0,
      completed_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(plan_month)
    );

    CREATE TABLE IF NOT EXISTS plan_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      flow_item_id INTEGER,
      process_code TEXT NOT NULL DEFAULT '',
      process_name TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      task_type TEXT NOT NULL DEFAULT '内容修订',
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '待执行',
      completed_at TEXT,
      carried_from_plan_id INTEGER,
      carried_to_plan_id INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      remarks TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (plan_id) REFERENCES revision_plans(id),
      FOREIGN KEY (flow_item_id) REFERENCES flows(id)
    );

    CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan_id ON plan_tasks(plan_id);
    CREATE INDEX IF NOT EXISTS idx_plan_tasks_department ON plan_tasks(department);
    CREATE INDEX IF NOT EXISTS idx_plan_tasks_status ON plan_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_plan_tasks_flow_item_id ON plan_tasks(flow_item_id);
    CREATE INDEX IF NOT EXISTS idx_revision_plans_month ON revision_plans(plan_month);
  `);

  // Seed data if flows table is empty
  const count = (_db.prepare('SELECT COUNT(*) as cnt FROM flows').get() as { cnt: number }).cnt;
  if (count === 0) {
    seedData(_db);
  }

  return _db;
}

function seedData(db: Database.Database) {
  const flowDataPath = path.join(process.cwd(), 'public', 'flow-data.json');
  if (!fs.existsSync(flowDataPath)) return;

  const raw = fs.readFileSync(flowDataPath, 'utf-8');
  const items = JSON.parse(raw);

  const insertFlow = db.prepare(`
    INSERT INTO flows (id, l1_domain, l1_owner, l2_group, l2_owner, l3_segment, l3_owner,
      process_code, l4_process, version, department, l4_owner, format, category,
      it_coverage, it_sub_category, it_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRevision = db.prepare(`
    INSERT INTO revision_records (revision_date, process_code, l4_process, version,
      l1_domain, l2_group, l3_segment, revision_type, description, operator)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const item of items) {
      insertFlow.run(
        item.id || null,
        item.l1Domain || '',
        item.l1Owner || '',
        item.l2Group || '',
        item.l2Owner || '',
        item.l3Segment || '',
        item.l3Owner || '',
        item.processCode || '',
        item.l4Process || '',
        item.version || '',
        item.department || '',
        item.l4Owner || '',
        item.format || '',
        item.category || '',
        item.itCoverage || '',
        item.itSubCategory || '',
        item.itScore ?? 0,
        item.status || ''
      );
    }

    // Seed revision records from existing file
    const revisionPath = path.join(process.cwd(), 'public', 'revision-records.json');
    if (fs.existsSync(revisionPath)) {
      try {
        const revRaw = fs.readFileSync(revisionPath, 'utf-8');
        const revItems = JSON.parse(revRaw);
        for (const item of revItems) {
          insertRevision.run(
            item.revisionDate || new Date().toISOString().slice(0, 19),
            item.processCode || '',
            item.l4Process || '',
            item.version || '',
            item.l1Domain || '',
            item.l2Group || '',
            item.l3Segment || '',
            item.revisionType || '',
            item.description || '',
            item.operator || ''
          );
        }
      } catch {
        // Ignore if file is empty or invalid
      }
    }
  });

  transaction();
  console.log(`Seeded ${items.length} flow items into SQLite database`);
}

// Row mapping helper: DB snake_case -> camelCase
export function mapFlowRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    l1Domain: row.l1_domain as string,
    l1Owner: row.l1_owner as string,
    l2Group: row.l2_group as string,
    l2Owner: row.l2_owner as string,
    l3Segment: row.l3_segment as string,
    l3Owner: row.l3_owner as string,
    processCode: row.process_code as string,
    l4Process: row.l4_process as string,
    version: row.version as string,
    department: row.department as string,
    l4Owner: row.l4_owner as string,
    format: row.format as string,
    category: row.category as string,
    itCoverage: row.it_coverage as string,
    itSubCategory: row.it_sub_category as string,
    itScore: row.it_score as number,
    status: row.status as string,
  };
}

export function mapRevisionRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    revisionDate: row.revision_date as string,
    processCode: row.process_code as string,
    l4Process: row.l4_process as string,
    version: row.version as string,
    l1Domain: row.l1_domain as string,
    l2Group: row.l2_group as string,
    l3Segment: row.l3_segment as string,
    revisionType: row.revision_type as string,
    description: row.description as string,
    operator: row.operator as string,
  };
}

export function mapPlanRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    planMonth: row.plan_month as string,
    planName: row.plan_name as string,
    status: row.status as string,
    taskCount: row.task_count as number,
    completedCount: row.completed_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapPlanTaskRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    planId: row.plan_id as number,
    flowItemId: row.flow_item_id as number | null,
    processCode: row.process_code as string,
    processName: row.process_name as string,
    owner: row.department as string,
    taskType: row.task_type as string,
    description: row.description as string,
    status: row.status as string,
    completedAt: row.completed_at as string | null,
    carriedFromPlanId: row.carried_from_plan_id as number | null,
    carriedToPlanId: row.carried_to_plan_id as number | null,
    sortOrder: row.sort_order as number,
    remarks: row.remarks as string,
    createdAt: row.created_at as string,
  };
}
