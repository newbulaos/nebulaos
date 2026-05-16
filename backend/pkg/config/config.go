package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Env        string `mapstructure:"ENV"`
	LogLevel   string `mapstructure:"LOG_LEVEL"`
	ServerHost string `mapstructure:"SERVER_HOST"`
	ServerPort int    `mapstructure:"SERVER_PORT"`

	// Database
	DBDriver   string `mapstructure:"DB_DRIVER"` // sqlite | postgres
	DBPath     string `mapstructure:"DB_PATH"`
	DBHost     string `mapstructure:"DB_HOST"`
	DBPort     int    `mapstructure:"DB_PORT"`
	DBName     string `mapstructure:"DB_NAME"`
	DBUser     string `mapstructure:"DB_USER"`
	DBPassword string `mapstructure:"DB_PASSWORD"`

	// Auth
	JWTSecret          string `mapstructure:"JWT_SECRET"`
	JWTExpiry          int    `mapstructure:"JWT_EXPIRY_HOURS"`
	JWTRefreshExpiry   int    `mapstructure:"JWT_REFRESH_EXPIRY_DAYS"`

	// Redis
	RedisURL string `mapstructure:"REDIS_URL"`

	// Agent
	AgentGRPCAddr string `mapstructure:"AGENT_GRPC_ADDR"`

	// Features
	EnableAI       bool   `mapstructure:"ENABLE_AI"`
	AIProvider     string `mapstructure:"AI_PROVIDER"`
	AIAPIKey       string `mapstructure:"AI_API_KEY"`
}

func Load() *Config {
	v := viper.New()
	v.SetConfigFile(".env")
	v.AutomaticEnv()

	// Defaults
	v.SetDefault("ENV", "production")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SERVER_HOST", "0.0.0.0")
	v.SetDefault("SERVER_PORT", 8080)
	v.SetDefault("DB_DRIVER", "sqlite")
	v.SetDefault("DB_PATH", "/data/nebulaos.db")
	v.SetDefault("JWT_EXPIRY_HOURS", 24)
	v.SetDefault("JWT_REFRESH_EXPIRY_DAYS", 30)

	_ = v.ReadInConfig()

	cfg := &Config{}
	if err := v.Unmarshal(cfg); err != nil {
		panic(fmt.Sprintf("failed to unmarshal config: %v", err))
	}
	return cfg
}

func (c *Config) IsDev() bool {
	return strings.ToLower(c.Env) == "development"
}

func (c *Config) ServerAddr() string {
	return fmt.Sprintf("%s:%d", c.ServerHost, c.ServerPort)
}

func (c *Config) PostgresDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName)
}
