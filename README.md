# NebulaOS

> Modern, lightweight home server dashboard — open-source alternative to CasaOS

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Go](https://img.shields.io/badge/Go-1.23-00ADD8)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![GitHub Org](https://img.shields.io/badge/GitHub-newbulaos-181717?logo=github)](https://github.com/newbulaos)

## Features

- 🐳 **Docker Management** — containers, images, volumes, networks, compose deploy
- 📊 **Realtime Monitoring** — CPU, RAM, disk, network, temperature via WebSocket
- 🖥️ **Browser Terminal** — exec into containers with xterm.js
- 🔐 **Security-first** — JWT + TOTP 2FA + RBAC (admin/operator/viewer)
- 🏪 **App Store** — 1-click install via YAML templates *(v1.1)*
- 📁 **File Manager** — upload, download, preview *(v1.1)*
- 🔄 **Reverse Proxy** — Caddy integration + SSL *(v1.1)*
- 🤖 **AI Assistant** — troubleshooting + compose generation *(v2.0)*

## Quick Start

```bash
# One-line install (Ubuntu/Debian)
curl -fsSL https://get.nebulaos.io | sudo bash

# Or with Docker
docker compose -f deployments/docker/docker-compose.dev.yml up
```

Open `http://localhost:3000` — default credentials: `admin / changeme`

## Development

```bash
# Prerequisites: Go 1.23+, Node 22+, pnpm, Docker

make tools        # Install dev tools
make dev          # Start all services via docker compose
make dev-backend  # Backend only (hot reload)
make dev-frontend # Frontend only
make test         # Run all tests
make swagger      # Generate API docs
```

## Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | Go 1.23, Fiber v2, GORM, JWT, gRPC      |
| Frontend | Next.js 15, React 19, TypeScript, shadcn/ui, Framer Motion |
| Agent    | Go + gopsutil + Prometheus              |
| Database | SQLite (default) / PostgreSQL           |
| Cache    | Redis (optional)                        |
| Deploy   | Docker, systemd, Kubernetes             |

## Architecture

See [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)

## API

See [docs/api/API.md](docs/api/API.md) or `/swagger` in dev mode.

## License

MIT © [NebulaOS Contributors](https://github.com/newbulaos)
