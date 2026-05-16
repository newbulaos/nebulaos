# NebulaOS Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / Mobile                     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────┐
│              Frontend (Next.js 15 + React 19)            │
│  Dashboard │ Docker │ AppStore │ Files │ Monitoring      │
└──────────────────────────┬──────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼──────────────────────────────┐
│              Backend (Go + Fiber)                        │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │   Auth   │ │  Docker  │ │ Monitor  │ │  AppStore │  │
│  │ JWT+TOTP │ │   SDK    │ │  WS Hub  │ │ Templates │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │  SQLite  │ │  Redis   │ │  gRPC    │                 │
│  │ /Postgres│ │  Cache   │ │  Client  │                 │
│  └──────────┘ └──────────┘ └────┬─────┘                 │
└───────────────────────────────── │ ──────────────────────┘
                                   │ gRPC
┌──────────────────────────────────▼──────────────────────┐
│              Agent (Go)                                  │
│                                                          │
│  gopsutil → CPU/RAM/Disk/Net/Temp                        │
│  Docker SDK → Container metrics                          │
│  Prometheus exporter → /metrics                          │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
nebulaos/
├── backend/
│   ├── cmd/server/main.go          # Entry point
│   ├── internal/
│   │   ├── auth/                   # JWT, TOTP, RBAC
│   │   ├── docker/                 # Docker SDK integration
│   │   ├── monitoring/             # Metrics + WS broadcast
│   │   ├── system/                 # OS info, reboot, update
│   │   ├── appstore/               # App templates, install
│   │   ├── filemanager/            # File operations
│   │   └── proxy/                  # Reverse proxy rules
│   └── pkg/
│       ├── config/                 # Viper config
│       ├── database/               # GORM + models
│       ├── middleware/             # JWT, RBAC, audit
│       ├── server/                 # Fiber app + routes
│       └── logger/                 # Zerolog
│
├── frontend/
│   └── src/
│       ├── app/                    # Next.js App Router
│       │   ├── login/              # Auth page
│       │   └── dashboard/          # Protected pages
│       ├── components/
│       │   ├── ui/                 # shadcn/ui primitives
│       │   ├── dashboard/          # Sidebar, topbar, cards
│       │   └── docker/             # Container UI, terminal
│       ├── hooks/                  # useWebSocket, etc.
│       ├── lib/                    # api client, utils
│       └── store/                  # Zustand stores
│
├── agent/
│   ├── cmd/main.go                 # gRPC + Prometheus server
│   └── internal/
│       ├── collector/              # gopsutil metrics
│       └── metrics/                # gRPC service impl
│
├── deployments/
│   ├── docker/                     # docker-compose files
│   ├── systemd/                    # systemd units
│   └── k8s/                        # Kubernetes manifests
│
├── docs/
│   ├── api/API.md                  # API reference
│   └── architecture/ERD.md         # Database ERD
│
├── scripts/install.sh              # One-line installer
├── Makefile                        # Dev commands
└── .github/workflows/ci.yml        # CI/CD
```

## Security Architecture

```
Request → Rate Limiter (100 req/min)
        → Helmet (security headers)
        → CORS (whitelist origins)
        → JWT Validation
        → RBAC Check (admin/operator/viewer)
        → Audit Log (async)
        → Handler
```

- Passwords: bcrypt cost 12
- JWT: HS256, 24h expiry, refresh rotation
- TOTP: RFC 6238 (Google Authenticator compatible)
- Sessions: stored in DB, revocable
- SQLite WAL mode for concurrent reads
- All secrets via env vars, never in code

## Performance Targets

| Metric              | Target        |
|---------------------|---------------|
| Backend RAM         | < 50 MB idle  |
| Agent RAM           | < 20 MB       |
| Frontend bundle     | < 200 KB gzip |
| API response (p99)  | < 50ms        |
| WS metrics latency  | < 100ms       |
| Cold start          | < 500ms       |

## Roadmap

### v1.0 (Current)
- [x] Auth (JWT + TOTP + RBAC)
- [x] Docker management (containers, images, volumes, networks)
- [x] Realtime metrics via WebSocket
- [x] Browser terminal (xterm.js + exec)
- [x] Realtime logs streaming

### v1.1
- [ ] App Store (YAML templates, 1-click install)
- [ ] File Manager (upload/download/preview)
- [ ] Reverse proxy manager (Caddy integration)
- [ ] SSL auto-generation (Let's Encrypt)
- [ ] Notification center

### v1.2
- [ ] Backup & restore
- [ ] Grafana/Prometheus integration
- [ ] Alert manager
- [ ] Fail2Ban integration
- [ ] Secrets management

### v2.0
- [ ] AI assistant (troubleshooting, compose generation)
- [ ] Plugin SDK + marketplace
- [ ] Multi-node support
- [ ] Cloudflare Tunnel integration
- [ ] Tailscale integration
- [ ] Kubernetes (k3s) support
