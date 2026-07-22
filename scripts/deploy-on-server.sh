#!/usr/bin/env bash
# 服务器部署脚本 (在远程 Linux 服务器运行)
# 用法: deploy-on-server.sh <tar绝对路径> [部署目录]
# 作用: 备份 .env.local -> 解包 -> 同步部署目录(清理陈旧文件, 保留 .env.local)
#       -> 可选 supabase migration up -> pm2 重启(后台守护) -> 健康检查
set -euo pipefail

TAR="${1:-}"
DEPLOY_DIR="${2:-/opt/workflowsys}"
APP_NAME="workflowsys"
PORT="${PORT:-5000}"
ENV_FILE="$DEPLOY_DIR/.env.local"
BACKUP="/tmp/${APP_NAME}-env.local.bak"

if [ -z "$TAR" ] || [ ! -f "$TAR" ]; then
  echo "错误: 请提供存在的 tar 路径。用法: deploy-on-server.sh <tar路径> [部署目录]" >&2
  exit 1
fi

echo "==> 部署目录: $DEPLOY_DIR"

# 1. 备份密钥
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$BACKUP"
  echo "==> 已备份 .env.local"
fi

# 2. 解包到临时目录
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT
echo "==> 解包到 $TMPDIR"
tar -xzf "$TAR" -C "$TMPDIR"

SRC="$TMPDIR/workflowsys"
if [ ! -d "$SRC" ]; then
  echo "错误: 产物包结构异常 (缺少 workflowsys/)" >&2
  exit 1
fi

# 3. 同步到部署目录: 保留 .env.local, 删除陈旧文件
mkdir -p "$DEPLOY_DIR"
echo "==> 同步到 $DEPLOY_DIR (保留 .env.local)"
rsync -a --delete --exclude='.env.local' "$SRC/" "$DEPLOY_DIR/"

# 若原本有 .env.local 但同步后丢失, 还原
if [ -f "$BACKUP" ] && [ ! -f "$ENV_FILE" ]; then
  cp "$BACKUP" "$ENV_FILE"
  echo "==> 还原 .env.local"
fi

# 4. 可选: 应用数据库迁移 (离线, 幂等; 失败仅告警)
if [ -d "$SRC/supabase/migrations" ] && command -v supabase >/dev/null 2>&1; then
  echo "==> 尝试应用数据库迁移 (supabase migration up)"
  ( cd "$DEPLOY_DIR" && supabase migration up ) || echo "警告: 迁移执行失败或无需迁移, 请人工确认"
fi

# 5. pm2 重启 (后台守护进程, 断连不停止, 配合 pm2 startup 可开机自启)
if ! command -v pm2 >/dev/null 2>&1; then
  echo "错误: 未安装 pm2, 请先在 Phase A 安装 (npm i -g pm2)" >&2
  exit 1
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "==> pm2 restart $APP_NAME"
  pm2 restart "$APP_NAME"
else
  echo "==> pm2 start $APP_NAME (cwd=$DEPLOY_DIR)"
  pm2 start "$DEPLOY_DIR/dist/server.js" --name "$APP_NAME" --cwd "$DEPLOY_DIR"
  pm2 save
fi

# 6. 健康检查
echo "==> 健康检查 http://127.0.0.1:$PORT/"
HEALTHY=0
for i in $(seq 1 10); do
  if curl -fsS --max-time 5 "http://127.0.0.1:$PORT/" -o /dev/null; then
    HEALTHY=1
    echo "==> 健康检查通过"
    break
  fi
  sleep 2
done
if [ "$HEALTHY" -eq 0 ]; then
  echo "警告: 健康检查未通过, 请查看: pm2 logs $APP_NAME"
fi

echo "==> 部署完成"
