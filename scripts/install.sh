#!/bin/bash
# NebulaOS installer script
set -euo pipefail

INSTALL_DIR="/opt/nebulaos"
DATA_DIR="/data/nebulaos"
SERVICE_USER="nebula"
VERSION="${NEBULA_VERSION:-latest}"

echo "🌌 Installing NebulaOS..."

# Check root
[[ $EUID -ne 0 ]] && echo "Run as root" && exit 1

# Dependencies
apt-get update -qq
apt-get install -y -qq curl docker.io sqlite3

# Create user
id -u $SERVICE_USER &>/dev/null || useradd -r -s /bin/false $SERVICE_USER
usermod -aG docker $SERVICE_USER

# Directories
mkdir -p $INSTALL_DIR/bin $DATA_DIR
chown -R $SERVICE_USER:$SERVICE_USER $DATA_DIR

# Download binaries
ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
BASE_URL="https://github.com/nebulaos/nebulaos/releases/download/${VERSION}"

curl -fsSL "${BASE_URL}/nebulaos-linux-${ARCH}" -o $INSTALL_DIR/bin/nebulaos
curl -fsSL "${BASE_URL}/agent-linux-${ARCH}" -o $INSTALL_DIR/bin/agent
chmod +x $INSTALL_DIR/bin/*

# Config
mkdir -p /etc/nebulaos
if [[ ! -f /etc/nebulaos/nebulaos.env ]]; then
  JWT_SECRET=$(openssl rand -hex 32)
  cat > /etc/nebulaos/nebulaos.env <<EOF
ENV=production
DB_DRIVER=sqlite
DB_PATH=${DATA_DIR}/nebulaos.db
JWT_SECRET=${JWT_SECRET}
SERVER_PORT=8080
EOF
  chmod 600 /etc/nebulaos/nebulaos.env
fi

# Systemd
cp /dev/stdin /etc/systemd/system/nebulaos.service < <(curl -fsSL "${BASE_URL}/nebulaos.service")
cp /dev/stdin /etc/systemd/system/nebulaos-agent.service < <(curl -fsSL "${BASE_URL}/nebulaos-agent.service")

systemctl daemon-reload
systemctl enable --now nebulaos nebulaos-agent

echo "✅ NebulaOS installed! Open http://$(hostname -I | awk '{print $1}'):8080"
