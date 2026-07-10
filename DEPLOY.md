# 本地部署指南

## 1. 环境准备

### 1.1 操作系统

支持以下操作系统：
- **Windows 10/11**（推荐使用 WSL2）
- **macOS 12+**
- **Linux**（Ubuntu 20.04+、CentOS 8+ 等）

### 1.2 安装 Node.js

本项目要求 **Node.js 20.x 及以上**，推荐 **24.x**。

#### macOS

```bash
# 方式一：使用 Homebrew（推荐）
brew install node@24

# 方式二：使用 nvm（Node 版本管理器，支持多版本切换）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.zshrc   # 或 source ~/.bashrc
nvm install 24
nvm use 24
```

#### Windows

```bash
# 方式一：使用官方安装包
# 前往 https://nodejs.org/ 下载 LTS 版本安装包，双击安装即可

# 方式二：使用 Winget
winget install OpenJS.NodeJS.LTS

# 方式三：使用 nvm-windows（推荐，支持多版本切换）
# 前往 https://github.com/coreybutler/nvm-windows/releases 下载安装
nvm install 24
nvm use 24
```

#### Linux（Ubuntu/Debian）

```bash
# 方式一：使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# 方式二：使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
```

#### 验证安装

```bash
node -v    # 应输出 v24.x.x
npm -v     # 应输出 10.x.x 或更高
```

### 1.3 安装 pnpm

本项目使用 **pnpm** 作为包管理器，**禁止使用 npm 或 yarn**。

```bash
# 使用 corepack 启用（Node.js 16.13+ 自带）
corepack enable
corepack prepare pnpm@latest --activate

# 或者使用 npm 全局安装
npm install -g pnpm
```

#### 验证安装

```bash
pnpm -v    # 应输出 9.x.x 或更高
```

#### 配置 pnpm（可选，国内用户推荐）

```bash
# 设置 npm 镜像源，加速依赖下载
pnpm config set registry https://registry.npmmirror.com
```

### 1.4 安装 Git

```bash
# macOS
brew install git

# Windows
# 前往 https://git-scm.com/ 下载安装，或使用 winget install Git.Git

# Linux（Ubuntu/Debian）
sudo apt-get install git
```

#### 验证安装

```bash
git --version
```

### 1.5 准备 Supabase 数据库

本项目使用 Supabase 提供的 PostgreSQL 数据库服务。有两种方式：

#### 方式 A：使用 Supabase 云服务（推荐，开箱即用）

1. 前往 [Supabase 官网](https://supabase.com/) 注册账号
2. 点击 **New Project** 创建新项目
   - 填写项目名称（如 `flow-management`）
   - 设置数据库密码（请妥善保存）
   - 选择离你最近的区域（如 Northeast Asia → Tokyo）
3. 等待项目初始化完成（约 1-2 分钟）
4. 进入项目后，记录以下信息（在 **Settings → API** 中）：
   - **Project URL**：形如 `https://xxxxx.supabase.co`
   - **anon public key**：形如 `eyJhbGciOiJIUzI1NiIs...`
5. 在 **SQL Editor** 中执行建表 SQL（见下方「3. 数据库初始化」章节）

#### 方式 B：使用本地 Supabase（适合离线/内网部署）

需要先安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)：

```bash
# 安装 Supabase CLI
npm install -g supabase

# 在项目根目录初始化
supabase init

# 启动本地 Supabase（需要 Docker）
supabase start

# 启动成功后会输出连接信息：
# API URL: http://localhost:54321
# anon key: eyJ...（自动生成）
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
```

> **注意**：本地 Supabase 依赖 Docker，请确保 Docker Desktop 已启动并正常运行。

#### 方式 C：自建 PostgreSQL（高级）

如果不想使用 Supabase 服务，可以自行搭建兼容的 PostgreSQL 数据库：

1. 安装 PostgreSQL 14+ 并创建数据库
2. 使用 [PostgREST](https://postgrest.org/) 提供 REST API（兼容 Supabase 客户端）
3. 此方式配置较复杂，需要自行处理认证和 API 兼容层，仅推荐有经验的运维人员使用

### 1.6 环境准备检查清单

部署前请确认以下项目已就绪：

| 检查项 | 验证命令 | 预期结果 |
|--------|---------|---------|
| Node.js 已安装 | `node -v` | v20.x+ |
| pnpm 已安装 | `pnpm -v` | 9.x+ |
| Git 已安装 | `git --version` | git version 2.x |
| Supabase 已创建 | 访问 Supabase Dashboard | 项目可见且状态为 Active |
| 数据库表已创建 | 在 SQL Editor 中查询 `SELECT tablename FROM pg_tables WHERE schemaname='public'` | 返回 12 张表名 |

---

## 2. 获取源码与安装依赖

```bash
# 克隆代码仓库
git clone <仓库地址>
cd <项目目录>

# 安装项目依赖
pnpm install
```

如果下载依赖较慢，可先配置镜像源：

```bash
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

---

## 3. 数据库初始化

> 在执行以下步骤前，请确保 Supabase 项目已创建并处于 Active 状态。

### 建表 SQL

进入 Supabase Dashboard → **SQL Editor**，点击 **New Query**，粘贴以下 SQL 并点击 **Run** 执行：

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
- 创建超级管理员账号（用户名：`18692602217`，默认密码：`123456`）
- 创建默认菜单数据
- 分配超管全部菜单权限

**无需手动插入用户和菜单数据。**

---

## 4. 配置环境变量

在项目根目录创建 `.env.local` 文件并填入配置。

### macOS / Linux

```bash
# 进入项目目录
cd /path/to/your/project

# 创建 .env.local 文件
touch .env.local

# 使用编辑器打开
nano .env.local       # 或 vim .env.local / code .env.local
```

也可以一步完成创建和写入：

```bash
cat > .env.local << 'EOF'
JWT_SECRET=your_jwt_secret_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EOF
```

验证文件内容：

```bash
cat .env.local
```

### Windows

**方式一：使用 PowerShell**

```powershell
# 进入项目目录
cd C:\path\to\your\project

# 创建 .env.local 文件
New-Item -Path .env.local -ItemType File -Force

# 使用记事本打开编辑
notepad .env.local
```

也可以一步写入：

```powershell
@"
JWT_SECRET=your_jwt_secret_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
"@ | Out-File -Encoding utf8 -FilePath .env.local
```

**方式二：使用 CMD**

```cmd
cd C:\path\to\your\project

:: 创建空文件
type nul > .env.local

:: 使用记事本打开编辑
notepad .env.local
```

**方式三：使用 VS Code**

```powershell
code .env.local
```

> **注意**：Windows 下文件名以 `.` 开头可能被资源管理器拒绝，请使用 PowerShell/CMD/VS Code 创建。

### WSL2 (Windows Subsystem for Linux)

```bash
# 进入项目目录（Windows 盘符挂载在 /mnt/ 下）
cd /mnt/c/path/to/your/project

# 创建并编辑
touch .env.local
nano .env.local
```

> **提示**：建议将项目放在 WSL2 本地文件系统（`~/projects/`）而非 `/mnt/c/`，以获得更好的文件读写性能。

### 环境变量模板

编辑 `.env.local`，填入以下必填项：

```env
# ===== JWT 签名密钥（必填，缺失时服务拒绝启动）=====
JWT_SECRET=your_jwt_secret_here

# ===== Supabase 配置（必填）=====
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 如何生成 JWT_SECRET

```bash
# macOS / Linux / WSL2
openssl rand -base64 32

# Windows（PowerShell）
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

# 任意平台（需要已安装 Node.js）
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

生成后将输出结果复制，替换 `your_jwt_secret_here`。

### 如何获取 Supabase 连接信息

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目（如未创建，参考第 3 步「创建 Supabase 项目」）
3. 点击左侧 **Settings**（齿轮图标）→ **API**
4. 找到 **Project URL** → 复制 → 填入 `NEXT_PUBLIC_SUPABASE_URL`
5. 找到 **Project API keys** 下的 **anon public** → 复制 → 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **安全提醒**：`anon key` 是公开密钥，可暴露在前端代码中；`service_role key` 是特权密钥，**绝对不能**写入 `.env.local` 或前端代码。

### 环境变量完整说明

| 变量名 | 必需 | 说明 | 示例值 |
|--------|------|------|--------|
| `JWT_SECRET` | 是 | JWT 签名密钥，用于用户认证 | `a1b2c3d4e5f6...`（32字节 base64） |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase 项目 URL | `https://abcdef.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | Supabase 匿名 Key | `eyJhbGciOiJIUzI1NiIs...` |
| `DEPLOY_RUN_PORT` | 否 | 服务监听端口，默认 `5000` | `3000` |
| `COZE_PROJECT_ENV` | 否 | 运行环境标识，`DEV` 或 `PROD` | `PROD` |

### 配置验证

完成配置后，可通过以下命令验证环境变量是否生效：

```bash
# macOS / Linux / WSL2
grep -c "JWT_SECRET" .env.local && echo "✓ JWT_SECRET 已配置" || echo "✗ JWT_SECRET 缺失"
grep -c "SUPABASE_URL" .env.local && echo "✓ SUPABASE_URL 已配置" || echo "✗ SUPABASE_URL 缺失"
grep -c "SUPABASE_ANON_KEY" .env.local && echo "✓ SUPABASE_ANON_KEY 已配置" || echo "✗ SUPABASE_ANON_KEY 缺失"

# Windows（PowerShell）
$vars = Get-Content .env.local
if ($vars -match "JWT_SECRET=") { "✓ JWT_SECRET 已配置" } else { "✗ JWT_SECRET 缺失" }
if ($vars -match "SUPABASE_URL=") { "✓ SUPABASE_URL 已配置" } else { "✗ SUPABASE_URL 缺失" }
if ($vars -match "SUPABASE_ANON_KEY=") { "✓ SUPABASE_ANON_KEY 已配置" } else { "✗ SUPABASE_ANON_KEY 缺失" }
```

---

## 5. 启动项目

### 开发模式

```bash
pnpm dev
```

默认监听 `http://localhost:5000`（由 `DEPLOY_RUN_PORT` 环境变量控制，默认 5000）。

启动成功后，终端会显示：
```
✓ Ready in Xs
○ Local: http://localhost:5000
```

在浏览器中访问 `http://localhost:5000` 即可使用。

### 生产构建与启动

```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

生产模式默认监听 `http://localhost:5000`。

> **如需修改监听端口**，设置环境变量 `DEPLOY_RUN_PORT`：
> ```bash
> DEPLOY_RUN_PORT=3000 pnpm start
> ```

---

## 6. 默认账号

| 角色 | 用户名 | 默认密码 | 说明 |
|------|--------|---------|------|
| 超级管理员 | 18692602217 | 123456 | 首次登录后建议修改密码 |

> 超管拥有所有菜单权限，无需手动分配。

## 7. 数据导入

项目支持通过 Excel 导入流程清单数据：

1. 以超管身份登录
2. 进入「职能流程 → 流程清单」页面
3. 点击「数据初始化」按钮上传 Excel 文件
4. 系统自动解析 L1-L4 流程清单 Sheet 并写入数据库

## 8. 自定义配置

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
