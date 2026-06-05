import { pgTable, serial, text, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

// 流程清单表
export const flows = pgTable(
  "flows",
  {
    id: serial("id").primaryKey(),
    l1Domain: text("l1_domain").notNull().default(""),
    l1Owner: text("l1_owner").notNull().default(""),
    l2Group: text("l2_group").notNull().default(""),
    l2Owner: text("l2_owner").notNull().default(""),
    l3Segment: text("l3_segment").notNull().default(""),
    l3Owner: text("l3_owner").notNull().default(""),
    processCode: text("process_code").notNull().default(""),
    l4Process: text("l4_process").notNull().default(""),
    version: text("version").notNull().default(""),
    department: text("department").notNull().default(""),
    l4Owner: text("l4_owner").notNull().default(""),
    format: text("format").notNull().default(""),
    category: text("category").notNull().default(""),
    itCoverage: text("it_coverage").notNull().default(""),
    itSubCategory: text("it_sub_category").notNull().default(""),
    itScore: integer("it_score").notNull().default(0),
    status: text("status").notNull().default(""),
  },
  (table) => [
    index("idx_flows_l1_domain").on(table.l1Domain),
    index("idx_flows_l2_group").on(table.l2Group),
    index("idx_flows_l3_segment").on(table.l3Segment),
    index("idx_flows_category").on(table.category),
    index("idx_flows_format").on(table.format),
    index("idx_flows_it_coverage").on(table.itCoverage),
    index("idx_flows_status").on(table.status),
  ]
);

// 修订记录表
export const revisionRecords = pgTable(
  "revision_records",
  {
    id: serial("id").primaryKey(),
    revisionDate: text("revision_date").notNull(),
    processCode: text("process_code").notNull().default(""),
    l4Process: text("l4_process").notNull().default(""),
    version: text("version").notNull().default(""),
    l1Domain: text("l1_domain").notNull().default(""),
    l2Group: text("l2_group").notNull().default(""),
    l3Segment: text("l3_segment").notNull().default(""),
    revisionType: text("revision_type").notNull().default(""),
    description: text("description").notNull().default(""),
    operator: text("operator").notNull().default(""),
  },
  (table) => [
    index("idx_revision_type").on(table.revisionType),
    index("idx_revision_l1_domain").on(table.l1Domain),
  ]
);

// 修订计划表
export const revisionPlans = pgTable(
  "revision_plans",
  {
    id: serial("id").primaryKey(),
    planMonth: text("plan_month").notNull(),
    planName: text("plan_name").notNull(),
    status: text("status").notNull().default("草稿"),
    taskCount: integer("task_count").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),
    createdAt: text("created_at").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(""),
  },
  (table) => [
    uniqueIndex("idx_revision_plans_month").on(table.planMonth),
  ]
);

// 计划任务表
export const planTasks = pgTable(
  "plan_tasks",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id").notNull(),
    flowItemId: integer("flow_item_id"),
    processCode: text("process_code").notNull().default(""),
    processName: text("process_name").notNull().default(""),
    department: text("department").notNull().default(""),
    taskType: text("task_type").notNull().default("内容修订"),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("待执行"),
    completedAt: text("completed_at"),
    carriedFromPlanId: integer("carried_from_plan_id"),
    carriedToPlanId: integer("carried_to_plan_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    remarks: text("remarks").notNull().default(""),
    createdAt: text("created_at").notNull().default(""),
  },
  (table) => [
    index("idx_plan_tasks_plan_id").on(table.planId),
    index("idx_plan_tasks_department").on(table.department),
    index("idx_plan_tasks_status").on(table.status),
    index("idx_plan_tasks_flow_item_id").on(table.flowItemId),
  ]
);
