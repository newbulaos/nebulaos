.PHONY: all build dev test lint clean docker-up docker-down migrate

# Variables
BINARY_NAME=nebulaos
BACKEND_DIR=./backend
FRONTEND_DIR=./frontend
AGENT_DIR=./agent
DOCKER_COMPOSE=docker compose -f docker-compose.dev.yml

all: build

## Development
dev:
	$(DOCKER_COMPOSE) up --build

dev-backend:
	cd $(BACKEND_DIR) && air -c .air.toml

dev-frontend:
	cd $(FRONTEND_DIR) && pnpm dev

dev-agent:
	cd $(AGENT_DIR) && air

## Build
build: build-backend build-frontend build-agent

build-backend:
	cd $(BACKEND_DIR) && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/$(BINARY_NAME) ./cmd/server

build-frontend:
	cd $(FRONTEND_DIR) && pnpm build

build-agent:
	cd $(AGENT_DIR) && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/agent ./cmd

## Test
test:
	cd $(BACKEND_DIR) && go test ./... -v -race -coverprofile=coverage.out
	cd $(AGENT_DIR) && go test ./... -v

test-e2e:
	cd $(FRONTEND_DIR) && pnpm test:e2e

lint:
	cd $(BACKEND_DIR) && golangci-lint run ./...
	cd $(FRONTEND_DIR) && pnpm lint

## Database
migrate-up:
	cd $(BACKEND_DIR) && go run ./cmd/migrate up

migrate-down:
	cd $(BACKEND_DIR) && go run ./cmd/migrate down

migrate-create:
	cd $(BACKEND_DIR) && go run ./cmd/migrate create $(name)

## Docker
docker-up:
	$(DOCKER_COMPOSE) up -d

docker-down:
	$(DOCKER_COMPOSE) down

docker-logs:
	$(DOCKER_COMPOSE) logs -f

docker-build:
	$(DOCKER_COMPOSE) build

## Swagger
swagger:
	cd $(BACKEND_DIR) && swag init -g cmd/server/main.go -o api/swagger

## Clean
clean:
	rm -rf $(BACKEND_DIR)/bin $(FRONTEND_DIR)/.next $(AGENT_DIR)/bin
	$(DOCKER_COMPOSE) down -v

## Install tools
tools:
	go install github.com/air-verse/air@latest
	go install github.com/swaggo/swag/cmd/swag@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	cd $(FRONTEND_DIR) && pnpm install

## Generate
generate:
	cd $(BACKEND_DIR) && go generate ./...
	cd $(BACKEND_DIR) && protoc --go_out=. --go-grpc_out=. pkg/grpc/proto/*.proto

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
