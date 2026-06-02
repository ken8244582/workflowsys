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
│   └── flow-data.json        # 流程清单数据 (来自 Excel 导出)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # 全局布局 (顶部导航)
│   │   ├── page.tsx          # 统计概览页 (首页)
│   │   ├── globals.css       # 全局样式
│   │   └── flows/
│   │       └── page.tsx      # 流程清单页 (筛选+表格)
│   ├── components/ui/        # Shadcn UI 组件库
│   └── lib/
│       ├── flow-data.ts      # 数据类型定义与统计计算逻辑
│       └── utils.ts          # 通用工具函数 (cn)
├── DESIGN.md                 # 设计规范
└── package.json
```

## 数据结构

流程数据来自 `public/flow-data.json`，核心字段：
- L1 业务域 / L2 业务组 / L3 业务段 / L4 职能流程
- 流程编码、版本号、格式(集团模板/旧格式)、分类(流程/办法/其它)
- 是否IT覆盖、IT支撑分、各级流程所有者

## 关键逻辑

- `computeStats()` 函数负责统计计算：L1 业务域统计、版本分布、分类/格式/IT 覆盖分布
- 统计概览页：6 个关键指标卡片 + 4 组图表 + 明细表格
- 流程清单页：5 维筛选（L1/分类/格式/IT/搜索）+ 分页表格

## 构建与测试命令

- 静态检查：`pnpm lint --quiet` + `pnpm ts-check`
- 开发：`pnpm dev` (端口 5000)
- 构建：`pnpm build`
