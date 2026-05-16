package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"

	"github.com/newbulaos/nebulaos/agent/internal/collector"
)

func main() {
	log := zerolog.New(os.Stdout).With().Timestamp().Logger()
	metricsPort := envOr("METRICS_PORT", "9100")

	col := collector.New()
	col.Start(context.Background())

	cpuGauge := prometheus.NewGauge(prometheus.GaugeOpts{Name: "node_cpu_usage_percent", Help: "CPU usage percent"})
	memGauge := prometheus.NewGauge(prometheus.GaugeOpts{Name: "node_memory_used_percent", Help: "Memory used percent"})
	uptimeGauge := prometheus.NewGauge(prometheus.GaugeOpts{Name: "node_uptime_seconds", Help: "System uptime seconds"})
	prometheus.MustRegister(cpuGauge, memGauge, uptimeGauge)

	go func() {
		for {
			if snap := col.Latest(); snap != nil {
				cpuGauge.Set(snap.CPU.UsagePercent)
				memGauge.Set(snap.Memory.UsedPercent)
				uptimeGauge.Set(float64(snap.Uptime))
			}
			time.Sleep(2 * time.Second)
		}
	}()

	http.Handle("/metrics", promhttp.Handler())
	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(200) })

	srv := &http.Server{Addr: ":" + metricsPort}
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info().Str("port", metricsPort).Msg("agent started")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	<-quit
	srv.Shutdown(context.Background()) //nolint:errcheck
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
