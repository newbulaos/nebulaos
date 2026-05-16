package auth

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nebulaos/nebulaos/backend/pkg/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Login godoc
// @Summary Login
// @Tags auth
// @Accept json
// @Produce json
// @Param body body LoginRequest true "Login credentials"
// @Success 200 {object} TokenPair
// @Failure 401 {object} fiber.Map
// @Router /auth/login [post]
func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	tokens, err := h.svc.Login(req, c.IP(), c.Get("User-Agent"))
	if err != nil {
		switch err {
		case ErrTOTPRequired:
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":         "totp_required",
				"totp_required": true,
			})
		case ErrInvalidCredentials, ErrUserInactive:
			return fiber.NewError(fiber.StatusUnauthorized, err.Error())
		default:
			return fiber.NewError(fiber.StatusInternalServerError, "login failed")
		}
	}

	return c.JSON(tokens)
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&body); err != nil || body.RefreshToken == "" {
		return fiber.NewError(fiber.StatusBadRequest, "refresh_token required")
	}

	tokens, err := h.svc.RefreshToken(body.RefreshToken, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, err.Error())
	}
	return c.JSON(tokens)
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = c.BodyParser(&body)
	_ = h.svc.Logout(body.RefreshToken)
	return c.JSON(fiber.Map{"message": "logged out"})
}

func (h *Handler) Me(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	user, err := h.svc.GetUser(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}
	return c.JSON(user)
}

func (h *Handler) SetupTOTP(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	secret, url, err := h.svc.SetupTOTP(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to setup TOTP")
	}
	return c.JSON(fiber.Map{"secret": secret, "url": url})
}

func (h *Handler) VerifyTOTP(c *fiber.Ctx) error {
	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "code required")
	}

	userID := middleware.GetUserID(c)
	if err := h.svc.EnableTOTP(userID, body.Code); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"message": "2FA enabled"})
}

func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	var body struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}

	userID := middleware.GetUserID(c)
	if err := h.svc.ChangePassword(userID, body.OldPassword, body.NewPassword); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"message": "password changed"})
}

// UserHandler for admin user management
type UserHandler struct {
	svc *Service
}

func NewUserHandler(svc *Service) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) List(c *fiber.Ctx) error {
	users, err := h.svc.ListUsers()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list users")
	}
	return c.JSON(users)
}

func (h *UserHandler) Create(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}

	user, err := h.svc.CreateUser(body.Username, body.Email, body.Password, body.Role)
	if err != nil {
		return fiber.NewError(fiber.StatusConflict, "user already exists")
	}
	return c.Status(fiber.StatusCreated).JSON(user)
}

func (h *UserHandler) Update(c *fiber.Ctx) error {
	// TODO: implement update
	return c.JSON(fiber.Map{"message": "updated"})
}

func (h *UserHandler) Delete(c *fiber.Ctx) error {
	// TODO: implement delete
	return c.JSON(fiber.Map{"message": "deleted"})
}
