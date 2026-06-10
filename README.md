# 职能流程管理平台

基于 [Next.js 16](https://nextjs.org) + [shadcn/ui](https://ui.shadcn.com) 的企业级流程管理全栈应用。

## 功能概览

| 模块 | 功能 |
|------|------|
| 统计概览 | 职能流程/端到端流程数据看板 |
| 流程架构 | L1-L4 树形层级展示 |
| 流程清单 | 筛选+分页+导出Excel |
| 修订记录 | 历史修订记录查询+导出 |
| 修订计划 | 计划管理+任务执行+顺延+导出 |
| 端到端流程 | 流程CRUD+梳理计划+进度跟踪 |
| 用户管理 | 用户CRUD+权限分配 |
| 菜单管理 | 菜单树CRUD+排序 |

## 快速开始

### 环境变量配置

复制 `.env.local` 并配置以下变量：

```bash
# 必需 - JWT签名密钥（缺失时服务拒绝启动）
JWT_SECRET=your-random-secret-key

# 必需 - Supabase连接信息
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 启动开发服务器

```bash
coze dev
```

启动后，在浏览器中打开 [http://localhost:5000](http://localhost:5000) 查看应用。

开发服务器支持热更新，修改代码后页面会自动刷新。

### 构建生产版本

```bash
coze build
```

### 启动生产服务器

```bash
coze start
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
│   ├── e2e/                 # 端到端流程模块
│   ├── system/              # 系统管理模块
│   └── api/                 # API 路由
│       ├── auth/            # 认证接口
│       ├── flows/           # 流程清单接口
│       ├── revisions/       # 修订记录接口
│       ├── revision-plans/  # 修订计划接口
│       ├── e2e/             # 端到端流程接口
│       └── sys/             # 系统管理接口
├── components/              # React 组件目录
│   ├── auth-provider.tsx   # 认证上下文（401自动跳转）
│   ├── app-shell.tsx       # 应用壳
│   ├── nav-menu.tsx        # 动态导航栏
│   └── ui/                 # shadcn/ui 基础组件
├── lib/                     # 工具函数库
│   ├── auth.ts             # JWT认证（环境变量密钥+Session Cookie）
│   ├── api-auth.ts         # API统一鉴权中间件
│   ├── e2e-store.ts        # 端到端数据存储(Supabase)
│   ├── sys-data.ts         # 系统管理数据访问
│   ├── supabase.ts         # Supabase客户端
│   └── utils.ts            # cn(), beijingNow(), escapeIlike()
└── storage/database/
    └── shared/schema.ts    # Drizzle ORM 表定义
```

## 相关文档

- [AGENTS.md](./AGENTS.md) — 项目架构与开发规范
- [DESIGN.md](./DESIGN.md) — 设计规范
- [REQUIREMENTS.md](./REQUIREMENTS.md) — 需求与Bug跟踪
