package system

import (
	"os/exec"
	"runtime"

	"github.com/gofiber/fiber/v2"
	"github.com/nebulaos/nebulaos/backend/pkg/config"
	"github.com/nebulaos/nebulaos/backend/pkg/middleware"
)

type Service struct {
	cfg *config.Config
}

func NewService(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

type SystemInfo struct {
	Hostname    string `json:"hostname"`
	OS          string `json:"os"`
	Arch        string `json:"arch"`
	KernelVer   string `json:"kernel_version"`
	GoVersion   string `json:"go_version"`
	AppVersion  string `json:"app_version"`
}

func (s *Service) GetInfo() SystemInfo {
	hostname, _ := exec.Command("hostname").Output()
	kernel, _ := exec.Command("uname", "-r").Output()
	return SystemInfo{
		Hostname:   string(hostname),
		OS:         runtime.GOOS,
		Arch:       runtime.GOARCH,
		KernelVer:  string(kernel),
		GoVersion:  runtime.Version(),
		AppVersion: "1.0.0",
	}
}

// Handler
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Info(c *fiber.Ctx) error {
	return c.JSON(h.svc.GetInfo())
}

func (h *Handler) Metrics(c *fiber.Ctx) error {
	// Returns basic system metrics (delegates to monitoring service in production)
	return c.JSON(fiber.Map{"message": "use /monitoring/metrics"})
}

func (h *Handler) Reboot(c *fiber.Ctx) error {
	_ = middleware.GetUserID(c) // audit who triggered
	go func() {
		_, _ = exec.Command("systemctl", "reboot").Output()
	}()
	return c.JSON(fiber.Map{"message": "rebooting"})
}

func (h *Handler) Update(c *fiber.Ctx) error {
	go func() {
		_, _ = exec.Command("apt", "update").Output()
		_, _ = exec.Command("apt", "upgrade", "-y").Output()
	}()
	return c.JSON(fiber.Map{"message": "update started"})
}
