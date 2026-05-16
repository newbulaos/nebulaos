package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func JWT(secret string) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey:  jwtware.SigningKey{Key: []byte(secret)},
		ContextKey: "user",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		},
	})
}

func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Locals("user").(*jwt.Token)
		claims := token.Claims.(jwt.MapClaims)
		role, _ := claims["role"].(string)

		for _, r := range roles {
			if r == role || role == "admin" {
				return c.Next()
			}
		}
		return fiber.NewError(fiber.StatusForbidden, "insufficient permissions")
	}
}

func AuditLog() fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := c.Next()

		// Skip GET requests and health checks
		if c.Method() == "GET" || strings.HasPrefix(c.Path(), "/health") {
			return err
		}

		// Async audit log write
		go func() {
			// TODO: write to audit log table
			_ = c.Path()
			_ = c.Method()
		}()

		return err
	}
}

func GetUserID(c *fiber.Ctx) string {
	token, ok := c.Locals("user").(*jwt.Token)
	if !ok {
		return ""
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return ""
	}
	id, _ := claims["user_id"].(string)
	return id
}

func GetUserRole(c *fiber.Ctx) string {
	token, ok := c.Locals("user").(*jwt.Token)
	if !ok {
		return ""
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return ""
	}
	role, _ := claims["role"].(string)
	return role
}
