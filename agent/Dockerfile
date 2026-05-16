FROM golang:1.25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache gcc musl-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/agent ./cmd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates lm-sensors
WORKDIR /app
COPY --from=builder /app/bin/agent .
EXPOSE 9091 9100
CMD ["./agent"]
