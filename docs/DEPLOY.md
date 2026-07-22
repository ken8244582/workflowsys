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

本项目数据库统一使用 Supabase，连接完全由环境变量驱动（见「4. 配置环境变量」），**切换方式只需改环境变量，无需改动代码**。代码层已**彻底移除对原 Coze 云平台的耦合**（不再依赖 `coze-coding-dev-sdk` 上报、也不再使用 `coze_workload_identity` Python 取环境变量逻辑），`src/storage/database/supabase-client.ts` 现在纯靠 `COZE_SUPABASE_URL` / `COZE_SUPABASE_ANON_KEY` / `COZE_SUPABASE_SERVICE_ROLE_KEY` 三个环境变量直连任意 Supabase 实例。

> 注：环境变量名仍沿用 `COZE_` 前缀（历史命名），仅为变量名，与任何云端平台无关，本地/自托管部署照常使用。

按部署场景选择：

- **本地开发** → 云端 Supabase（注册即用，无需 Docker，最快跑通）
- **服务器正式环境** → 本地 Supabase（在服务器上用 Docker 自托管，数据不出内网）

#### A. 本地开发：云端 Supabase（默认，推荐）

1. 前往 [Supabase 官网](https://supabase.com/) 注册账号并 **New Project**（等待初始化完成）
2. **Settings → API** 获取 **Project URL** 与 **anon public key**
3. 在 **SQL Editor** 中执行 `supabase/migrations/0001_init.sql` 建表（创建全部业务表、系统表及 RLS 策略）
4. 将 `.env.local` 中的 `COZE_SUPABASE_URL` / `COZE_SUPABASE_ANON_KEY` 填为云端值（当前 `.env.local` 默认即为云端值，开箱即用）

#### B. 服务器正式环境：本地 Supabase（Docker 自托管）

在服务器（Linux）上安装 Docker 与 Supabase CLI，于项目目录执行 `supabase start` 即可自动建表，再把环境变量指向服务器的本地 Supabase 端点：

```bash
# 服务器上
npm install -g supabase
supabase start   # 自动应用 supabase/migrations/0001_init.sql 建表
```

启动成功后拿到本地连接信息，在**服务器环境变量**（不要写进 `.env.local` 提交）中设置：

```
COZE_SUPABASE_URL=http://127.0.0.1:54321
COZE_SUPABASE_ANON_KEY=<supabase start 输出的本地 anon key>
COZE_SUPABASE_SERVICE_ROLE_KEY=<supabase start 输出的本地 service_role key>
COZE_PROJECT_ENV=PROD
PORT=5000
```

> - 若 Supabase 与前端应用不在同一台主机，将 `COZE_SUPABASE_URL` 改为服务器局域网 IP（如 `http://10.x.x.x:54321`），并放行防火墙 54321 端口。
> - 本地 anon / service_role key 为 Supabase 演示用固定值，仅限**服务器可信内网**使用，切勿暴露在公网。
> - 常用命令：`supabase status` 查看状态、`supabase db reset` 重置、`supabase stop` 停止。

##### B.1 从云端 Supabase 迁移现有数据

若云端已有业务数据（流程清单/修订/自评等），无需从头录入，使用配套脚本 `supabase/migrate-from-cloud.sh` 一键迁移：

```bash
# 1) 在云端 Supabase 控制台 → Project Settings → Database → Connection string
#    复制 Direct connection 串，形如：
#    postgresql://postgres:<云端密码>@db.<ref>.supabase.co:5432/postgres

# 2) 在服务器上设置该串并执行迁移脚本（假设已在服务器拉取本项目代码）
export CLOUD_DB_URL='postgresql://postgres:xxxx@db.xxxx.supabase.co:5432/postgres'
bash supabase/migrate-from-cloud.sh
```

脚本会：
1. `pg_dump` 云端 `public` schema 的**全部 15 张表**数据（`--data-only --no-owner --no-privileges`，禁用触发器避免外键/RLS 拦截）；
2. 通过本地 Postgres 直连端口 `54322` 以 `postgres` 超级用户导入（绕过 RLS）；
3. **自动重置所有 serial 序列**到 `MAX(id)+1`，避免新插入因 id 冲突失败。

迁移后注意事项：
- 应用的 `seedInitialData()` / `seedStandardsIfNeeded()` 均为**幂等**（先查后插），云端数据已含超管/菜单/评价标准项，首次启动不会重复插入，直接沿用云端原账号密码登录即可。
- 若云端子用户密码由 bcrypt 加密存储，迁移后密码 hash 一并带入，可原密码登录；如需重置可用默认超管 `18692602217 / 123456`（首次登录建议修改）。
- 迁移的表：flows、revision_records、revision_plans、plan_tasks、e2e_processes、e2e_plans、sys_users、sys_menus、sys_user_menus、sys_menu_functions、sys_user_menu_functions、assessment_standards、assessments、assessment_details、health_check。
- 若只想全新开始（不迁移），跳过本步骤，应用首次访问时自动 seed 默认超管与菜单，业务数据后续从 Excel 重新导入（见「7. 数据导入」）。

#### C. 自建 PostgreSQL（高级，不推荐）

仅当不能使用 Supabase 客户端时考虑。需自行搭建 PostgreSQL 14+ 并用 [PostgREST](https://postgrest.org/) 暴露兼容 API，配置复杂，不在本文档展开。

### 1.6 环境准备检查清单

部署前请确认以下项目已就绪：

| 检查项 | 验证命令 | 预期结果 |
|--------|---------|---------|
| Node.js 已安装 | `node -v` | v20.x+ |
| pnpm 已安装 | `pnpm -v` | 9.x+ |
| Git 已安装 | `git --version` | git version 2.x |
| Supabase 可用 | 本地开发访问 Dashboard / 服务器执行 `supabase status` | 能获取到 Project URL 与 anon key |
| 数据库表已创建 | 查询 `SELECT tablename FROM pg_tables WHERE schemaname='public'` | 返回 15 张表名 |

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

> **本地部署（默认）**：`supabase start` 会自动应用 `supabase/migrations/0001_init.sql` 建表，**无需手动执行 SQL**，直接跳到「4. 配置环境变量」。
>
> 本步骤仅在**云端 Supabase** 部署时需要：将 `supabase/migrations/0001_init.sql` 的完整内容复制到 Supabase Dashboard → **SQL Editor** 中执行一次即可创建全部表与 RLS 策略。


<details>
<summary>建表 SQL 已迁移至迁移文件</summary>

本地部署无需手动建表；云端部署请将 supabase/migrations/0001_init.sql 的完整内容复制到 Supabase SQL Editor 执行即可。

</details>


### 种子数据自动初始化

首次访问登录接口时，系统会自动执行 `seedInitialData()`：
- 创建超级管理员账号（用户名：`18692602217`，默认密码：`123456`）
- 创建默认菜单数据
- 分配超管全部菜单权限

**无需手动插入用户和菜单数据。**

---

## 4. 配置环境变量

在项目根目录创建 `.env.local` 文件并填入配置。仓库已提供模板 **`.env.example`**（仅含本地 Supabase 配置、不含任何云端值），服务器部署时可直接复制使用：

```bash
# 服务器上：复制模板为 .env.local，再按需用 supabase status 输出的 key 覆盖
cp .env.example .env.local
```

> `.env.example` 与 `.env.local` 的区别：`.env.example` 可提交共享、作为配置范本；`.env.local` 含实际密钥、已被 `.gitignore` 忽略，切勿提交。

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
COZE_SUPABASE_URL=https://your-project.supabase.co
COZE_SUPABASE_ANON_KEY=your_anon_key_here
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
COZE_SUPABASE_URL=https://your-project.supabase.co
COZE_SUPABASE_ANON_KEY=your_anon_key_here
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

# ===== 本地开发：云端 Supabase（默认，开箱即用）=====
COZE_SUPABASE_URL=https://your-project.supabase.co
COZE_SUPABASE_ANON_KEY=your_anon_key_here
# 云端 service_role key（可选，缺失时系统表回退 anon）
COZE_SUPABASE_SERVICE_ROLE_KEY=

# ===== 服务器正式环境：本地 Supabase（见 1.5-B，填服务器环境变量，勿提交）=====
# COZE_SUPABASE_URL=http://127.0.0.1:54321
# COZE_SUPABASE_ANON_KEY=本地 anon key
# COZE_SUPABASE_SERVICE_ROLE_KEY=本地 service_role key
# COZE_PROJECT_ENV=PROD
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

**本地开发（云端 Supabase）**：

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目
3. 点击左侧 **Settings**（齿轮图标）→ **API**
4. 复制 **Project URL** → 填入 `COZE_SUPABASE_URL`
5. 复制 **anon public** key → 填入 `COZE_SUPABASE_ANON_KEY`
6. 复制 **service_role** key → 填入 `COZE_SUPABASE_SERVICE_ROLE_KEY`（可选）

**服务器正式环境（本地 Supabase）**：执行 `supabase start`（或 `supabase status`），终端输出的 `API URL`、`anon key`、`service_role key` 即为所需值，填入服务器环境变量（见 1.5-B）。

> **安全提醒**：`anon key` 是公开密钥，可暴露在前端代码中；`service_role key` 是特权密钥，可绕过 RLS，**切勿**提交到代码仓库或写入前端代码（`.env.local` 已被 git 忽略）。

### 环境变量完整说明

| 变量名 | 必需 | 说明 | 示例值 |
|--------|------|------|--------|
| `JWT_SECRET` | 是 | JWT 签名密钥，用于用户认证 | `a1b2c3d4e5f6...`（32字节 base64） |
| `COZE_SUPABASE_URL` | 是 | Supabase 项目 URL（本地为 `http://127.0.0.1:54321`） | `https://abcdef.supabase.co` |
| `COZE_SUPABASE_ANON_KEY` | 是 | Supabase 匿名 Key | `eyJhbGciOiJIUzI1NiIs...` |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | 是 | 后端特权密钥（绕过 RLS，用于系统表读写） | `eyJhbGciOiJIUzI1NiIs...` |
| `DEPLOY_RUN_PORT` | 否 | 服务监听端口，默认 `5000` | `3000` |

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

本地开发时 Cookie 的 `secure` 属性自动关闭（通过环境自动判断，非生产环境时不启用 secure）。

## 9. 离线自动化部署（推荐用于服务器正式环境）

目标：**基础环境一次性搭建（允许公网）→ 之后日常部署只跑一条脚本，纯内网、零公网、不拉镜像、不装依赖、不碰 git**。

整体模型：把「构建」与「运行」彻底分离。构建机（本机 WSL2）`pnpm build` 后打包成 tar（含 `dist/` `.next/` `node_modules/` `public/` `supabase/` 等），经内网 `scp` 传到服务器解包 + `pm2` 重启。服务器全程不触外网。

配套脚本（仓库 `scripts/` 目录）：

| 脚本 | 在哪运行 | 作用 |
|------|---------|------|
| `build-artifact.sh` | 构建机 WSL2/Linux | `pnpm build` → 打包 tar（排除 `.env.local`）到 drop 目录 |
| `deploy.ps1` | 本机 Windows（你日常跑的**唯一脚本**） | WSL 构建 → scp 传包 → ssh 触发服务器部署 |
| `deploy-on-server.sh` | 服务器 | 解包、保留 `.env.local`、清理陈旧文件、可选迁移、`pm2` 重启、健康检查 |
| `deploy.config.example.ps1` | — | 配置模板，复制为 `deploy.config.ps1` 填写（已被 gitignore） |

> 依赖说明：项目依赖均为纯 JS（`bcryptjs`/`pg`/`@supabase/supabase-js` 等，无原生模块），产物包跨 Windows/Linux 通用；但为避免 Windows tar 对符号链接/路径的处理差异，构建统一在 **WSL2/Linux** 内进行。

### 9.1 Phase A — 基础环境一次性搭建（仅这一次允许公网）

```bash
# 1) 服务器装运行时与工具 (需联网)
sudo apt update
sudo apt install -y docker.io docker-compose-plugin postgresql-client rsync curl
sudo systemctl enable --now docker
sudo usermod -aG docker $USER            # 免 sudo 用 docker, 改完重登 SSH

# Node 20 + pnpm 9 (package.json 强制 pnpm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install 20 && nvm alias default 20
npm install -g pnpm@9
# pm2 (进程守护 + 开机自启) 与 Supabase CLI
npm install -g pm2 supabase

# 2) 拉起本地 Supabase (缓存 Docker 镜像 + 自动建 15 张表)
cd ~/workflowsys            # 已 git clone 或传上来的源码
supabase start
supabase status             # 记下 API URL / anon key / service_role key

# 3) 让 Supabase 容器开机自启 (服务器重启后自动恢复, 应用才能连上库)
docker update --restart unless-stopped $(docker ps -q --filter name=supabase)

# 4) 配置服务器环境变量
cp .env.example .env.local
nano .env.local             # 填入 supabase status 的 anon/service_role key, 确认 COZE_PROJECT_ENV=PROD PORT=5000

# 5) 配置 pm2 开机自启 (生成 systemd 服务, 后续服务器重启自动拉起应用)
pm2 startup                 # 按提示执行它打印的 sudo 命令
```

> ⚠️ 搭建完成后**严禁** `docker system prune` / `docker image prune`，否则已缓存的 Supabase 镜像被清掉，日后 `supabase start` 又需联网。
> ⚠️ 首次真正部署用下面的 `deploy.ps1` 完成（它会把产物解包、首次 `pm2 start` 并 `pm2 save` 固化进程列表）。

### 9.2 Phase B — 日常一键部署（纯内网，零公网）

只需在本机（Windows）做两件事：

**(1) 一次性：准备配置**

```powershell
# 复制模板并填写服务器信息
Copy-Item scripts/deploy.config.example.ps1 scripts/deploy.config.ps1
# 编辑 deploy.config.ps1: ServerIP / ServerUser / SshKey / DeployDir / RemoteDropDir
```

要求：本机已装 **WSL2 且其中装有 pnpm 9**；已对服务器配置 **SSH 免密**（`ssh-copy-id`）。

**(2) 每次发版：跑一条脚本**

```powershell
.\scripts\deploy.ps1
```

脚本自动完成：

1. WSL2 内 `pnpm install`(依赖未变则离线) + `pnpm build` → 打包 tar 到本机 drop 目录；
2. `scp` 把 tar 和 `deploy-on-server.sh` 传到服务器；
3. `ssh` 触发服务器 `deploy-on-server.sh`：备份并保留 `.env.local` → 解包 → `rsync` 同步部署目录(`--delete` 清理陈旧文件) → 若 `supabase/migrations` 有新增则离线 `supabase migration up` → `pm2 restart`(后台守护, 断连不停止) → `curl` 健康检查；
4. 回显内网访问地址 `http://<ServerIP>:5000/`。

服务器侧应用由 `pm2` 常驻，**SSH 断开、终端关闭都不影响运行**；因 `pm2 startup` + Docker restart 策略，服务器重启后会自动恢复 Supabase 与 app。

### 9.3 回滚

drop 目录保留历次 tar。异常时把旧包重跑一遍即可：

```bash
# 在服务器上
bash /tmp/deploy-on-server.sh /tmp/deploy-drop/workflowsys-<旧版本>.tar.gz /opt/workflowsys
```

### 9.4 排错

- **构建失败**：确认 WSL2 内 `pnpm -v` 为 9.x；依赖变更后首次需联网 `pnpm install`。
- **scp/ssh 失败**：确认 `deploy.config.ps1` 的 IP/用户/密钥正确，且已 `ssh-copy-id` 免密。
- **健康检查不过**：服务器上 `pm2 logs workflowsys` 看报错；多数是 `.env.local` 缺失或 Supabase 未起（`supabase status` 确认）。
- **新表未生效**：确认 `supabase/migrations` 已新增对应 SQL，`deploy-on-server.sh` 会自动 `supabase migration up`（离线幂等）。
- **服务器重启后服务没起来**：检查 `pm2 startup` 是否执行过（`pm2 status` 应显示 `workflowsys`）；`docker ps` 应看到 supabase 容器（restart 策略 unless-stopped）。

## 常见问题

### Q: 启动时报 `JWT_SECRET is not configured`

A: 检查 `.env.local` 文件是否存在且包含 `JWT_SECRET` 配置。

### Q: 登录后页面空白/401

A: 检查 Supabase 连接配置是否正确：
- `COZE_SUPABASE_URL` 是否可访问
- `COZE_SUPABASE_ANON_KEY` 是否匹配
- 数据库表是否已创建

### Q: iframe 中无法登录

A: 项目已实现 Cookie + Bearer Token 双重认证机制，自动兼容 iframe 第三方 Cookie 限制。确保浏览器未完全禁止所有 Cookie。

### Q: 如何重置用户密码

A: 以超管身份登录，进入「系统管理 → 用户管理」，点击对应用户的「重置密码」按钮。

### Q: 如何添加新用户

A: 进入「系统管理 → 用户管理」，点击「新增用户」填写信息后创建，然后分配菜单权限。
