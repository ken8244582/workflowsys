# 本地部署指南

## 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 20.x | 24.x |
| pnpm | 9.x | 10.x |
| PostgreSQL | 14.x | 16.x+ |
| Supabase CLI | 最新 | 最新（可选，用于本地 Supabase） |

## 1. 获取源码

```bash
git clone <仓库地址>
cd <项目目录>
```

## 2. 安装依赖

```bash
pnpm install
```

## 3. 准备数据库

本项目使用 Supabase PostgreSQL 数据库，有两种方式：

### 方式 A：使用 Supabase 云服务（推荐）

1. 前往 [Supabase](https://supabase.com/) 注册并创建项目
2. 记录项目的 **Project URL** 和 **anon public key**（在 Settings → API 中）
3. 在 SQL Editor 中执行建表 SQL（见下方「数据库初始化 SQL」）

### 方式 B：使用本地 Supabase

```bash
# 安装 Supabase CLI
npx supabase init
npx supabase start

# 启动后会输出本地 URL 和 Key
# API URL: http://localhost:54321
# anon key: eyJ...（自动生成）
```

## 4. 配置环境变量

复制示例文件并填写：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入以下必填项：

```env
# JWT 签名密钥（必填，缺失时服务拒绝启动）
# 生成方式：openssl rand -base64 32
JWT_SECRET=your_jwt_secret_here

# Supabase 配置（必填）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `JWT_SECRET` | 是 | JWT 签名密钥，用于用户认证。可用 `openssl rand -base64 32` 生成 |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase 项目 URL（如 `https://xxx.supabase.co`） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | Supabase 匿名 Key（在 Supabase Dashboard → Settings → API 获取） |

## 5. 数据库初始化

### 建表 SQL

在 Supabase 的 SQL Editor 中依次执行以下 SQL：

<details>
<summary>点击展开完整建表 SQL</summary>

```sql
-- ============================================
-- 流程清单表
-- ============================================
CREATE TABLE IF NOT EXISTS flows (
  id SERIAL PRIMARY KEY,
  l1_domain TEXT,
  l1_owner TEXT,
  l2_group TEXT,
  l2_owner TEXT,
  l3_segment TEXT,
  l3_owner TEXT,
  process_code TEXT,
  l4_process TEXT,
  version TEXT,
  department TEXT,
  l4_owner TEXT,
  format TEXT,
  category TEXT,
  it_coverage TEXT,
  it_sub_category TEXT,
  it_score INTEGER,
  status TEXT,
  created_by TEXT,
  created_at_ts TEXT,
  updated_by TEXT,
  updated_at_ts TEXT
);

-- ============================================
-- 修订记录表
-- ============================================
CREATE TABLE IF NOT EXISTS revision_records (
  id SERIAL PRIMARY KEY,
  revision_date TEXT,
  process_code TEXT,
  l4_process TEXT,
  version TEXT,
  l1_domain TEXT,
  l2_group TEXT,
  l3_segment TEXT,
  revision_type TEXT,
  description TEXT,
  operator TEXT,
  created_by TEXT,
  created_at_ts TEXT,
  updated_by TEXT,
  updated_at_ts TEXT
);

-- ============================================
-- 修订计划表
-- ============================================
CREATE TABLE IF NOT EXISTS revision_plans (
  id SERIAL PRIMARY KEY,
  plan_month TEXT UNIQUE,
  plan_name TEXT,
  status TEXT DEFAULT '草稿',
  task_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- ============================================
-- 修订计划任务表
-- ============================================
CREATE TABLE IF NOT EXISTS plan_tasks (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER REFERENCES revision_plans(id),
  flow_item_id INTEGER,
  process_code TEXT,
  process_name TEXT,
  owner TEXT,
  department TEXT,
  version TEXT,
  format TEXT,
  category TEXT,
  task_type TEXT,
  description TEXT,
  status TEXT DEFAULT '待执行',
  completed_at TEXT,
  carried_from_plan_id INTEGER,
  carried_to_plan_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  remarks TEXT,
  created_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  updated_at_ts TEXT
);

-- ============================================
-- 端到端流程表
-- ============================================
CREATE TABLE IF NOT EXISTS e2e_processes (
  id TEXT PRIMARY KEY,
  name TEXT,
  owner TEXT,
  department TEXT,
  responsible_person TEXT,
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER DEFAULT 100,
  status TEXT DEFAULT 'not_started',
  start_date TEXT,
  completed_date TEXT,
  description TEXT,
  created_by TEXT,
  created_at_ts TEXT,
  updated_by TEXT,
  updated_at_ts TEXT
);

-- ============================================
-- 端到端梳理计划表
-- ============================================
CREATE TABLE IF NOT EXISTS e2e_plans (
  id TEXT PRIMARY KEY,
  process_id TEXT REFERENCES e2e_processes(id),
  plan_type TEXT,
  year INTEGER,
  period INTEGER,
  plan_content TEXT,
  plan_progress INTEGER DEFAULT 0,
  actual_progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned',
  notes TEXT,
  created_by TEXT,
  created_at_ts TEXT,
  updated_by TEXT,
  updated_at_ts TEXT
);

-- ============================================
-- 系统用户表
-- ============================================
CREATE TABLE IF NOT EXISTS sys_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  is_super_admin BOOLEAN DEFAULT FALSE,
  must_change_password BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 系统菜单表
-- ============================================
CREATE TABLE IF NOT EXISTS sys_menus (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  path VARCHAR(255),
  icon VARCHAR(100),
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  supported_actions TEXT DEFAULT '[]'
);

-- ============================================
-- 用户菜单权限表
-- ============================================
CREATE TABLE IF NOT EXISTS sys_user_menus (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES sys_users(id) ON DELETE CASCADE,
  menu_id INTEGER REFERENCES sys_menus(id) ON DELETE CASCADE
);

-- ============================================
-- 评价标准项表
-- ============================================
CREATE TABLE IF NOT EXISTS assessment_standards (
  id SERIAL PRIMARY KEY,
  row_index INTEGER,
  section_type TEXT,
  layer1 TEXT,
  layer1_score NUMERIC,
  layer2 TEXT,
  layer3 TEXT,
  layer4 TEXT,
  layer5 TEXT,
  criteria_desc TEXT,
  standard_score NUMERIC,
  is_scoring_row BOOLEAN DEFAULT FALSE,
  score_group_key TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ============================================
-- 自评主表
-- ============================================
CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  name TEXT,
  period TEXT,
  status TEXT DEFAULT '草稿',
  total_score TEXT,
  mechanism_score TEXT,
  operation_score TEXT,
  it_score TEXT,
  remarks TEXT,
  created_by TEXT,
  created_at_ts TEXT,
  updated_by TEXT,
  updated_at_ts TEXT
);

-- ============================================
-- 自评明细表
-- ============================================
CREATE TABLE IF NOT EXISTS assessment_details (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
  standard_id INTEGER REFERENCES assessment_standards(id),
  current_status TEXT,
  self_score TEXT,
  score_group_key TEXT
);

-- ============================================
-- 关闭 RLS（自部署场景）
-- 如需开启 RLS 请自行配置策略
-- ============================================
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2e_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2e_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_user_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_details ENABLE ROW LEVEL SECURITY;

-- 为所有表创建允许 anon 访问的策略（自部署场景）
-- 注意：生产环境请根据实际需求调整策略
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Allow all for authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
```

</details>

### 种子数据自动初始化

首次访问登录接口时，系统会自动执行 `seedInitialData()`：
- 创建超级管理员账号（用户名：`10020580`，默认密码：`Admin@2024`）
- 创建默认菜单数据
- 分配超管全部菜单权限

**无需手动插入用户和菜单数据。**

## 6. 启动项目

### 开发模式

```bash
pnpm dev
```

默认监听 `http://localhost:5000`（由 `DEPLOY_RUN_PORT` 环境变量控制，默认 5000）。

### 生产构建与启动

```bash
pnpm build
pnpm start
```

## 7. 默认账号

| 角色 | 用户名 | 默认密码 | 说明 |
|------|--------|---------|------|
| 超级管理员 | 10020580 | Admin@2024 | 首次登录后建议修改密码 |

> 超管拥有所有菜单权限，无需手动分配。

## 8. 数据导入

项目支持通过 Excel 导入流程清单数据：

1. 以超管身份登录
2. 进入「职能流程 → 流程清单」页面
3. 点击「数据初始化」按钮上传 Excel 文件
4. 系统自动解析 L1-L4 流程清单 Sheet 并写入数据库

## 9. 自定义配置

### 修改监听端口

设置环境变量 `DEPLOY_RUN_PORT`：

```bash
DEPLOY_RUN_PORT=3000 pnpm dev
```

### 关闭 HTTPS Cookie（本地开发）

本地开发时 Cookie 的 `secure` 属性自动关闭（通过 `COZE_PROJECT_ENV` 判断，非 `PROD` 时不启用 secure）。

## 常见问题

### Q: 启动时报 `JWT_SECRET is not configured`

A: 检查 `.env.local` 文件是否存在且包含 `JWT_SECRET` 配置。

### Q: 登录后页面空白/401

A: 检查 Supabase 连接配置是否正确：
- `NEXT_PUBLIC_SUPABASE_URL` 是否可访问
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否匹配
- 数据库表是否已创建

### Q: iframe 中无法登录

A: 项目已实现 Cookie + Bearer Token 双重认证机制，自动兼容 iframe 第三方 Cookie 限制。确保浏览器未完全禁止所有 Cookie。

### Q: 如何重置用户密码

A: 以超管身份登录，进入「系统管理 → 用户管理」，点击对应用户的「重置密码」按钮。

### Q: 如何添加新用户

A: 进入「系统管理 → 用户管理」，点击「新增用户」填写信息后创建，然后分配菜单权限。
