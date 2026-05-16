package docker

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) ListContainers(c *fiber.Ctx) error {
	containers, err := h.svc.ListContainers(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(containers)
}

func (h *Handler) GetContainer(c *fiber.Ctx) error {
	info, err := h.svc.GetContainer(c.Context(), c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "container not found")
	}
	return c.JSON(info)
}

func (h *Handler) StartContainer(c *fiber.Ctx) error {
	if err := h.svc.StartContainer(c.Context(), c.Params("id")); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(fiber.Map{"message": "started"})
}

func (h *Handler) StopContainer(c *fiber.Ctx) error {
	if err := h.svc.StopContainer(c.Context(), c.Params("id")); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(fiber.Map{"message": "stopped"})
}

func (h *Handler) RestartContainer(c *fiber.Ctx) error {
	if err := h.svc.RestartContainer(c.Context(), c.Params("id")); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(fiber.Map{"message": "restarted"})
}

func (h *Handler) RemoveContainer(c *fiber.Ctx) error {
	force := c.QueryBool("force", false)
	if err := h.svc.RemoveContainer(c.Context(), c.Params("id"), force); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(fiber.Map{"message": "removed"})
}

func (h *Handler) ContainerLogs(c *fiber.Ctx) error {
	tail := c.Query("tail", "100")
	logs, err := h.svc.GetContainerLogs(c.Context(), c.Params("id"), tail)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "container not found")
	}
	defer logs.Close()

	c.Set("Content-Type", "text/plain")
	return c.SendStream(logs)
}

func (h *Handler) ContainerStats(c *fiber.Ctx) error {
	stats, err := h.svc.GetContainerStats(c.Context(), c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(stats)
}

func (h *Handler) ListImages(c *fiber.Ctx) error {
	images, err := h.svc.ListImages(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(images)
}

func (h *Handler) PullImage(c *fiber.Ctx) error {
	var body struct {
		Image string `json:"image"`
	}
	if err := c.BodyParser(&body); err != nil || body.Image == "" {
		return fiber.NewError(fiber.StatusBadRequest, "image required")
	}

	reader, err := h.svc.PullImage(c.Context(), body.Image)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	defer reader.Close()

	c.Set("Content-Type", "application/x-ndjson")
	return c.SendStream(reader)
}

func (h *Handler) RemoveImage(c *fiber.Ctx) error {
	if err := h.svc.RemoveImage(c.Context(), c.Params("id")); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(fiber.Map{"message": "removed"})
}

func (h *Handler) ListVolumes(c *fiber.Ctx) error {
	vols, err := h.svc.ListVolumes(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(vols)
}

func (h *Handler) ListNetworks(c *fiber.Ctx) error {
	nets, err := h.svc.ListNetworks(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(nets)
}

func (h *Handler) DeployCompose(c *fiber.Ctx) error {
	var body struct {
		Name    string `json:"name"`
		Compose string `json:"compose"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	// TODO: implement compose deployment via docker compose SDK
	return c.JSON(fiber.Map{"message": "deploying", "name": body.Name})
}

// WebSocket upgrade handlers
func (h *Handler) LogsWSUpgrade(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
}

func (h *Handler) ExecWSUpgrade(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
}
