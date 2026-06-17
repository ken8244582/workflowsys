# 项目上下文

## 项目概述
职能流程管理平台，提供流程架构管理、流程清单查询、修订记录跟踪、修订计划管理、端到端流程梳理、评价体系成熟度自评等功能，配套用户认证与权限系统。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Database**: Supabase PostgreSQL (Drizzle ORM)
- **认证**: 自建 JWT + bcrypt 会话认证（Session Cookie + Bearer Token 双重认证 + 1小时超时）

## 导航与功能模块

### 菜单结构
| 一级菜单 | 二级菜单 | 路径 | 说明 |
|---------|---------|------|------|
| 统计概览 | - | `/` | 流程数据统计看板 |
| 职能流程 | 流程清单 | `/functional/list` | 筛选+分页+导出Excel+树形视图架构CRUD |
| | 修订记录 | `/functional/revision` | 历史修订记录查询+导出 |
| | 修订计划 | `/functional/plan` | 修订计划表格+排序+创建+查看+删除 |
| 端到端流程 | 流程概览 | `/e2e/overview` | 端到端流程统计看板 |
| | 流程管理 | `/e2e/list` | 端到端流程CRUD |
| | 梳理计划 | `/e2e/plan` | 梳理计划管理 |
| 评价体系 | 成熟度自评 | `/assessment/maturity` | 自评表查看+填写+实时计分+行内编辑+排序+对比+对比报告+导出 |
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
│   │   ├── functional/
│   │   │   ├── list/page.tsx          # 流程清单页 (筛选+表格+导出+树形视图架构CRUD)
│   │   │   ├── revision/page.tsx      # 修订记录页 (筛选+表格+导出)
│   │   │   └── plan/
│   │   │       ├── page.tsx           # 修订计划列表 (分页+创建+下发)
│   │   │       └── [id]/page.tsx      # 修订计划详情 (任务CRUD+导出+部门统计)
│   │   ├── e2e/
│   │   │   ├── overview/page.tsx      # 端到端概览 (统计图表)
│   │   │   ├── list/page.tsx          # 端到端流程管理 (CRUD)
│   │   │   └── plan/page.tsx          # 梳理计划管理
│   │   ├── assessment/
│   │   │   ├── maturity/page.tsx      # 成熟度自评 (填写+实时计分+行内编辑+排序+对比+对比报告+导出+列表导出)
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
│   │       ├── assessment/            # 评价体系API (standards+seed+export-list)
│   │       ├── assessments/           # 自评API (CRUD+对比+报告+导出)
│   │       └── sys/                   # 系统管理API (users+menus)
│   ├── components/
│   │   ├── auth-provider.tsx          # 认证上下文 (登录态+菜单权限+401自动跳转)
│   │   ├── app-shell.tsx              # 应用壳 (登录检测+布局)
│   │   ├── nav-menu.tsx               # 动态导航栏
│   │   ├── change-password-dialog.tsx  # 修改密码弹窗
│   │   ├── multi-select-filter.tsx     # 多选筛选组件
│   │   ├── pagination-bar.tsx          # 统一分页组件
│   │   ├── truncate-cell.tsx           # 截断文本+Tooltip组件
│   │   └── ui/                         # shadcn/ui 组件库
│   ├── lib/
│   │   ├── flow-data.ts              # 流程数据类型+统计计算
│   │   ├── e2e-store.ts              # 端到端流程数据存储(Supabase数据库)
│   │   ├── auth.ts                   # JWT认证工具(环境变量密钥+Session Cookie+Bearer Token+1h超时)
│   │   ├── api-auth.ts               # API统一鉴权(requireAuth中间件)
│   │   ├── sys-data.ts               # 系统管理数据访问
│   │   ├── supabase.ts               # Supabase客户端
│   │   ├── utils.ts                  # 通用工具 (cn, beijingNow, escapeIlike)
│   │   ├── assessment-data.ts        # 自评数据访问层 (CRUD+计分+对比报告)
│   │   ├── assessment-standards-data.ts # 自评标准项嵌入数据 (178条)
│   │   └── assessment-template.ts    # 自评导出模板Excel (base64编码)
│   └── storage/database/
│       └── shared/schema.ts          # Drizzle ORM 表定义
├── .env.local                        # 环境变量(JWT_SECRET等)
├── DESIGN.md                         # 设计规范
├── AGENTS.md                         # 本文件
└── REQUIREMENTS.md                   # 需求与Bug跟踪文档
```

## 数据库表结构 (Supabase PostgreSQL)

### 公共审计字段（所有业务表共有）
| 字段 | 类型 | 说明 |
|------|------|------|
| created_by | text | 创建人用户名 |
| created_at_ts | text | 创建时间 (北京时间) |
| updated_by | text | 最后修改人用户名 |
| updated_at_ts | text | 最后修改时间 (北京时间) |

> 含审计字段的表：`flows`、`revision_records`、`revision_plans`、`plan_tasks`、`e2e_processes`、`e2e_plans`、`assessments`

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
| + 审计字段 | | created_by, created_at_ts, updated_by, updated_at_ts |

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
| + 审计字段 | | created_by, created_at_ts, updated_by, updated_at_ts |

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
| + 审计字段 | | created_by, updated_by |

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
| + 审计字段 | | created_by, updated_by, updated_at_ts |

### e2e_processes — 端到端流程
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text PK | 自动生成 (e2e-001) |
| name | text | 流程名称 |
| owner | text | 负责人 |
| department | text | 所属部门 |
| responsible_person | text | 责任人 |
| current_progress | integer | 当前进度(0-100) |
| target_progress | integer | 目标进度 |
| status | text | 状态 (not_started/in_progress/completed) |
| start_date | text | 开始日期 |
| completed_date | text | 完成日期 |
| description | text | 描述 |
| + 审计字段 | | created_by, created_at_ts, updated_by, updated_at_ts |

### e2e_plans — 端到端梳理计划
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text PK | 自动生成 (plan-timestamp-hash) |
| process_id | text FK | 关联e2e_processes |
| plan_type | text | 计划类型 (monthly/quarterly) |
| year | integer | 年份 |
| period | integer | 期间 |
| plan_content | text | 计划内容 |
| plan_progress | integer | 计划进度 |
| actual_progress | integer | 实际进度 |
| status | text | 状态 (planned/in_progress/completed) |
| notes | text | 备注 |
| + 审计字段 | | created_by, created_at_ts, updated_by, updated_at_ts |

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

### assessment_standards — 评价标准项
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| row_index | integer | Excel原始行号 |
| section_type | text | 板块类型 (mechanism/operation/it_coverage) |
| layer1 | text | 分层1 |
| layer1_score | numeric | 项目分值 |
| layer2 | text | 分层2 |
| layer3 | text | 分层3 |
| layer4 | text | 分层4 |
| layer5 | text | 分层5 (程度行) |
| criteria_desc | text | 评价标准描述 |
| standard_score | numeric | 该项标准分值 |
| is_scoring_row | boolean | 是否为自评打分行 |
| score_group_key | text | 打分分组键 |
| sort_order | integer | 排序 |

### assessments — 自评主表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| name | text | 自评名称 |
| period | text | 评价周期 |
| status | text | 状态 (草稿/已提交) |
| total_score | text | 总得分 |
| mechanism_score | text | 机制建设评价得分 |
| operation_score | text | 运行效果评价得分 |
| it_score | text | IT覆盖度和支撑度得分 |
| remarks | text | 备注 |
| + 审计字段 | | created_by, created_at_ts, updated_by, updated_at_ts |

### assessment_details — 自评明细
| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 自增主键 |
| assessment_id | integer FK | 关联自评主表 |
| standard_id | integer FK | 关联评价标准项 |
| current_status | text | 现状情况 |
| self_score | text | 自评分值 |
| score_group_key | text | 打分分组键 |

## 关键业务逻辑

### 统计概览页 (两段式)
- **Section 1 职能流程工作**：4指标卡 + 横向堆叠柱状图 + 双饼图 + 版本分布 + 明细表
- **Section 2 端到端流程工作**：4指标卡 + 端到端进度图 + 工作说明

### 修订计划完整链路
1. **创建计划**：指定月份+名称 → 自动生成计划名，记录创建人和创建时间
2. **添加任务**：从流程清单选择，携带编码/名称/所有者/部门/版本/格式/分类，记录操作人
3. **下发计划**：草稿→已下发，任务状态变为"待执行"
4. **执行任务**：待执行→进行中→已完成(记录完成时间，使用北京时间)
5. **撤回任务**：已完成→待执行(清除完成时间)
6. **顺延任务**：校验下月计划是否已存在→创建或追加+复制任务，原任务标记"已顺延"
7. **导出Excel**：Sheet1任务明细 + Sheet2部门完成进度统计

### 评价体系完整链路
1. **自评标准初始化**：从嵌入的Excel解析数据初始化assessment_standards表（178条标准项）
2. **创建自评**：指定名称+周期 → 生成草稿自评记录；支持从历史自评复制，携带所有评分明细
3. **填写自评**：按三大板块（机制建设满分1分/运行效果满分3分/IT覆盖满分1分，总满分5分）逐项评分
   - 机制建设板块：逐条评价标准，0/1评分（有/无）
   - 运行效果/IT覆盖板块：按评分组选择程度1-5，每组仅选一个程度
4. **保存与计分**：保存明细 → 自动按公式计算各板块得分 → 更新总得分。公式：机制建设=子项总和/28×1，运行效果=子项总和/99×3，IT覆盖=子项总和/10×1
5. **提交自评**：草稿→已提交，不可再编辑
6. **删除自评**：支持删除任何状态的自评（含已提交），均需二次确认
7. **复制自评**：从历史自评复制为新草稿，包含所有评分明细，可直接在之前版本上修改
8. **编辑名称/周期**：列表视图支持行内编辑自评名称和评价周期（不限状态），Enter保存/Escape取消
9. **列表排序**：评价周期、创建时间支持升序/降序/无排序三态切换
10. **自评对比**：列表页选择两次自评 → 生成对比报告（各板块差异+明细项得分率变化+待改进方向）
11. **对比报告导出**：对比报告支持导出Excel
12. **自评列表导出**：导出所有自评记录为Excel，包含名称/周期/状态/各板块得分/创建人等
13. **导出Excel**：按模板格式导出自评为Excel文件，包含评价标准+现状情况+自评分值+汇总行
14. **创建人显示**：自评列表中created_by显示用户display_name而非username

### 认证与权限
- 登录：bcrypt验证 → JWT token存入Session Cookie（浏览器关闭即失效），同时返回 token 供 Bearer 认证
- 双重认证：Cookie + Authorization Bearer Token，前端 fetch 拦截器自动注入 Authorization 头（解决 iframe 第三方 Cookie 限制）
- 密钥：JWT_SECRET 从环境变量读取，缺失时拒绝启动
- 超时：JWT Token有效期1小时，过期需重新登录
- 会话：Cookie中的token → 验证用户（getSession）；也支持 Authorization Bearer 头
- 权限：用户关联菜单权限，导航栏动态渲染有权限的菜单
- 超管：拥有所有菜单权限
- API鉴权：所有业务API通过 `requireAuth()` 中间件校验登录态，未登录返回401
- 前端401处理：`auth-provider.tsx` 拦截401响应，自动跳转登录页
- 自我保护：禁止删除当前登录账号（前后端双重校验）

### 数据安全
- **搜索注入防护**：`escapeIlike()` 函数转义 `%`、`_`、`\`，所有 ilike 查询参数统一转义
- **审计追踪**：所有业务表含 created_by/created_at_ts/updated_by/updated_at_ts，每次操作自动记录
- **密码安全**：bcrypt hash 存储，修改密码需验证旧密码

### 数据初始化
- `POST /api/flows/reinitialize`：上传Excel → 自动查找L1-L4流程清单Sheet → 解析标题行 → 清空旧数据 → 批量写入
- 使用 `range:1` 选项跳过合并标题行

### 时区处理
- `beijingNow()` (utils.ts)：返回北京时间 `YYYY-MM-DD HH:mm:ss`，所有用户可见时间统一使用此函数

## 环境变量

| 变量名 | 必需 | 说明 |
|--------|------|------|
| JWT_SECRET | 是 | JWT签名密钥，缺失时服务拒绝启动 |
| NEXT_PUBLIC_SUPABASE_URL | 是 | Supabase项目URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 是 | Supabase匿名Key |

## 共享组件

| 组件 | 路径 | 说明 |
|------|------|------|
| PaginationBar | components/pagination-bar.tsx | 统一分页(页码+跳转+条数选择) |
| TruncateDiv | components/truncate-cell.tsx | 截断文本+悬浮Tooltip |
| MultiSelectFilter | components/multi-select-filter.tsx | 多选筛选下拉 |

## 共享工具函数

| 函数 | 路径 | 说明 |
|------|------|------|
| cn() | lib/utils.ts | className合并 (clsx+tailwind-merge) |
| beijingNow() | lib/utils.ts | 返回北京时间字符串 |
| escapeIlike() | lib/utils.ts | 转义ilike通配符，防搜索注入 |
| requireAuth() | lib/api-auth.ts | API鉴权中间件，校验登录态并返回用户信息 |
| getSession() | lib/auth.ts | 解析JWT token获取会话信息（优先Authorization头，回退Cookie） |
| createSession() | lib/auth.ts | 创建JWT token并设置Session Cookie，同时返回token |
| getTokenFromRequest() | lib/auth.ts | 从请求中提取token（优先Authorization Bearer头，回退Cookie） |
| assessment-data.ts | lib/assessment-data.ts | 自评数据访问层 (CRUD+计分+对比报告) |
| assessment-standards-data.ts | lib/assessment-standards-data.ts | 自评标准项嵌入数据 (178条) |
| assessment-template.ts | lib/assessment-template.ts | 自评导出模板Excel (base64编码，导出时基于此模板填充数据) |

## 列表页标准样式（基准页：流程清单 `/functional/list`）

详细设计规范见 `DESIGN.md` →「列表页标准样式规范」章节。以下为快速参考：

### 页面标题
- 左侧竖线：`h-8 w-1.5 rounded-full bg-[#1e3a5f]`
- 标题文字：`text-xl font-semibold text-[#1e3a5f]`
- 布局：`flex items-center gap-2`，与右侧操作按钮同行 `justify-between`

### 工具栏按钮
| 功能 | 文字 | 图标 | 主按钮样式 | 次按钮样式 |
|------|------|------|-----------|-----------|
| 新增 | "新增XXX" | Plus h-3.5 w-3.5 | `bg-[#1e3a5f] hover:bg-[#2d4f7a] h-7 text-xs` | - |
| 导出 | "导出" | Download h-3.5 w-3.5 | - | `variant="outline" h-7 text-xs` |
| 删除 | - | Trash2 h-3.5 w-3.5 | - | `h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50` |
| 编辑 | - | Pencil h-3.5 w-3.5 | - | `h-7 w-7 p-0 text-muted-foreground hover:text-[#1e3a5f] hover:bg-muted` |
| 恢复 | - | Undo2 h-3.5 w-3.5 | - | `h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50` |
| 初始化 | "数据初始化" | RotateCcw h-3.5 w-3.5 | - | `variant="outline" h-7 text-xs text-red-600 border-red-200 hover:bg-red-50` |

### 筛选栏
- 容器：`<Card><CardContent className="pt-3 pb-3">`
- 布局：`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-N gap-2`
- 下拉/搜索框统一：`h-7 text-xs`
- 搜索框：`<Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />` + `<Input className="h-7 text-xs pl-7" />`

### 数据表格
- 容器：`<Card><CardContent className="p-0">`
- 滚动：`overflow-auto max-h-[70vh]`
- 表头：`bg-gray-50/80`，单元格 `text-xs font-medium text-gray-600 whitespace-nowrap`
- 表体：`text-xs`，行 hover `hover:bg-blue-50/50`
- 操作列：sticky `right-0 bg-white z-10`，图标按钮组 `gap-0.5`

### 分页组件
- 统一使用 `<PaginationBar>`，**表格上下各放一个**
- 按钮/输入框 `h-7 text-xs`，当前页 `bg-[#1e3a5f]`
- 每页条数选择器宽度 `w-[88px]`

### 通用规则
- 所有输入控件：`h-7 text-xs`；所有图标：`h-3.5 w-3.5`
- 主操作实底深靛蓝，次操作 outline 描边，危险操作红色系
- 行内操作按钮 `variant="ghost"` 仅图标无边框

## 构建与测试命令

- 静态检查：`pnpm lint --quiet` + `pnpm ts-check`
- 开发：`pnpm dev` (端口 5000)
- 构建：`pnpm build`
