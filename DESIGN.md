# DESIGN.md

## 气质与意象
企业级流程管理仪表盘，干净利落，以数据呈现为核心。风格类似高端 BI 看板——灰白底色，数据卡片有序排列，图表色彩克制但层次分明。

## 配色方案
- 主色：深靛蓝 `#1e3a5f`，源自企业蓝的沉稳调性
- 辅色：钢灰 `#64748b`
- 强调色：琥珀橙 `#f59e0b`，用于关键指标高亮
- 背景：近白 `#f8fafc`
- 卡片：纯白 `#ffffff`，轻微阴影分隔
- 图表色板：靛蓝、天蓝、翠绿、琥珀橙、紫罗兰、玫红、青灰
- 进度条当前值：靛蓝 `#1e3a5f`
- 进度条目标线：靛蓝虚线
- 进度条计划值：琥珀橙 `#f59e0b`
- 同比上升文字：红色 `#dc2626`
- 删除按钮：红色 `text-red-500`，hover `text-red-600 bg-red-50`
- 危险操作：红色边框 `border-red-200 text-red-600`

## 字体排版
- 中文优先：系统已配置 PingFang SC / Microsoft YaHei
- 数据数字：等宽风格，tabular-nums
- 标题层级：h1 2xl/bold, h2 xl/semibold, h3 lg/semibold

## 页面结构
- 顶部导航栏：固定高度，品牌标识 + 页面切换
- 页面主体：从上到下三段大区域，每段以大标题 + 左侧竖线分隔
  - Section 1：职能流程工作（有数据，完整统计）
  - Section 2：端到端流程工作（参考PPT设计，横向进度条图 + 工作说明）
  - Section 3：流程治理运营工作（预留占位）
- 清单页：筛选栏 + 数据表格

### Section 1 职能流程工作布局
- 4个核心指标卡（L1业务域 / L4流程总数 / 集团模板占比 / IT覆盖率）
- 左：业务域分类构成（横向堆叠柱状图）| 右：格式分布 + 分类分布（双饼图并排）
- 版本分布TOP10（横向柱状图）
- 业务域明细统计表

### Section 2 端到端流程工作布局
- 4个指标卡（端到端流程总数 / 平均贯通率 / 已完成数 / 同比提升最大）
- 核心图表：端到端流程贯通进度图（横向条形图，每条显示：流程名+部门 / 当前完成值蓝色条 / 目标值虚线 / 计划值橙色标记 / 同比变化）
- 下方：工作说明区（已完成事项 / 待完成事项 / 考核要求）

### Section 3 流程治理运营工作布局
- 4个预留指标卡（修订计划数 / 修订完成率 / 流程评审数 / 流程发布数）
- 预留图表区：修订进度 / 所有者分布 / 评审状态
- 虚线占位 + "数据接入中"提示

### 评价体系页面布局
- **成熟度自评列表**：搜索栏 + 分页表格 + 操作列（查看/复制/导出/删除）+ 列表导出 + 自评对比
- **自评详情**：分数卡片（sticky top-14，实时计分）+ 三大板块折叠区（机制建设/运行效果/IT覆盖）
- **自评对比**：选择两次自评 → 生成对比报告（各板块差异+明细项得分率变化+待改进方向）
- **评分交互**：机制建设0/1切换，运行效果/IT覆盖按组选择程度1-5，实时显示得分变化

## 页面标题规范

所有菜单页面（列表页、详情页、看板页）统一使用以下标题样式：

```tsx
<div className="flex items-center gap-2">
  <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
  <h2 className="text-xl font-semibold text-[#1e3a5f]">页面标题</h2>
</div>
```

- **左侧竖线**：`h-8 w-1.5 rounded-full bg-[#1e3a5f]`，深靛蓝色圆角竖条，高度与文字行高协调
- **标题文字**：`text-xl font-semibold text-[#1e3a5f]`，深靛蓝色加粗，字号 xl
- **竖线与文字间距**：`gap-2`（8px）
- 标题与右侧操作按钮同行：外层 `flex items-center justify-between`
- 标题区域无底部分隔线，与下方内容自然衔接

## 操作按钮规范
- 统一使用 lucide-react 图标，尺寸 `h-3.5 w-3.5`
- 按钮高度统一 `h-7 text-xs`
- 新增：Plus + `bg-[#1e3a5f]`
- 导出：Download + `variant="outline"`
- 删除：Trash2 + `text-red-500 hover:text-red-600 hover:bg-red-50`
- 编辑：Pencil + `text-muted-foreground hover:text-[#1e3a5f]`
- 初始化：RotateCcw + `text-red-600 border-red-200`

## 列表页标准样式规范

以流程清单页（`/functional/list`）为基准，所有列表页统一遵循以下标准。

### 1. 页面布局结构

列表页由上至下固定三层结构：

```
┌─────────────────────────────────────────────┐
│  工具栏（标题 + 操作按钮）                     │
├─────────────────────────────────────────────┤
│  筛选栏（Card 容器，内含筛选项 + 搜索框）       │
├─────────────────────────────────────────────┤
│  数据表格（Card 容器，p-0 去内边距）           │
├─────────────────────────────────────────────┤
│  分页组件（PaginationBar）                    │
└─────────────────────────────────────────────┘
```

- 工具栏：`flex items-center justify-between`，左侧标题/Tab切换 + 总条数，右侧操作按钮组
- 筛选栏与表格各用独立 `<Card>` 包裹

### 2. 工具栏按钮规范

| 功能 | 文字 | 图标 | 主按钮样式 | 次按钮样式 |
|------|------|------|-----------|-----------|
| 新增 | "新增XXX" | Plus h-3.5 w-3.5 | `bg-[#1e3a5f] hover:bg-[#2d4f7a] h-7 text-xs` | - |
| 导出 | "导出" | Download h-3.5 w-3.5 | - | `variant="outline" h-7 text-xs` |
| 删除 | - | Trash2 h-3.5 w-3.5 | - | `h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50` |
| 编辑 | - | Pencil h-3.5 w-3.5 | - | `h-7 w-7 p-0 text-muted-foreground hover:text-[#1e3a5f] hover:bg-muted` |
| 恢复 | - | Undo2 h-3.5 w-3.5 | - | `h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50` |
| 初始化 | "数据初始化" | RotateCcw h-3.5 w-3.5 | - | `variant="outline" h-7 text-xs text-red-600 border-red-200 hover:bg-red-50` |

**规则**：
- 按钮高度统一 `h-7`，字号统一 `text-xs`
- 图标统一 `h-3.5 w-3.5`，图标与文字间距 `mr-1`
- 主按钮（新增类）使用深靛蓝实底 `bg-[#1e3a5f]`
- 次按钮（导出/初始化）使用 `variant="outline"` 描边样式
- 行内操作按钮（编辑/删除/恢复）使用 `variant="ghost"` 无边框，尺寸 `h-7 w-7 p-0`
- 危险操作使用红色系：文字按钮 `text-red-600`，行内删除 `text-red-500`

### 3. 筛选栏规范

```tsx
<Card>
  <CardContent className="pt-3 pb-3">
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
      {/* MultiSelectFilter / Select / 搜索框 */}
    </div>
  </CardContent>
</Card>
```

- 外层 `<Card>` + `<CardContent className="pt-3 pb-3">`（左右 padding 保持默认）
- 内部 `grid` 响应式布局：`grid-cols-2 md:grid-cols-4 lg:grid-cols-N`（N 根据筛选项数量调整）
- 间距统一 `gap-2`

#### MultiSelectFilter 组件样式

- 触发按钮：`h-7 px-2 text-xs rounded border`，宽度 `min-w-[100px] max-w-[160px]`
- 已选状态：`border-blue-400 bg-blue-50 text-blue-700`
- 未选状态：`border-slate-300 bg-white text-slate-600`
- 下拉面板：`z-50`，内含搜索框 + 全选 + 列表 + 清除按钮

#### 搜索框样式

```tsx
<div className="relative">
  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
  <Input placeholder="搜索..." className="h-7 text-xs pl-7" />
</div>
```

- 高度 `h-7`，字号 `text-xs`，左侧图标留白 `pl-7`
- Search 图标定位 `absolute left-2 top-2`，尺寸 `h-3.5 w-3.5`

#### Select 下拉框样式

```tsx
<Select>
  <SelectTrigger className="h-7 text-xs">
    <SelectValue />
  </SelectTrigger>
</Select>
```

- 高度 `h-7`，字号 `text-xs`

### 4. 数据表格规范

```tsx
<Card>
  <CardContent className="p-0">
    <div className="overflow-auto max-h-[70vh]">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="bg-gray-50/80">
            <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap ...">
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* 数据行 */}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>
```

- 外层 `<Card>` + `<CardContent className="p-0">`（去掉内边距，表格顶满）
- 滚动容器：`overflow-auto max-h-[70vh]`
- 表格字号：`text-xs`（全局）
- 表头行：`bg-gray-50/80`
- 表头单元格：`text-xs font-medium text-gray-600 whitespace-nowrap`，需要 sticky 时加 `sticky top-0 bg-gray-50 z-10`
- 数据行：`hover:bg-blue-50/50`
- 空状态：`<TableCell colSpan={N} className="text-center py-12 text-gray-400">暂无数据</TableCell>`
- 序号列：`text-gray-400 text-center`
- 居中列：`text-center`
- 长文本截断：使用 `<TruncateDiv>` 组件，指定 `maxWidth`
- 操作列：sticky 定位 `sticky right-0 bg-white z-10`，内含图标按钮组 `flex items-center justify-center gap-0.5`

### 5. 分页组件规范

使用统一 `<PaginationBar>` 组件，位于表格下方，无 Card 包裹：

- 高度：按钮 `h-7`，输入框 `h-7`，字号 `text-xs`
- 当前页按钮：`bg-[#1e3a5f]`（variant="default"）
- 其他页按钮：`variant="outline" h-7 w-7 p-0 text-xs`
- 页码跳转输入框：`h-7 w-12 text-xs text-center`
- 每页条数选择器：`h-7 w-[72px] text-xs`
- 布局：`flex items-center justify-between py-1`
- 左侧：总条数 + 每页条数选择
- 右侧：翻页按钮 + 页码 + 跳转输入

### 6. 通用规则

- 所有输入控件统一高度 `h-7`、字号 `text-xs`
- 所有图标统一尺寸 `h-3.5 w-3.5`（lucide-react）
- 筛选区垂直内边距 `pt-3 pb-3`，间距 `gap-2`
- 表格去内边距 `p-0`，表格自身处理间距
- 行内操作按钮无边框 `variant="ghost"`，仅图标无文字
- 新增/主操作用实底深靛蓝，导出/次要操作用 outline 描边
- 危险操作统一红色系（边框 `border-red-200`、文字 `text-red-600`、行内 `text-red-500`）

## 交互与状态
- 会话超时：Cookie为Session模式（浏览器关闭失效），JWT 1小时过期后自动跳转登录页
- 401处理：前端全局拦截401响应，清除本地登录态并重定向至登录页
- 删除保护：当前登录账号的删除按钮置灰禁用；删除操作均需二次确认
- 搜索安全：所有搜索输入自动转义特殊字符，防止通配符注入
- 权限控制：hasPermission(path, action) 控制按钮显隐和输入框可编辑性
- 自评实时计分：修改分数后实时更新分数卡片，无需保存

## 设计禁忌
- 禁止使用渐变背景填充大面积区域
- 禁止过度装饰（阴影/圆角/动画过多）
- 禁止低对比度文字（灰度文字需 ≥ #64748b）
- 禁止删除按钮使用灰色（统一红色）
- 禁止操作按钮图标尺寸不统一（统一h-3.5 w-3.5）
