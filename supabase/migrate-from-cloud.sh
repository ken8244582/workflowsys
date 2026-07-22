#!/usr/bin/env bash
# ============================================================================
# 云端 Supabase -> 本地 Supabase 数据迁移脚本
# 在「远程 Linux 服务器」上执行（服务器已安装 Docker + Supabase CLI，并已 supabase start）
#
# 用法：
#   1) 在 Supabase 控制台 (云端) → Project Settings → Database → Connection string
#      复制 Direct connection 串，形如：
#      postgresql://postgres:<云端密码>@db.<ref>.supabase.co:5432/postgres
#   2) 在本机设置环境变量后运行：
#      export CLOUD_DB_URL='postgresql://postgres:xxxx@db.xxxx.supabase.co:5432/postgres'
#      bash supabase/migrate-from-cloud.sh
#
# 说明：
#   - 仅迁移 public 业务/系统表数据（--data-only），不迁移结构（结构由 supabase start 迁移自动建）
#   - 用 postgres 超级用户直连本地 54322 端口，绕过 RLS
#   - 导入后自动重置所有 serial 序列，避免新插入 id 冲突
#   - 应用的 seed 函数（超管/菜单/评价标准）均为幂等，导入云端数据后不会重复插入
# ============================================================================
set -euo pipefail

# ---- 本地 Supabase 连接参数（与 supabase/config.toml 一致）----
LOCAL_DB_HOST="${LOCAL_DB_HOST:-127.0.0.1}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-54322}"
LOCAL_DB_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-postgres}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-postgres}"

# ---- 云端连接串（必须提供）----
if [ -z "${CLOUD_DB_URL:-}" ]; then
  echo "❌ 请先设置环境变量 CLOUD_DB_URL（云端 Direct connection 串）"
  echo "   例如： export CLOUD_DB_URL='postgresql://postgres:xxxx@db.xxxx.supabase.co:5432/postgres'"
  exit 1
fi

# 需要迁移的表（public schema，含业务表与系统表；e2e_* 为 TEXT 主键无需序列重置）
TABLES=(
  flows
  revision_records
  revision_plans
  plan_tasks
  e2e_processes
  e2e_plans
  sys_users
  sys_menus
  sys_user_menus
  sys_menu_functions
  sys_user_menu_functions
  assessment_standards
  assessments
  assessment_details
  health_check
)

DUMP_FILE="$(mktemp /tmp/cloud_dump_XXXXXX.sql)"
trap 'rm -f "$DUMP_FILE"' EXIT

echo "📤 从云端导出数据 (data-only, public schema) ..."
pg_dump "$CLOUD_DB_URL" \
  --data-only \
  --schema=public \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  $(printf -- '--table=public.%s ' "${TABLES[@]}") \
  > "$DUMP_FILE"

echo "📥 导入到本地 Supabase (127.0.0.1:${LOCAL_DB_PORT}) ..."
PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
  -h "$LOCAL_DB_HOST" \
  -p "$LOCAL_DB_PORT" \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f "$DUMP_FILE"

echo "🔧 重置 serial 序列 ..."
# 仅对带 SERIAL id 的表重置；e2e_* 为 TEXT 主键跳过
SERIAL_TABLES=(
  flows
  revision_records
  revision_plans
  plan_tasks
  sys_users
  sys_menus
  sys_user_menus
  sys_menu_functions
  sys_user_menu_functions
  assessment_standards
  assessments
  assessment_details
  health_check
)

RESET_SQL=""
for t in "${SERIAL_TABLES[@]}"; do
  RESET_SQL="${RESET_SQL}SELECT setval(pg_get_serial_sequence('${t}','id'), COALESCE((SELECT MAX(id) FROM ${t}), 1));"
done

PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
  -h "$LOCAL_DB_HOST" \
  -p "$LOCAL_DB_PORT" \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c "$RESET_SQL"

echo "✅ 迁移完成！"
echo "   建议验证：访问 http://<服务器IP>:54323 (Supabase Studio) 查看表数据，"
echo "   并启动应用后用云端原账号密码登录确认。"
