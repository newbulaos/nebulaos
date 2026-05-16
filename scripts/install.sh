#!/bin/bash
# NebulaOS - One-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/newbulaos/nebulaos/main/scripts/install.sh | bash
set -euo pipefail

REPO="newbulaos/nebulaos"
INSTALL_DIR="/opt/nebulaos"
DATA_DIR="/opt/nebulaos/data"
COMPOSE_URL="https://raw.githubusercontent.com/${REPO}/main/docker-compose.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[•]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }

echo -e "${CYAN}"
cat << 'EOF'
  _   _      _           _       ___  ____
 | \ | | ___| |__  _   _| | __ _/ _ \/ ___|
 |  \| |/ _ \ '_ \| | | | |/ _` | | | \___ \
 | |\  |  __/ |_) | |_| | | (_| | |_| |___) |
 |_| \_|\___|_.__/ \__,_|_|\__,_|\___/|____/
EOF
echo -e "${NC}"
echo "  Modern home server dashboard"
echo "  https://github.com/${REPO}"
echo ""

# Root check
[[ $EUID -ne 0 ]] && error "Please run as root: sudo bash"

# OS check
[[ ! -f /etc/os-release ]] && error "Unsupported OS"
. /etc/os-release
info "Detected: ${PRETTY_NAME}"

# Install Docker if missing
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  success "Docker installed"
else
  success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
fi

# Install docker compose plugin if missing
if ! docker compose version &>/dev/null; then
  info "Installing Docker Compose plugin..."
  COMPOSE_VER="v2.29.1"
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  success "Docker Compose ${COMPOSE_VER}"
fi

docker compose version &>/dev/null || error "Docker Compose not working. Run: apt-get install docker-compose-plugin"

# Setup directories
info "Setting up directories..."
mkdir -p "${INSTALL_DIR}" "${DATA_DIR}"

# Download source and compose
info "Downloading NebulaOS..."
if command -v git &>/dev/null && git ls-remote "https://github.com/${REPO}.git" &>/dev/null 2>&1; then
  git clone --depth=1 "https://github.com/${REPO}.git" "${INSTALL_DIR}/src" 2>/dev/null || \
    git -C "${INSTALL_DIR}/src" pull 2>/dev/null
  cp "${INSTALL_DIR}/src/docker-compose.yml" "${INSTALL_DIR}/docker-compose.yml"
  # Use dev compose which builds from source
  cp "${INSTALL_DIR}/src/docker-compose.dev.yml" "${INSTALL_DIR}/docker-compose.build.yml"
else
  curl -fsSL "${COMPOSE_URL}" -o "${INSTALL_DIR}/docker-compose.yml"
fi

# Generate .env if not exists
if [[ ! -f "${INSTALL_DIR}/.env" ]]; then
  info "Generating configuration..."
  JWT_SECRET=$(openssl rand -hex 32)
  SERVER_IP=$(hostname -I | awk '{print $1}')
  cat > "${INSTALL_DIR}/.env" <<EOF
JWT_SECRET=${JWT_SECRET}
BACKEND_PORT=8080
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://${SERVER_IP}:8080
NEXT_PUBLIC_WS_URL=ws://${SERVER_IP}:8080
CORS_ORIGINS=http://${SERVER_IP}:3000
EOF
  chmod 644 "${INSTALL_DIR}/.env"
  success "Config generated"
fi

# Build and start from source
cd "${INSTALL_DIR}/src"
info "Building and starting NebulaOS (first run takes ~5 minutes)..."
docker compose up -d --build

# Install systemd service for auto-start on boot
cat > /etc/systemd/system/nebulaos.service <<EOF
[Unit]
Description=NebulaOS
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}/src
ExecStart=docker compose up -d
ExecStop=docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nebulaos

# Wait for backend to be ready
info "Waiting for services to start..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health &>/dev/null; then
    break
  fi
  sleep 2
done

# Seed default admin user
info "Creating default admin user..."
docker compose exec -T backend ./nebulaos seed 2>/dev/null || true

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ NebulaOS installed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  🌐 Dashboard : ${CYAN}http://${SERVER_IP}:3000${NC}"
echo -e "  🔧 API       : ${CYAN}http://${SERVER_IP}:8080${NC}"
echo -e "  👤 Username  : ${YELLOW}admin${NC}"
echo -e "  🔑 Password  : ${YELLOW}nebula123!${NC}"
echo ""
echo -e "  ${YELLOW}⚠️  Change your password after first login!${NC}"
echo ""
echo -e "  Manage: ${CYAN}cd ${INSTALL_DIR} && docker compose [up|down|logs]${NC}"
echo ""
