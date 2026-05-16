package main

import (
	"fmt"
	"os"

	"github.com/newbulaos/nebulaos/backend/pkg/config"
	"github.com/newbulaos/nebulaos/backend/pkg/database"
	"github.com/newbulaos/nebulaos/backend/internal/auth"
)

func main() {
	cfg := config.Load()
	db, err := database.Connect(cfg)
	if err != nil {
		fmt.Println("db error:", err)
		os.Exit(1)
	}
	database.Migrate(db)

	svc := auth.NewService(db, cfg)
	user, err := svc.CreateUser("admin", "admin@nebulaos.local", "nebula123!", "admin")
	if err != nil {
		fmt.Println("user exists or error:", err)
		return
	}
	fmt.Printf("Created user: %s (role: %s)\n", user.Username, user.Role)
}
