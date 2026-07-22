#!/usr/bin/env pwsh
# 一键部署脚本 (在 Windows 构建机运行, 用户日常只需跑它)
# 流程: WSL2 内构建打包 -> scp tar + 服务器脚本到服务器 -> ssh 触发解包重启
# 依赖: WSL2(pnpm)、OpenSSH(scp/ssh, Windows 自带)
param()

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

$Cfg = Join-Path $ScriptDir "deploy.config.ps1"
if (-not (Test-Path $Cfg)) {
  Write-Error "找不到 $Cfg, 请复制 deploy.config.example.ps1 为 deploy.config.ps1 并填写服务器信息"
  exit 1
}
. $Cfg

# Windows 路径 -> WSL 路径 (如 E:\a\b -> /mnt/e/a/b)
function ConvertTo-WslPath($p) {
  $p = $p -replace '\\', '/'
  if ($p -match '^([A-Za-z]):/(.*)$') {
    return "/mnt/$($Matches[1].ToLower())/$($Matches[2])"
  }
  return $p
}

# 确保本地 drop 目录
if (-not (Test-Path $LocalDropDir)) { New-Item -ItemType Directory -Path $LocalDropDir | Out-Null }

# 1) WSL2 内构建 + 打包, 捕获输出的 tar 路径 (最后一行含 .tar.gz)
Write-Host "==> [1/4] 构建并打包 (WSL2)" -ForegroundColor Cyan
$wslProj = ConvertTo-WslPath $LocalProjectDir
$wslDrop = ConvertTo-WslPath $LocalDropDir
$out = wsl bash "$wslProj/scripts/build-artifact.sh" "$wslProj" "$wslDrop" 2>&1
$out | ForEach-Object { Write-Host $_ }
$tarLine = ($out | Where-Object { $_ -match '\.tar\.gz$' } | Select-Object -Last 1)
if (-not $tarLine) {
  Write-Error "未能从构建输出中解析出 tar 路径, 构建可能失败"
  exit 1
}
$tarName = Split-Path $tarLine.Trim() -Leaf
$localTar = Join-Path $LocalDropDir $tarName
if (-not (Test-Path $localTar)) {
  Write-Error "本地找不到产物包: $localTar"
  exit 1
}

# 2) 传输 tar 与服务器脚本到服务器
Write-Host "==> [2/4] 传输产物到服务器 $ServerUser@$ServerIP" -ForegroundColor Cyan
ssh -p $SshPort -i $SshKey "$ServerUser@$ServerIP" "mkdir -p $RemoteDropDir"
scp -P $SshPort -i $SshKey "$localTar" "${ServerUser}@${ServerIP}:${RemoteDropDir}/"
scp -P $SshPort -i $SshKey (Join-Path $ScriptDir "deploy-on-server.sh") "${ServerUser}@${ServerIP}:/tmp/deploy-on-server.sh"

# 3) 服务器解包并重启
Write-Host "==> [3/4] 服务器解包并重启" -ForegroundColor Cyan
$remoteTar = "$RemoteDropDir/$tarName"
ssh -p $SshPort -i $SshKey "$ServerUser@$ServerIP" "bash /tmp/deploy-on-server.sh '$remoteTar' '$DeployDir'"

# 4) 完成
Write-Host "==> [4/4] 部署完成。内网访问: http://${ServerIP}:${Port}/" -ForegroundColor Green
