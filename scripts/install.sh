#!/bin/bash
#
#           NebulaOS Installer Script v1.0.0
#
#   GitHub: https://github.com/newbulaos/nebulaos
#   Issues: https://github.com/newbulaos/nebulaos/issues
#   Requires: bash, curl, docker
#
#   Usage:
#     $ curl -fsSL https://raw.githubusercontent.com/newbulaos/nebulaos/main/scripts/install.sh | bash
#       or
#     $ wget -qO- https://raw.githubusercontent.com/newbulaos/nebulaos/main/scripts/install.sh | bash
#

clear
echo -e "\e[0m\c"

echo '
  _   _      _           _       ___  ____
 | \ | | ___| |__  _   _| | __ _/ _ \/ ___|
 |  \| |/ _ \ '"'"'_ \| | | | |/ _` | | | \___ \
 | |\  |  __/ |_) | |_| | | (_| | |_| |___) |
 |_| \_|\___|_.__/ \__,_|_|\__,_|\___/|____/

   --- Modern Home Server Dashboard ---
'

export PATH=/usr/sbin:$PATH
export DEBIAN_FRONTEND=noninteractive
set -e

###############################################################################
# GLOBALS                                                                     #
###############################################################################

((EUID)) && sudo_cmd="sudo"
# shellcheck source=/dev/null
source /etc/os-release

readonly MINIMUM_DISK_SIZE_GB="5"
readonly MINIMUM_MEMORY="512"
readonly MINIMUM_DOCKER_VERSION="20"
readonly REPO="newbulaos/nebulaos"
readonly INSTALL_DIR="/opt/nebulaos"
readonly DATA_DIR="/opt/nebulaos/data"
readonly RAW_BASE="https://raw.githubusercontent.com/${REPO}/main"

PHYSICAL_MEMORY=$(LC_ALL=C free -m | awk '/Mem:/ { print $2 }')
readonly PHYSICAL_MEMORY
FREE_DISK_BYTES=$(LC_ALL=C df -P / | tail -n 1 | awk '{print $4}')
readonly FREE_DISK_BYTES
readonly FREE_DISK_GB=$((FREE_DISK_BYTES / 1024 / 1024))
LSB_DIST=$( ([ -n "${ID_LIKE}" ] && echo "${ID_LIKE}") || ([ -n "${ID}" ] && echo "${ID}"))
readonly LSB_DIST
DIST=$(echo "${ID}")
readonly DIST
UNAME_M="$(uname -m)"
readonly UNAME_M
UNAME_U="$(uname -s)"
readonly UNAME_U
TARGET_ARCH=""

# COLORS
readonly COLOUR_RESET='\e[0m'
readonly aCOLOUR=(
    '\e[38;5;99m'  # purple  | Lines, bullets
    '\e[1m'        # Bold    | Descriptions
    '\e[90m'       # Grey    | Credits
    '\e[91m'       # Red     | Errors
    '\e[33m'       # Yellow  | Warnings
)
readonly PURPLE_LINE=" ${aCOLOUR[0]}─────────────────────────────────────────────────────$COLOUR_RESET"
readonly PURPLE_BULLET=" ${aCOLOUR[0]}•$COLOUR_RESET"

trap 'onCtrlC' INT
onCtrlC() { echo -e "${COLOUR_RESET}"; exit 1; }

###############################################################################
# HELPERS                                                                     #
###############################################################################

Show() {
    if (($1 == 0)); then
        echo -e "${aCOLOUR[2]}[$COLOUR_RESET${aCOLOUR[0]}  OK  $COLOUR_RESET${aCOLOUR[2]}]$COLOUR_RESET $2"
    elif (($1 == 1)); then
        echo -e "${aCOLOUR[2]}[$COLOUR_RESET${aCOLOUR[3]}FAILED$COLOUR_RESET${aCOLOUR[2]}]$COLOUR_RESET $2"
        exit 1
    elif (($1 == 2)); then
        echo -e "${aCOLOUR[2]}[$COLOUR_RESET${aCOLOUR[0]} INFO $COLOUR_RESET${aCOLOUR[2]}]$COLOUR_RESET $2"
    elif (($1 == 3)); then
        echo -e "${aCOLOUR[2]}[$COLOUR_RESET${aCOLOUR[4]}NOTICE$COLOUR_RESET${aCOLOUR[2]}]$COLOUR_RESET $2"
    fi
}

GreyStart() { echo -e "${aCOLOUR[2]}\c"; }
ColorReset() { echo -e "$COLOUR_RESET\c"; }

###############################################################################
# CHECKS                                                                      #
###############################################################################

Check_Arch() {
    case $UNAME_M in
    *aarch64*) TARGET_ARCH="arm64" ;;
    *64*)      TARGET_ARCH="amd64" ;;
    *armv7*)   TARGET_ARCH="arm-7" ;;
    *)
        Show 1 "Unsupported architecture: $UNAME_M"
        exit 1
        ;;
    esac
    Show 0 "Architecture: $UNAME_M ($TARGET_ARCH)"
}

Check_OS() {
    if [[ $UNAME_U == *Linux* ]]; then
        Show 0 "OS: $UNAME_U"
    else
        Show 1 "This script is only for Linux."
        exit 1
    fi
}

Check_Distribution() {
    case $LSB_DIST in
    *debian* | *ubuntu* | *raspbian*) ;;
    *)
        Show 3 "Untested distribution: ${DIST}. Continuing anyway..."
        ;;
    esac
    Show 0 "Distribution: ${DIST}"
}

Check_Memory() {
    if [[ "${PHYSICAL_MEMORY}" -lt "${MINIMUM_MEMORY}" ]]; then
        Show 1 "Requires at least ${MINIMUM_MEMORY}MB RAM. Found: ${PHYSICAL_MEMORY}MB"
    fi
    Show 0 "Memory: ${PHYSICAL_MEMORY}MB"
}

Check_Disk() {
    if [[ "${FREE_DISK_GB}" -lt "${MINIMUM_DISK_SIZE_GB}" ]]; then
        Show 3 "Low disk space: ${FREE_DISK_GB}GB free (recommended: ${MINIMUM_DISK_SIZE_GB}GB+)"
        read -rp "Continue anyway? [y/N] " yn </dev/tty
        [[ $yn =~ ^[Yy]$ ]] || { Show 1 "Installation aborted."; exit 1; }
    else
        Show 0 "Disk: ${FREE_DISK_GB}GB free"
    fi
}

###############################################################################
# DOCKER                                                                      #
###############################################################################

Install_Docker() {
    Show 2 "Installing Docker..."
    GreyStart
    curl -fsSL https://get.docker.com | bash
    ColorReset
    ${sudo_cmd} systemctl enable --now docker
    Show 0 "Docker installed."
}

Check_Docker() {
    if [[ -x "$(command -v docker)" ]]; then
        Docker_Version=$(${sudo_cmd} docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0")
        if [[ ${Docker_Version:0:2} -lt "${MINIMUM_DOCKER_VERSION}" ]]; then
            Show 1 "Docker ${Docker_Version} is too old. Minimum: ${MINIMUM_DOCKER_VERSION}.x"
        fi
        Show 0 "Docker ${Docker_Version}"
    else
        Install_Docker
    fi

    # Ensure docker is running
    for i in 1 2 3; do
        [[ $(${sudo_cmd} systemctl is-active docker) == "active" ]] && break
        Show 2 "Starting Docker..."
        ${sudo_cmd} systemctl start docker
        sleep 3
    done
}

Install_Compose() {
    if docker compose version &>/dev/null 2>&1; then
        Show 0 "Docker Compose $(docker compose version --short 2>/dev/null || echo 'installed')"
        return
    fi
    Show 2 "Installing Docker Compose plugin..."
    local ver="v2.29.1"
    ${sudo_cmd} mkdir -p /usr/local/lib/docker/cli-plugins
    ${sudo_cmd} curl -fsSL \
        "https://github.com/docker/compose/releases/download/${ver}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    ${sudo_cmd} chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    docker compose version &>/dev/null || Show 1 "Docker Compose installation failed."
    Show 0 "Docker Compose ${ver}"
}

###############################################################################
# INSTALL                                                                     #
###############################################################################

Setup_Directories() {
    Show 2 "Setting up directories..."
    ${sudo_cmd} mkdir -p "${INSTALL_DIR}" "${DATA_DIR}"
    Show 0 "Directories ready: ${INSTALL_DIR}"
}

Download_Files() {
    Show 2 "Downloading NebulaOS..."
    GreyStart
    ${sudo_cmd} curl -fsSL "${RAW_BASE}/docker-compose.yml" -o "${INSTALL_DIR}/docker-compose.yml"
    ColorReset
    Show 0 "docker-compose.yml downloaded."
}

Generate_Config() {
    if [[ -f "${INSTALL_DIR}/.env" ]]; then
        Show 3 "Config already exists, skipping generation."
        return
    fi
    Show 2 "Generating configuration..."
    JWT_SECRET=$(openssl rand -hex 32)
    SERVER_IP=$(hostname -I | awk '{print $1}')
    ${sudo_cmd} tee "${INSTALL_DIR}/.env" >/dev/null <<EOF
JWT_SECRET=${JWT_SECRET}
BACKEND_PORT=8080
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://${SERVER_IP}:8080
NEXT_PUBLIC_WS_URL=ws://${SERVER_IP}:8080
CORS_ORIGINS=http://${SERVER_IP}:3000
EOF
    ${sudo_cmd} chmod 644 "${INSTALL_DIR}/.env"
    Show 0 "Config generated."
}

Start_Services() {
    Show 2 "Starting NebulaOS (building images, this may take a few minutes)..."
    cd "${INSTALL_DIR}"
    GreyStart
    ${sudo_cmd} docker compose up -d --build
    ColorReset
    Show 0 "Services started."
}

Install_Systemd_Service() {
    Show 2 "Registering systemd service..."
    ${sudo_cmd} tee /etc/systemd/system/nebulaos.service >/dev/null <<EOF
[Unit]
Description=NebulaOS Home Server Dashboard
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=docker compose up -d
ExecStop=docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF
    ${sudo_cmd} systemctl daemon-reload
    ${sudo_cmd} systemctl enable nebulaos
    Show 0 "Auto-start on boot enabled."
}

Wait_For_Ready() {
    Show 2 "Waiting for backend to be ready..."
    for i in $(seq 1 30); do
        if curl -sf http://localhost:8080/health &>/dev/null; then
            Show 0 "Backend is ready."
            return
        fi
        sleep 3
    done
    Show 3 "Backend not responding yet. Check: docker compose -f ${INSTALL_DIR}/docker-compose.yml logs"
}

###############################################################################
# WELCOME                                                                     #
###############################################################################

Welcome_Banner() {
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo ""
    echo -e "${PURPLE_LINE}"
    echo -e "${aCOLOUR[1]} NebulaOS v1.0.0 is running!${COLOUR_RESET}"
    echo -e "${PURPLE_LINE}"
    echo -e "${PURPLE_BULLET} Dashboard : ${aCOLOUR[0]}http://${SERVER_IP}:3000${COLOUR_RESET}"
    echo -e "${PURPLE_BULLET} API       : ${aCOLOUR[0]}http://${SERVER_IP}:8080${COLOUR_RESET}"
    echo -e "${PURPLE_LINE}"
    echo -e "${PURPLE_BULLET} Username  : ${aCOLOUR[4]}admin${COLOUR_RESET}"
    echo -e "${PURPLE_BULLET} Password  : ${aCOLOUR[4]}nebula123!${COLOUR_RESET}"
    echo -e "${PURPLE_LINE}"
    echo -e " ${aCOLOUR[2]}GitHub  : https://github.com/${REPO}"
    echo -e " ${aCOLOUR[2]}Issues  : https://github.com/${REPO}/issues${COLOUR_RESET}"
    echo ""
    echo -e " ${aCOLOUR[1]}Manage  ${COLOUR_RESET}: cd ${INSTALL_DIR} && docker compose [logs|down|up]"
    echo -e " ${aCOLOUR[4]}⚠  Change your password after first login!${COLOUR_RESET}"
    echo ""
}

###############################################################################
# MAIN                                                                        #
###############################################################################

# Step 1: Check system
Check_Arch
Check_OS
Check_Distribution
Check_Memory
Check_Disk

# Step 2: Install Docker
Check_Docker
Install_Compose

# Step 3: Install NebulaOS
Setup_Directories
Download_Files
Generate_Config
Start_Services
Install_Systemd_Service

# Step 4: Wait and show banner
Wait_For_Ready
Welcome_Banner
