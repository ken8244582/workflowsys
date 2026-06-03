# 项目上下文

## 项目概述
职能流程管理统计网站，基于 L1-L4 流程文件清单 Excel 数据，提供流程数据统计概览和流程清单查询功能。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts

## 目录结构

```
├── public/
│   ├── flow-data.json        # 流程清单数据 (来自 Excel 导出)
│   └── revision-plan.json    # 流程修订计划数据 (来自 Excel 导出)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # 全局布局 (顶部导航：统计概览/流程清单/流程修订计划)
│   │   ├── page.tsx          # 统计概览页 (三段式：职能流程/端到端/治理运营)
│   │   ├── globals.css       # 全局样式
│   │   ├── flows/
│   │   │   └── page.tsx      # 流程清单页 (筛选+表格)
│   │   └── revision/
│   │       └── page.tsx      # 流程修订计划页 (统计+图表+明细表)
│   ├── components/ui/        # Shadcn UI 组件库
│   └── lib/
│       ├── flow-data.ts      # 数据类型定义与统计计算逻辑
│       └── utils.ts          # 通用工具函数 (cn)
├── DESIGN.md                 # 设计规范
└── package.json
```

## 数据结构

### 流程清单数据 (flow-data.json)
- L1 业务域 / L2 业务组 / L3 业务段 / L4 职能流程
- 流程编码、版本号、格式(集团模板/旧格式)、分类(流程/办法/其它)
- 是否IT覆盖、IT支撑分、各级流程所有者

### 修订计划数据 (revision-plan.json)
- 计划修订时间、流程编码、L4流程名称
- 修订前/后版本、修订内容、所属部门
- 修订类型(修订/新增)、完成时间、完成情况

## 关键逻辑

- `computeStats()` 函数负责统计计算：L1 业务域统计、版本分布、分类/格式/IT 覆盖分布
- 统计概览页：三段式布局（职能流程工作/端到端流程工作/流程治理运营工作）
  - Section 1：4 指标卡 + 横向堆叠柱状图 + 双饼图 + 版本分布 + 明细表
  - Section 2：4 指标卡 + 端到端进度图 + 明细表 + 工作说明（参考PPT设计）
  - Section 3：修订计划真实数据（4 指标卡 + 部门进度图 + 完成情况饼图）
- 流程清单页：5 维筛选（L1/分类/格式/IT/搜索）+ 分页表格
- 修订计划页：3 维筛选（部门/类型/状态）+ 统计卡片 + 图表 + 明细表

## 构建与测试命令

- 静态检查：`pnpm lint --quiet` + `pnpm ts-check`
- 开发：`pnpm dev` (端口 5000)
- 构建：`pnpm build`
