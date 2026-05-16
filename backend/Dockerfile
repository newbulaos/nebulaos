FROM golang:1.23-alpine AS base
WORKDIR /app
RUN apk add --no-cache gcc musl-dev sqlite-dev

FROM base AS dev
RUN go install github.com/air-verse/air@latest
COPY go.mod go.sum ./
RUN go mod download
CMD ["air", "-c", ".air.toml"]

FROM base AS builder
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o bin/nebulaos ./cmd/server

FROM alpine:3.20 AS production
RUN apk add --no-cache ca-certificates sqlite-libs tzdata
WORKDIR /app
COPY --from=builder /app/bin/nebulaos .
RUN addgroup -S nebula && adduser -S nebula -G nebula
USER nebula
EXPOSE 8080 9090
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["./nebulaos"]
