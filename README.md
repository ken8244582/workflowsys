# 职能流程管理平台

基于 [Next.js 16](https://nextjs.org) + [shadcn/ui](https://ui.shadcn.com) 的企业级流程管理全栈应用。

## 功能概览

| 模块 | 功能 |
|------|------|
| 统计概览 | 职能流程/端到端流程数据看板 |
| 流程清单 | L1-L4树形层级展示 + 筛选分页 + 导出Excel + 数据初始化 |
| 修订记录 | 历史修订记录查询 + 导出 |
| 修订计划 | 计划管理 + 任务执行 + 批量操作 + 顺延 + 导出 |
| 端到端流程 | 流程CRUD + 梳理计划 + 进度跟踪 |
| 评价体系 | 成熟度自评 + 自评历史 + 对比报告 + 导出Excel |
| 用户管理 | 用户CRUD + 权限分配 |
| 菜单管理 | 菜单树CRUD + 排序 |

## 快速开始

### 环境变量配置

复制 `.env.local` 并配置以下变量：

```bash
# 必需 - JWT签名密钥（缺失时服务拒绝启动）
JWT_SECRET=your-random-secret-key

# 必需 - Supabase连接信息
COZE_SUPABASE_URL=https://your-project.supabase.co
COZE_SUPABASE_ANON_KEY=your-anon-key
```

### 启动开发服务器

```bash
pnpm dev
```

启动后，在浏览器中打开 [http://localhost:5000](http://localhost:5000) 查看应用。

开发服务器支持热更新，修改代码后页面会自动刷新。

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务器

```bash
pnpm start
```

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Database**: Supabase PostgreSQL
- **认证**: 自建 JWT + bcrypt 会话认证

## 安全特性

- **Session Cookie**：浏览器关闭即失效，JWT Token 1小时超时
- **API鉴权**：所有业务接口通过 `requireAuth()` 中间件校验
- **搜索注入防护**：`escapeIlike()` 转义 ilike 通配符
- **审计追踪**：所有业务表记录创建人/修改人及时间
- **账号保护**：禁止删除当前登录账号

## 项目结构

```
src/
├── app/                      # Next.js App Router 目录
│   ├── layout.tsx           # 根布局组件
│   ├── page.tsx             # 首页（统计概览）
│   ├── login/               # 登录页
│   ├── functional/          # 职能流程模块
│   │   ├── list/            # 流程清单
│   │   ├── revision/        # 修订记录
│   │   └── plan/            # 修订计划
│   ├── e2e/                 # 端到端流程模块
│   │   ├── overview/        # 端到端概览
│   │   ├── list/            # 端到端流程管理
│   │   └── plan/            # 梳理计划
│   ├── assessment/          # 评价体系模块
│   │   ├── maturity/        # 成熟度自评
│   │   └── history/         # 自评历史
│   ├── system/              # 系统管理模块
│   │   ├── users/           # 用户管理
│   │   └── menus/           # 菜单管理
│   └── api/                 # API 路由
│       ├── auth/            # 认证接口
│       ├── flows/           # 流程清单接口
│       ├── revisions/       # 修订记录接口
│       ├── revision-plans/  # 修订计划接口
│       ├── e2e/             # 端到端流程接口
│       ├── assessment/      # 评价标准接口
│       ├── assessments/     # 自评接口
│       └── sys/             # 系统管理接口
├── components/              # React 组件目录
│   ├── auth-provider.tsx   # 认证上下文（401自动跳转）
│   ├── app-shell.tsx       # 应用壳
│   ├── nav-menu.tsx        # 动态导航栏
│   └── ui/                 # shadcn/ui 基础组件
├── lib/                     # 工具函数库
│   ├── auth.ts             # JWT认证（环境变量密钥+Session Cookie）
│   ├── api-auth.ts         # API统一鉴权中间件
│   ├── assessment-data.ts  # 自评数据访问层
│   ├── assessment-standards-data.ts # 自评标准嵌入数据
│   ├── assessment-template.ts       # 自评导出模板(base64)
│   ├── e2e-store.ts        # 端到端数据存储(Supabase)
│   ├── flow-data.ts        # 流程数据类型+统计计算
│   ├── sys-data.ts         # 系统管理数据访问
│   ├── supabase.ts         # Supabase客户端
│   └── utils.ts            # cn(), beijingNow(), escapeIlike()
└── storage/database/
    ├── shared/schema.ts    # Drizzle ORM 表定义
    └── supabase-client.ts  # Supabase客户端
```

## 相关文档

- [AGENTS.md](./AGENTS.md) — 项目架构与开发规范
- [docs/DESIGN.md](./docs/DESIGN.md) — 设计规范
- [docs/DEPLOY.md](./docs/DEPLOY.md) — 部署指南
