package monitoring

import "github.com/gofiber/fiber/v2"

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetMetrics(c *fiber.Ctx) error {
	metrics := h.svc.GetLatest(c.Context())
	if metrics == nil {
		return c.JSON(fiber.Map{"message": "no metrics yet"})
	}
	return c.JSON(metrics)
}

func (h *Handler) GetHistory(c *fiber.Ctx) error {
	// TODO: query from time-series store
	return c.JSON(fiber.Map{"data": []any{}})
}

func (h *Handler) GetAlerts(c *fiber.Ctx) error {
	// TODO: query active alerts
	return c.JSON(fiber.Map{"alerts": []any{}})
}

func (h *Handler) CreateAlert(c *fiber.Ctx) error {
	// TODO: create alert rule
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "alert created"})
}
