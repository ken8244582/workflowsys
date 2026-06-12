import { pgTable, index, pgPolicy, serial, text, integer, timestamp, uniqueIndex, boolean, varchar, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const flows = pgTable("flows", {
	id: serial().primaryKey().notNull(),
	l1Domain: text("l1_domain").default('').notNull(),
	l1Owner: text("l1_owner").default('').notNull(),
	l2Group: text("l2_group").default('').notNull(),
	l2Owner: text("l2_owner").default('').notNull(),
	l3Segment: text("l3_segment").default('').notNull(),
	l3Owner: text("l3_owner").default('').notNull(),
	processCode: text("process_code").default('').notNull(),
	l4Process: text("l4_process").default('').notNull(),
	version: text().default('').notNull(),
	department: text().default('').notNull(),
	l4Owner: text("l4_owner").default('').notNull(),
	format: text().default('').notNull(),
	category: text().default('').notNull(),
	itCoverage: text("it_coverage").default('').notNull(),
	itSubCategory: text("it_sub_category").default('').notNull(),
	itScore: integer("it_score").default(0).notNull(),
	status: text().default('').notNull(),
	createdBy: text("created_by").default('').notNull(),
	createdAtTs: text("created_at_ts").default('').notNull(),
	updatedBy: text("updated_by").default('').notNull(),
	updatedAtTs: text("updated_at_ts").default('').notNull(),
}, (table) => [
	index("idx_flows_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_flows_format").using("btree", table.format.asc().nullsLast().op("text_ops")),
	index("idx_flows_it_coverage").using("btree", table.itCoverage.asc().nullsLast().op("text_ops")),
	index("idx_flows_l1_domain").using("btree", table.l1Domain.asc().nullsLast().op("text_ops")),
	index("idx_flows_l2_group").using("btree", table.l2Group.asc().nullsLast().op("text_ops")),
	index("idx_flows_l3_segment").using("btree", table.l3Segment.asc().nullsLast().op("text_ops")),
	index("idx_flows_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	pgPolicy("Allow public delete access on flows", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("Allow public update access on flows", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Allow public insert access on flows", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Allow public read access on flows", { as: "permissive", for: "select", to: ["public"] }),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const revisionRecords = pgTable("revision_records", {
	id: serial().primaryKey().notNull(),
	revisionDate: text("revision_date").notNull(),
	processCode: text("process_code").default('').notNull(),
	l4Process: text("l4_process").default('').notNull(),
	version: text().default('').notNull(),
	l1Domain: text("l1_domain").default('').notNull(),
	l2Group: text("l2_group").default('').notNull(),
	l3Segment: text("l3_segment").default('').notNull(),
	revisionType: text("revision_type").default('').notNull(),
	description: text().default('').notNull(),
	operator: text().default('').notNull(),
	createdBy: text("created_by").default('').notNull(),
	createdAtTs: text("created_at_ts").default('').notNull(),
	updatedBy: text("updated_by").default('').notNull(),
	updatedAtTs: text("updated_at_ts").default('').notNull(),
}, (table) => [
	index("idx_revision_l1_domain").using("btree", table.l1Domain.asc().nullsLast().op("text_ops")),
	index("idx_revision_type").using("btree", table.revisionType.asc().nullsLast().op("text_ops")),
	pgPolicy("Allow public delete access on revision_records", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("Allow public update access on revision_records", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Allow public insert access on revision_records", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Allow public read access on revision_records", { as: "permissive", for: "select", to: ["public"] }),
]);

export const revisionPlans = pgTable("revision_plans", {
	id: serial().primaryKey().notNull(),
	planMonth: text("plan_month").notNull(),
	planName: text("plan_name").notNull(),
	status: text().default('草稿').notNull(),
	taskCount: integer("task_count").default(0).notNull(),
	completedCount: integer("completed_count").default(0).notNull(),
	createdAt: text("created_at").default('').notNull(),
	updatedAt: text("updated_at").default('').notNull(),
	createdBy: text("created_by").default('').notNull(),
	updatedBy: text("updated_by").default('').notNull(),
}, (table) => [
	uniqueIndex("idx_revision_plans_month").using("btree", table.planMonth.asc().nullsLast().op("text_ops")),
	pgPolicy("Allow public delete access on revision_plans", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("Allow public update access on revision_plans", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Allow public insert access on revision_plans", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Allow public read access on revision_plans", { as: "permissive", for: "select", to: ["public"] }),
]);

export const planTasks = pgTable("plan_tasks", {
	id: serial().primaryKey().notNull(),
	planId: integer("plan_id").notNull(),
	flowItemId: integer("flow_item_id"),
	processCode: text("process_code").default('').notNull(),
	processName: text("process_name").default('').notNull(),
	owner: text("owner").default('').notNull(),
	department: text().default('').notNull(),
	taskType: text("task_type").default('内容修订').notNull(),
	description: text().default('').notNull(),
	status: text().default('待执行').notNull(),
	completedAt: text("completed_at"),
	carriedFromPlanId: integer("carried_from_plan_id"),
	carriedToPlanId: integer("carried_to_plan_id"),
	sortOrder: integer("sort_order").default(0).notNull(),
	remarks: text().default('').notNull(),
	version: text("version").default('').notNull(),
	format: text("format").default('').notNull(),
	category: text("category").default('').notNull(),
	createdAt: text("created_at").default('').notNull(),
	createdBy: text("created_by").default('').notNull(),
	updatedBy: text("updated_by").default('').notNull(),
	updatedAtTs: text("updated_at_ts").default('').notNull(),
}, (table) => [
	index("idx_plan_tasks_department").using("btree", table.department.asc().nullsLast().op("text_ops")),
	index("idx_plan_tasks_flow_item_id").using("btree", table.flowItemId.asc().nullsLast().op("int4_ops")),
	index("idx_plan_tasks_plan_id").using("btree", table.planId.asc().nullsLast().op("int4_ops")),
	index("idx_plan_tasks_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	pgPolicy("Allow public delete access on plan_tasks", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("Allow public update access on plan_tasks", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Allow public insert access on plan_tasks", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Allow public read access on plan_tasks", { as: "permissive", for: "select", to: ["public"] }),
]);

export const e2eProcesses = pgTable("e2e_processes", {
	id: text("id").primaryKey().notNull(),
	name: text("name").default('').notNull(),
	owner: text("owner").default('').notNull(),
	department: text("department").default('').notNull(),
	responsiblePerson: text("responsible_person").default('').notNull(),
	currentProgress: integer("current_progress").default(0).notNull(),
	targetProgress: integer("target_progress").default(100).notNull(),
	status: text("status").default('not_started').notNull(),
	startDate: text("start_date").default(''),
	completedDate: text("completed_date").default(''),
	description: text("description").default(''),
	createdBy: text("created_by").default('').notNull(),
	createdAtTs: text("created_at_ts").default('').notNull(),
	updatedBy: text("updated_by").default('').notNull(),
	updatedAtTs: text("updated_at_ts").default('').notNull(),
}, (table) => [
	index("idx_e2e_processes_department").using("btree", table.department.asc().nullsLast().op("text_ops")),
	index("idx_e2e_processes_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	pgPolicy("Allow public read access on e2e_processes", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Allow public insert access on e2e_processes", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Allow public update access on e2e_processes", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Allow public delete access on e2e_processes", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
]);

export const e2ePlans = pgTable("e2e_plans", {
	id: text("id").primaryKey().notNull(),
	processId: text("process_id").notNull(),
	planType: text("plan_type").default('monthly').notNull(),
	year: integer("year").default(0).notNull(),
	period: integer("period").default(0).notNull(),
	planContent: text("plan_content").default('').notNull(),
	planProgress: integer("plan_progress").default(100).notNull(),
	actualProgress: integer("actual_progress").default(0),
	status: text("status").default('planned').notNull(),
	notes: text("notes").default(''),
	createdBy: text("created_by").default('').notNull(),
	createdAtTs: text("created_at_ts").default('').notNull(),
	updatedBy: text("updated_by").default('').notNull(),
	updatedAtTs: text("updated_at_ts").default('').notNull(),
}, (table) => [
	index("idx_e2e_plans_process_id").using("btree", table.processId.asc().nullsLast().op("text_ops")),
	index("idx_e2e_plans_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	pgPolicy("Allow public read access on e2e_plans", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Allow public insert access on e2e_plans", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Allow public update access on e2e_plans", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Allow public delete access on e2e_plans", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
]);

// System tables - no public RLS policies (backend uses service_role_key)
export const sysUsers = pgTable("sys_users", {
	id: serial().primaryKey().notNull(),
	username: varchar("username", { length: 50 }).notNull().unique(),
	password_hash: varchar("password_hash", { length: 255 }).notNull(),
	display_name: varchar("display_name", { length: 100 }),
	is_super_admin: boolean("is_super_admin").default(false).notNull(),
	must_change_password: boolean("must_change_password").default(false).notNull(),
	is_active: boolean("is_active").default(true).notNull(),
	created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_sys_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);

export const sysMenus = pgTable("sys_menus", {
	id: serial().primaryKey().notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	path: varchar("path", { length: 255 }),
	icon: varchar("icon", { length: 100 }),
	parent_id: integer("parent_id"),
	sort_order: integer("sort_order").default(0).notNull(),
	is_visible: boolean("is_visible").default(true).notNull(),
	supported_actions: text("supported_actions").default('["view"]'),
	created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	index("idx_sys_menus_parent_id").using("btree", table.parent_id.asc().nullsLast().op("int4_ops")),
	index("idx_sys_menus_sort_order").using("btree", table.sort_order.asc().nullsLast().op("int4_ops")),
]);

export const sysUserMenus = pgTable("sys_user_menus", {
	id: serial().primaryKey().notNull(),
	user_id: integer("user_id").notNull().references(() => sysUsers.id, { onDelete: "cascade" }),
	menu_id: integer("menu_id").notNull().references(() => sysMenus.id, { onDelete: "cascade" }),
	permissions: jsonb("permissions").$type<Record<string, boolean>>().default({}).notNull(),
}, (table) => [
	index("idx_sys_user_menus_user_id").using("btree", table.user_id.asc().nullsLast().op("int4_ops")),
	index("idx_sys_user_menus_menu_id").using("btree", table.menu_id.asc().nullsLast().op("int4_ops")),
]);

// 菜单功能配置表
export const sysMenuFunctions = pgTable("sys_menu_functions", {
	id: serial().primaryKey().notNull(),
	menu_id: integer("menu_id").notNull().references(() => sysMenus.id, { onDelete: "cascade" }),
	function_code: varchar("function_code", { length: 50 }).notNull(),
	function_name: varchar("function_name", { length: 100 }).notNull(),
	sort_order: integer("sort_order").default(0).notNull(),
	created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	index("idx_sys_menu_functions_menu_id").using("btree", table.menu_id.asc().nullsLast().op("int4_ops")),
]);

// 用户菜单功能权限表
export const sysUserMenuFunctions = pgTable("sys_user_menu_functions", {
	id: serial().primaryKey().notNull(),
	user_id: integer("user_id").notNull().references(() => sysUsers.id, { onDelete: "cascade" }),
	menu_id: integer("menu_id").notNull().references(() => sysMenus.id, { onDelete: "cascade" }),
	function_code: varchar("function_code", { length: 50 }).notNull(),
	is_enabled: boolean("is_enabled").default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	index("idx_sys_user_menu_functions_user_menu").using("btree", table.user_id.asc().nullsLast().op("int4_ops"), table.menu_id.asc().nullsLast().op("int4_ops")),
]);

export type SysMenuFunction = typeof sysMenuFunctions.$inferSelect;
export type NewSysMenuFunction = typeof sysMenuFunctions.$inferInsert;
export type SysUserMenuFunction = typeof sysUserMenuFunctions.$inferSelect;
export type NewSysUserMenuFunction = typeof sysUserMenuFunctions.$inferInsert;
