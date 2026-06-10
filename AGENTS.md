# 项目上下文

## 项目概述
职能流程管理平台，提供流程架构管理、流程清单查询、修订记录跟踪、修订计划管理、端到端流程梳理等功能，配套用户认证与权限系统。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Database**: Supabase PostgreSQL (Drizzle ORM)
- **认证**: 自建 JWT + bcrypt 会话认证

## 导航与功能模块

### 菜单结构
| 一级菜单 | 二级菜单 | 路径 | 说明 |
|---------|---------|------|------|
| 统计概览 | - | `/` | 流程数据统计看板 |
| 职能流程 | 流程架构 | `/functional/architecture` | L1-L4 树形层级展示 |
| | 流程清单 | `/functional/list` | 筛选+分页+导出Excel |
| | 修订记录 | `/functional/revision` | 历史修订记录查询+导出 |
| | 修订计划 | `/functional/plan` | 修订计划列表+详情管理 |
| 端到端流程 | 流程概览 | `/e2e/overview` | 端到端流程统计看板 |
| | 流程管理 | `/e2e/list` | 端到端流程CRUD |
| | 梳理计划 | `/e2e/plan` | 梳理计划管理 |
| 系统管理 | 用户管理 | `/system/users` | 用户CRUD+权限分配 |
| | 菜单管理 | `/system/menus` | 菜单树CRUD+排序 |

> 菜单数据存储在 `sys_menus` 表，通过 `sys_user_menus` 关联用户权限，导航栏动态渲染。

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 全局布局 (顶部导航+AuthShell)
│   │   ├── page.tsx                # 统计概览页 (两段式：职能流程/端到端)
│   │   ├── globals.css             # 全局样式 + @theme变量
│   │   ├── login/page.tsx          # 登录页
│   │   ├── monitoring/page.tsx     # 指标监控(占位页)
│   │   ├── functional/
│   │   │   ├── architecture/page.tsx  # 流程架构页 (L1-L4树形展示)
│   │   │   ├── list/page.tsx          # 流程清单页 (筛选+表格+导出)
│   │   │   ├── revision/page.tsx      # 修订记录页 (筛选+表格+导出)
│   │   │   └── plan/
│   │   │       ├── page.tsx           # 修订计划列表 (分页+创建+下发)
│   │   │       └── [id]/page.tsx      # 修订计划详情 (任务CRUD+导出+部门统计)
│   │   ├── e2e/
│   │   │   ├── overview/page.tsx      # 端到端概览 (统计图表)
│   │   │   ├── list/page.tsx          # 端到端流程管理 (CRUD)
│   │   │   └── plan/page.tsx          # 梳理计划管理
│   │   ├── system/
│   │   │   ├── users/page.tsx         # 用户管理
│   │   │   └── menus/page.tsx         # 菜单管理
│   │   └── api/
│   │       ├── auth/                  # 认证API (login/logout/session/change-password)
│   │       ├── flows/                 # 流程清单API (CRUD+import+export+reinitialize)
│   │       ├── revisions/             # 修订记录API (CRUD+export)
│   │       ├── revision-plans/        # 修订计划API (CRUD+tasks+export)
│   │       ├── plan-tasks/[id]/       # 单任务操作API (完成/撤回/顺延)
│   │       ├── e2e/                   # 端到端API (processes+plans)
│   │       └── sys/                   # 系统管理API (users+menus)
│   ├── components/
│   │   ├── auth-provider.tsx          # 认证上下文 (登录态+菜单权限)
│   │   ├── app-shell.tsx              # 应用壳 (登录检测+布局)
│   │   ├── nav-menu.tsx               # 动态导航栏
│   │   ├── change-password-dialog.tsx  # 修改密码弹窗
│   │   ├── multi-select-filter.tsx     # 多选筛选组件
│   │   ├── pagination-bar.tsx          # 统一分页组件
│   │   ├── truncate-cell.tsx           # 截断文本+Tooltip组件
│   │   └── ui/                         # shadcn/ui 组件库
│   ├── lib/
│   │   ├── flow-data.ts              # 流程数据类型+统计计算
│   │   ├── e2e-store.ts              # 端到端流程数据存储(文件)
│   │   ├── auth.ts                   # JWT认证工具
│   │   ├── sys-data.ts               # 系统管理数据访问
│   │   ├── supabase.ts               # Supabase客户端
│   │   └── utils.ts                  # 通用工具 (cn, beijingNow)
│   └── storage/database/
│       └── shared/schema.ts          # Drizzle ORM 表定义
└── DESIGN.md                         # 设计规范
```

## 数据库表结构 (Supabase PostgreSQL)

### flows — 流程清单
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| l1_domain | text | L1业务域 |
| l1_owner | text | L1所有者 |
| l2_group | text | L2业务组 |
| l2_owner | text | L2所有者 |
| l3_segment | text | L3业务段 |
| l3_owner | text | L3所有者 |
| process_code | text | 流程编码 |
| l4_process | text | L4职能流程 |
| version | text | 版本号 (如C1.0) |
| department | text | 流程所属部门 |
| l4_owner | text | L4所有者 |
| format | text | 格式 (集团模板/旧格式) |
| category | text | 分类 (流程/办法/其它) |
| it_coverage | text | IT覆盖 |
| it_sub_category | text | IT支撑分类 |
| it_score | integer | IT支撑分 |
| status | text | 状态 |

### revision_records — 修订记录
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| revision_date | text | 修订日期 |
| process_code | text | 流程编码 |
| l4_process | text | L4流程名 |
| version | text | 版本号 |
| l1_domain | text | L1业务域 |
| l2_group | text | L2业务组 |
| l3_segment | text | L3业务段 |
| revision_type | text | 修订类型 |
| description | text | 修订描述 |
| operator | text | 操作人 |

### revision_plans — 修订计划
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| plan_month | text (unique) | 计划月份 (如2026-06) |
| plan_name | text | 计划名称 |
| status | text | 状态 (草稿/已下发/已完成) |
| task_count | integer | 任务总数 |
| completed_count | integer | 已完成数 |
| created_at | text | 创建时间 |
| updated_at | text | 更新时间 |

### plan_tasks — 修订计划任务
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| plan_id | integer | 关联修订计划 |
| flow_item_id | integer | 关联流程清单 |
| process_code | text | 流程编码 |
| process_name | text | 流程名称 |
| owner | text | L4所有者 |
| department | text | 流程所属部门 |
| version | text | 版本号 |
| format | text | 格式 |
| category | text | 分类 |
| task_type | text | 任务类型 (内容修订/新增) |
| description | text | 修订要求 |
| status | text | 状态 (待执行/进行中/已完成/已顺延) |
| completed_at | text | 完成时间 |
| carried_from_plan_id | integer | 顺延来源计划 |
| carried_to_plan_id | integer | 顺延目标计划 |
| sort_order | integer | 排序 |
| remarks | text | 备注 |
| created_at | text | 创建时间 |

### sys_users — 系统用户
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| username | varchar(50) unique | 用户名 |
| password_hash | varchar(255) | bcrypt密码hash |
| display_name | varchar(100) | 显示名 |
| is_super_admin | boolean | 是否超管 |
| must_change_password | boolean | 是否需修改密码 |
| is_active | boolean | 是否启用 |

### sys_menus — 系统菜单
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| name | varchar(100) | 菜单名 |
| path | varchar(255) | 路由路径 |
| icon | varchar(100) | 图标 |
| parent_id | integer | 父菜单ID (null=顶级) |
| sort_order | integer | 排序号 |
| is_visible | boolean | 是否可见 |

### sys_user_menus — 用户菜单权限
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| user_id | integer FK | 关联用户 |
| menu_id | integer FK | 关联菜单 |

## 关键业务逻辑

### 统计概览页 (两段式)
- **Section 1 职能流程工作**：4指标卡 + 横向堆叠柱状图 + 双饼图 + 版本分布 + 明细表
- **Section 2 端到端流程工作**：4指标卡 + 端到端进度图 + 工作说明

### 修订计划完整链路
1. **创建计划**：指定月份+名称 → 自动生成计划名
2. **添加任务**：从流程清单选择，携带编码/名称/所有者/部门/版本/格式/分类
3. **下发计划**：草稿→已下发，任务状态变为"待执行"
4. **执行任务**：待执行→进行中→已完成(记录完成时间，使用北京时间)
5. **撤回任务**：已完成→待执行(清除完成时间)
6. **顺延任务**：创建下月计划+复制任务，原任务标记"已顺延"
7. **导出Excel**：Sheet1任务明细 + Sheet2部门完成进度统计

### 认证与权限
- 登录：bcrypt验证 → JWT token存入cookie
- 会话：cookie中的token → 验证用户
- 权限：用户关联菜单权限，导航栏动态渲染有权限的菜单
- 超管：拥有所有菜单权限

### 数据初始化
- `POST /api/flows/reinitialize`：上传Excel → 自动查找L1-L4流程清单Sheet → 解析标题行 → 清空旧数据 → 批量写入
- 使用 `range:1` 选项跳过合并标题行

### 时区处理
- `beijingNow()` (utils.ts)：返回北京时间 `YYYY-MM-DD HH:mm:ss`，所有用户可见时间统一使用此函数

## 共享组件

| 组件 | 路径 | 说明 |
|------|------|------|
| PaginationBar | components/pagination-bar.tsx | 统一分页(页码+跳转+条数选择) |
| TruncateDiv | components/truncate-cell.tsx | 截断文本+悬浮Tooltip |
| MultiSelectFilter | components/multi-select-filter.tsx | 多选筛选下拉 |

## 构建与测试命令

- 静态检查：`pnpm lint --quiet` + `pnpm ts-check`
- 开发：`pnpm dev` (端口 5000)
- 构建：`pnpm build`
