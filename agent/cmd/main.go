package main

import (
	"context"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"
	"google.golang.org/grpc"

	"github.com/nebulaos/nebulaos/agent/internal/collector"
	"github.com/nebulaos/nebulaos/agent/internal/metrics"
)

func main() {
	log := zerolog.New(os.Stdout).With().Timestamp().Logger()

	grpcPort := envOr("GRPC_PORT", "9091")
	metricsPort := envOr("METRICS_PORT", "9100")

	// Collector
	col := collector.New()
	col.Start(context.Background())

	// gRPC server
	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to listen")
	}
	grpcServer := grpc.NewServer()
	metrics.RegisterAgentServer(grpcServer, metrics.NewServer(col))

	// Prometheus metrics endpoint
	http.Handle("/metrics", promhttp.Handler())
	go func() {
		log.Info().Str("port", metricsPort).Msg("prometheus metrics")
		_ = http.ListenAndServe(":"+metricsPort, nil)
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info().Str("port", grpcPort).Msg("agent gRPC server")
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatal().Err(err).Msg("gRPC error")
		}
	}()

	<-quit
	grpcServer.GracefulStop()
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
