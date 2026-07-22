# 部署配置模板
# 复制本文件为 deploy.config.ps1 后填写实际值 (deploy.config.ps1 已被 .gitignore 忽略, 不会入库)
#
# 前置条件:
#  - 本机已安装 WSL2 且其中装有 pnpm 9 (用于构建)
#  - 本机 OpenSSH 客户端可用 (Windows 10+ 自带 scp/ssh)
#  - 已对服务器配置 SSH 免密 (ssh-copy-id)

# 远程 Linux 服务器 (内网 IP)
$ServerIP       = "192.168.1.100"        # 服务器内网 IP
$ServerUser     = "ubuntu"               # SSH 登录用户
$SshPort        = 22
$SshKey         = "$HOME/.ssh/id_rsa"    # 本机私钥路径

# 服务器部署目录 (解包目标, 应用根目录)
$DeployDir      = "/opt/workflowsys"
# 服务器上临时存放 tar 的目录 (deploy.ps1 会把 tar scp 到这里)
$RemoteDropDir  = "/tmp/deploy-drop"

# 构建机本地 (仓库根目录与本地 tar 产出目录)
$LocalProjectDir = (Resolve-Path "$PSScriptRoot/..").Path
$LocalDropDir    = "$env:USERPROFILE\deploy-drop"

# 应用
$AppName = "workflowsys"
$Port    = 5000
