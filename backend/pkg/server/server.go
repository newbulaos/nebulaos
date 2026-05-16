package server

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/gofiber/websocket/v2"
	fiberSwagger "github.com/swaggo/fiber-swagger"
	"github.com/rs/zerolog"

	"github.com/newbulaos/nebulaos/backend/internal/auth"
	"github.com/newbulaos/nebulaos/backend/internal/docker"
	"github.com/newbulaos/nebulaos/backend/internal/monitoring"
	"github.com/newbulaos/nebulaos/backend/internal/system"
	"github.com/newbulaos/nebulaos/backend/internal/appstore"
	"github.com/newbulaos/nebulaos/backend/pkg/config"
	"github.com/newbulaos/nebulaos/backend/pkg/middleware"
)

func New(
	cfg *config.Config,
	log zerolog.Logger,
	authSvc *auth.Service,
	dockerSvc *docker.Service,
	systemSvc *system.Service,
	monitorSvc *monitoring.Service,
) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:               "NebulaOS v1.0",
		DisableStartupMessage: !cfg.IsDev(),
		ErrorHandler:          errorHandler,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(helmet.New(helmet.Config{
		XSSProtection:         "1; mode=block",
		ContentTypeNosniff:    "nosniff",
		XFrameOptions:         "DENY",
		ReferrerPolicy:        "strict-origin-when-cross-origin",
		CrossOriginEmbedderPolicy: "require-corp",
	}))
	app.Use(compress.New(compress.Config{Level: compress.LevelBestSpeed}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Authorization,X-Request-ID",
		AllowCredentials: true,
	}))
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 60,
	}))

	// Swagger (dev only)
	if cfg.IsDev() {
		app.Get("/swagger/*", fiberSwagger.WrapHandler)
	}

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "version": "1.0.0"})
	})

	// API v1
	v1 := app.Group("/api/v1")

	// Public routes
	authHandler := auth.NewHandler(authSvc)
	v1.Post("/auth/login", limiter.New(limiter.Config{Max: 10, Expiration: 60}), authHandler.Login)
	v1.Post("/auth/refresh", authHandler.Refresh)
	v1.Post("/auth/logout", authHandler.Logout)

	// Protected routes
	protected := v1.Group("", middleware.JWT(cfg.JWTSecret), middleware.AuditLog())

	// Auth
	protected.Get("/auth/me", authHandler.Me)
	protected.Post("/auth/totp/setup", authHandler.SetupTOTP)
	protected.Post("/auth/totp/verify", authHandler.VerifyTOTP)
	protected.Put("/auth/password", authHandler.ChangePassword)

	// Users (admin only)
	users := protected.Group("/users", middleware.RequireRole("admin"))
	userHandler := auth.NewUserHandler(authSvc)
	users.Get("/", userHandler.List)
	users.Post("/", userHandler.Create)
	users.Put("/:id", userHandler.Update)
	users.Delete("/:id", userHandler.Delete)

	// System
	sysHandler := system.NewHandler(systemSvc)
	protected.Get("/system/info", sysHandler.Info)
	protected.Get("/system/metrics", sysHandler.Metrics)
	protected.Post("/system/reboot", middleware.RequireRole("admin"), sysHandler.Reboot)
	protected.Post("/system/update", middleware.RequireRole("admin"), sysHandler.Update)

	// Docker
	dockerHandler := docker.NewHandler(dockerSvc)
	protected.Get("/docker/containers", dockerHandler.ListContainers)
	protected.Get("/docker/containers/:id", dockerHandler.GetContainer)
	protected.Post("/docker/containers/:id/start", dockerHandler.StartContainer)
	protected.Post("/docker/containers/:id/stop", dockerHandler.StopContainer)
	protected.Post("/docker/containers/:id/restart", dockerHandler.RestartContainer)
	protected.Delete("/docker/containers/:id", middleware.RequireRole("admin", "operator"), dockerHandler.RemoveContainer)
	protected.Get("/docker/containers/:id/logs", dockerHandler.ContainerLogs)
	protected.Get("/docker/containers/:id/stats", dockerHandler.ContainerStats)
	protected.Get("/docker/images", dockerHandler.ListImages)
	protected.Post("/docker/images/pull", dockerHandler.PullImage)
	protected.Delete("/docker/images/:id", middleware.RequireRole("admin"), dockerHandler.RemoveImage)
	protected.Get("/docker/volumes", dockerHandler.ListVolumes)
	protected.Get("/docker/networks", dockerHandler.ListNetworks)
	protected.Post("/docker/compose/deploy", middleware.RequireRole("admin", "operator"), dockerHandler.DeployCompose)

	// WebSocket - realtime
	protected.Get("/ws/metrics", websocket.New(monitorSvc.MetricsWS))
	protected.Get("/ws/containers/:id/logs", websocket.New(dockerSvc.LogsWS))
	protected.Get("/ws/containers/:id/exec", websocket.New(dockerSvc.ExecWS))

	// Monitoring
	monitorHandler := monitoring.NewHandler(monitorSvc)
	protected.Get("/monitoring/metrics", monitorHandler.GetMetrics)
	protected.Get("/monitoring/history", monitorHandler.GetHistory)
	protected.Get("/monitoring/alerts", monitorHandler.GetAlerts)
	protected.Post("/monitoring/alerts", middleware.RequireRole("admin"), monitorHandler.CreateAlert)

	// App Store
	appHandler := appstore.NewHandler()
	protected.Get("/stores", appHandler.ListStores)
	protected.Post("/stores", middleware.RequireRole("admin"), appHandler.AddStore)
	protected.Get("/apps", appHandler.GetApps)

	return app
}

func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	msg := "internal server error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		msg = e.Message
	}

	return c.Status(code).JSON(fiber.Map{
		"error":      msg,
		"request_id": c.Locals("requestid"),
	})
}
