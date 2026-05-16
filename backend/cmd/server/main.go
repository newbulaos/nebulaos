package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nebulaos/nebulaos/backend/internal/auth"
	"github.com/nebulaos/nebulaos/backend/internal/docker"
	"github.com/nebulaos/nebulaos/backend/internal/monitoring"
	"github.com/nebulaos/nebulaos/backend/internal/system"
	"github.com/nebulaos/nebulaos/backend/pkg/config"
	"github.com/nebulaos/nebulaos/backend/pkg/database"
	"github.com/nebulaos/nebulaos/backend/pkg/logger"
	"github.com/nebulaos/nebulaos/backend/pkg/server"
)

// @title NebulaOS API
// @version 1.0
// @description Production-ready home server dashboard API
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @host localhost:8080
// @BasePath /api/v1
func main() {
	cfg := config.Load()
	log := logger.New(cfg.LogLevel)

	// Database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect database")
	}
	if err := database.Migrate(db); err != nil {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}

	// Services
	authSvc := auth.NewService(db, cfg)
	dockerSvc := docker.NewService(cfg)
	systemSvc := system.NewService(cfg)
	monitorSvc := monitoring.NewService(cfg)

	// HTTP Server
	app := server.New(cfg, log, authSvc, dockerSvc, systemSvc, monitorSvc)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		addr := cfg.ServerAddr()
		log.Info().Str("addr", addr).Msg("starting NebulaOS server")
		if err := app.Listen(addr); err != nil {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	<-quit
	log.Info().Msg("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = app.ShutdownWithContext(ctx)
}
