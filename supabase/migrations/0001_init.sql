-- ============================================================
-- workflowsys 本地 Supabase 初始结构迁移
-- 由 supabase start / supabase db reset 自动执行
-- 表结构以 src/storage/database/shared/schema.ts 为权威来源
-- 业务表启用 RLS 并放开 anon 全权策略（自部署场景，业务侧自建 token 鉴权）
-- 系统表不加 RLS，后端通过 COZE_SUPABASE_SERVICE_ROLE_KEY 访问
-- ============================================================

-- --------------------------------------------
-- 流程清单
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS flows (
  id SERIAL PRIMARY KEY,
  l1_domain TEXT DEFAULT '' NOT NULL,
  l1_owner TEXT DEFAULT '' NOT NULL,
  l2_group TEXT DEFAULT '' NOT NULL,
  l2_owner TEXT DEFAULT '' NOT NULL,
  l3_segment TEXT DEFAULT '' NOT NULL,
  l3_owner TEXT DEFAULT '' NOT NULL,
  process_code TEXT DEFAULT '' NOT NULL,
  l4_process TEXT DEFAULT '' NOT NULL,
  version TEXT DEFAULT '' NOT NULL,
  department TEXT DEFAULT '' NOT NULL,
  l4_owner TEXT DEFAULT '' NOT NULL,
  format TEXT DEFAULT '' NOT NULL,
  category TEXT DEFAULT '' NOT NULL,
  it_coverage TEXT DEFAULT '' NOT NULL,
  it_sub_category TEXT DEFAULT '' NOT NULL,
  it_score INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT '' NOT NULL,
  created_by TEXT DEFAULT '' NOT NULL,
  created_at_ts TEXT DEFAULT '' NOT NULL,
  updated_by TEXT DEFAULT '' NOT NULL,
  updated_at_ts TEXT DEFAULT '' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_flows_category ON flows (category);
CREATE INDEX IF NOT EXISTS idx_flows_format ON flows (format);
CREATE INDEX IF NOT EXISTS idx_flows_it_coverage ON flows (it_coverage);
CREATE INDEX IF NOT EXISTS idx_flows_l1_domain ON flows (l1_domain);
CREATE INDEX IF NOT EXISTS idx_flows_l2_group ON flows (l2_group);
CREATE INDEX IF NOT EXISTS idx_flows_l3_segment ON flows (l3_segment);
CREATE INDEX IF NOT EXISTS idx_flows_status ON flows (status);

-- --------------------------------------------
-- 健康检查（迁移占位表）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------
-- 修订记录
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS revision_records (
  id SERIAL PRIMARY KEY,
  revision_date TEXT NOT NULL,
  process_code TEXT DEFAULT '' NOT NULL,
  l4_process TEXT DEFAULT '' NOT NULL,
  version TEXT DEFAULT '' NOT NULL,
  l1_domain TEXT DEFAULT '' NOT NULL,
  l2_group TEXT DEFAULT '' NOT NULL,
  l3_segment TEXT DEFAULT '' NOT NULL,
  revision_type TEXT DEFAULT '' NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  operator TEXT DEFAULT '' NOT NULL,
  created_by TEXT DEFAULT '' NOT NULL,
  created_at_ts TEXT DEFAULT '' NOT NULL,
  updated_by TEXT DEFAULT '' NOT NULL,
  updated_at_ts TEXT DEFAULT '' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revision_l1_domain ON revision_records (l1_domain);
CREATE INDEX IF NOT EXISTS idx_revision_type ON revision_records (revision_type);

-- --------------------------------------------
-- 修订计划
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS revision_plans (
  id SERIAL PRIMARY KEY,
  plan_month TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT DEFAULT '草稿' NOT NULL,
  task_count INTEGER DEFAULT 0 NOT NULL,
  completed_count INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT DEFAULT '' NOT NULL,
  updated_at TEXT DEFAULT '' NOT NULL,
  created_by TEXT DEFAULT '' NOT NULL,
  updated_by TEXT DEFAULT '' NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revision_plans_month ON revision_plans (plan_month);

-- --------------------------------------------
-- 修订计划任务
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS plan_tasks (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  flow_item_id INTEGER,
  process_code TEXT DEFAULT '' NOT NULL,
  process_name TEXT DEFAULT '' NOT NULL,
  owner TEXT DEFAULT '' NOT NULL,
  department TEXT DEFAULT '' NOT NULL,
  task_type TEXT DEFAULT '内容修订' NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  status TEXT DEFAULT '待执行' NOT NULL,
  completed_at TEXT,
  carried_from_plan_id INTEGER,
  carried_to_plan_id INTEGER,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  remarks TEXT DEFAULT '' NOT NULL,
  version TEXT DEFAULT '' NOT NULL,
  format TEXT DEFAULT '' NOT NULL,
  category TEXT DEFAULT '' NOT NULL,
  created_at TEXT DEFAULT '' NOT NULL,
  created_by TEXT DEFAULT '' NOT NULL,
  updated_by TEXT DEFAULT '' NOT NULL,
  updated_at_ts TEXT DEFAULT '' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_department ON plan_tasks (department);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_flow_item_id ON plan_tasks (flow_item_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan_id ON plan_tasks (plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_status ON plan_tasks (status);

-- --------------------------------------------
-- 端到端流程
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS e2e_processes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT DEFAULT '' NOT NULL,
  owner TEXT DEFAULT '' NOT NULL,
  department TEXT DEFAULT '' NOT NULL,
  responsible_person TEXT DEFAULT '' NOT NULL,
  current_progress INTEGER DEFAULT 0 NOT NULL,
  target_progress INTEGER DEFAULT 100 NOT NULL,
  status TEXT DEFAULT 'not_started' NOT NULL,
  start_date TEXT DEFAULT '',
  completed_date TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_by TEXT DEFAULT '' NOT NULL,
  created_at_ts TEXT DEFAULT '' NOT NULL,
  updated_by TEXT DEFAULT '' NOT NULL,
  updated_at_ts TEXT DEFAULT '' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_e2e_processes_department ON e2e_processes (department);
CREATE INDEX IF NOT EXISTS idx_e2e_processes_status ON e2e_processes (status);

-- --------------------------------------------
-- 端到端梳理计划
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS e2e_plans (
  id TEXT PRIMARY KEY NOT NULL,
  process_id TEXT NOT NULL,
  plan_type TEXT DEFAULT 'monthly' NOT NULL,
  year INTEGER DEFAULT 0 NOT NULL,
  period INTEGER DEFAULT 0 NOT NULL,
  plan_content TEXT DEFAULT '' NOT NULL,
  plan_progress INTEGER DEFAULT 100 NOT NULL,
  actual_progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned' NOT NULL,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '' NOT NULL,
  created_at_ts TEXT DEFAULT '' NOT NULL,
  updated_by TEXT DEFAULT '' NOT NULL,
  updated_at_ts TEXT DEFAULT '' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_e2e_plans_process_id ON e2e_plans (process_id);
CREATE INDEX IF NOT EXISTS idx_e2e_plans_status ON e2e_plans (status);

-- --------------------------------------------
-- 系统用户
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS sys_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
  must_change_password BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sys_users_username ON sys_users (username);

-- --------------------------------------------
-- 系统菜单
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS sys_menus (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  path VARCHAR(255),
  icon VARCHAR(100),
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE NOT NULL,
  supported_actions TEXT DEFAULT '["view"]',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sys_menus_parent_id ON sys_menus (parent_id);
CREATE INDEX IF NOT EXISTS idx_sys_menus_sort_order ON sys_menus (sort_order);

-- --------------------------------------------
-- 用户菜单权限
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS sys_user_menus (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES sys_menus(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{}' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sys_user_menus_user_id ON sys_user_menus (user_id);
CREATE INDEX IF NOT EXISTS idx_sys_user_menus_menu_id ON sys_user_menus (menu_id);

-- --------------------------------------------
-- 菜单功能配置
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS sys_menu_functions (
  id SERIAL PRIMARY KEY,
  menu_id INTEGER NOT NULL REFERENCES sys_menus(id) ON DELETE CASCADE,
  function_code VARCHAR(50) NOT NULL,
  function_name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sys_menu_functions_menu_id ON sys_menu_functions (menu_id);

-- --------------------------------------------
-- 用户菜单功能权限
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS sys_user_menu_functions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES sys_menus(id) ON DELETE CASCADE,
  function_code VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sys_user_menu_functions_user_menu ON sys_user_menu_functions (user_id, menu_id);

-- --------------------------------------------
-- 评价标准项
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_standards (
  id SERIAL PRIMARY KEY,
  row_index INTEGER NOT NULL,
  section_type TEXT DEFAULT '' NOT NULL,
  layer1 TEXT DEFAULT '' NOT NULL,
  layer1_score INTEGER DEFAULT 0 NOT NULL,
  layer2 TEXT DEFAULT '' NOT NULL,
  layer3 TEXT DEFAULT '' NOT NULL,
  layer4 TEXT DEFAULT '' NOT NULL,
  layer5 TEXT DEFAULT '' NOT NULL,
  criteria_desc TEXT DEFAULT '' NOT NULL,
  standard_score INTEGER DEFAULT 0 NOT NULL,
  is_scoring_row BOOLEAN DEFAULT FALSE NOT NULL,
  score_group_key TEXT DEFAULT '' NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessment_standards_section ON assessment_standards (section_type);
CREATE INDEX IF NOT EXISTS idx_assessment_standards_score_group ON assessment_standards (score_group_key);
CREATE INDEX IF NOT EXISTS idx_assessment_standards_sort ON assessment_standards (sort_order);

-- --------------------------------------------
-- 自评主表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  period TEXT NOT NULL,
  status TEXT DEFAULT '草稿' NOT NULL,
  total_score TEXT DEFAULT '0' NOT NULL,
  mechanism_score TEXT DEFAULT '0' NOT NULL,
  operation_score TEXT DEFAULT '0' NOT NULL,
  it_score TEXT DEFAULT '0' NOT NULL,
  remarks TEXT DEFAULT '',
  created_by TEXT DEFAULT '' NOT NULL,
  created_at_ts TEXT DEFAULT '' NOT NULL,
  updated_by TEXT DEFAULT '' NOT NULL,
  updated_at_ts TEXT DEFAULT '' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessments_period ON assessments (period);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments (status);

-- --------------------------------------------
-- 自评明细
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_details (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  standard_id INTEGER NOT NULL REFERENCES assessment_standards(id),
  current_status TEXT DEFAULT '' NOT NULL,
  self_score TEXT DEFAULT '0' NOT NULL,
  score_group_key TEXT DEFAULT '' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessment_details_assessment ON assessment_details (assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_details_standard ON assessment_details (standard_id);

-- ============================================================
-- RLS：业务表放开 anon 全权（自部署场景）
-- 系统表不启用 RLS（后端用 service_role_key 访问）
-- ============================================================
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2e_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2e_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_details ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'flows','revision_records','revision_plans','plan_tasks',
      'e2e_processes','e2e_plans','assessment_standards','assessments','assessment_details'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow public select access on %I" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public insert access on %I" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public update access on %I" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public delete access on %I" ON %I', tbl, tbl);

    EXECUTE format('CREATE POLICY "Allow public select access on %I" ON %I FOR SELECT TO public USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public insert access on %I" ON %I FOR INSERT TO public WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public update access on %I" ON %I FOR UPDATE TO public USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public delete access on %I" ON %I FOR DELETE TO public USING (true)', tbl, tbl);
  END LOOP;
END $$;
