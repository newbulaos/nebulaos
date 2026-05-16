package database

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Base model with UUID
type Base struct {
	ID        string         `gorm:"primarykey;type:varchar(36)" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (b *Base) BeforeCreate(_ *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

// User - authentication & RBAC
type User struct {
	Base
	Username     string  `gorm:"uniqueIndex;not null" json:"username"`
	Email        string  `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string  `gorm:"not null" json:"-"`
	Role         string  `gorm:"default:viewer" json:"role"` // admin | operator | viewer
	TOTPSecret   string  `json:"-"`
	TOTPEnabled  bool    `gorm:"default:false" json:"totp_enabled"`
	LastLoginAt  *time.Time `json:"last_login_at"`
	IsActive     bool    `gorm:"default:true" json:"is_active"`
}

// Session - JWT refresh tokens
type Session struct {
	Base
	UserID       string    `gorm:"index;not null" json:"user_id"`
	RefreshToken string    `gorm:"uniqueIndex;not null" json:"-"`
	UserAgent    string    `json:"user_agent"`
	IPAddress    string    `json:"ip_address"`
	ExpiresAt    time.Time `json:"expires_at"`
	RevokedAt    *time.Time `json:"revoked_at"`
}

// AuditLog - security audit trail
type AuditLog struct {
	Base
	UserID    string `gorm:"index" json:"user_id"`
	Action    string `gorm:"not null" json:"action"`
	Resource  string `json:"resource"`
	Details   string `gorm:"type:text" json:"details"`
	IPAddress string `json:"ip_address"`
	Status    string `json:"status"` // success | failure
}

// AppTemplate - app store templates
type AppTemplate struct {
	Base
	Name        string `gorm:"uniqueIndex;not null" json:"name"`
	DisplayName string `json:"display_name"`
	Description string `gorm:"type:text" json:"description"`
	Icon        string `json:"icon"`
	Category    string `gorm:"index" json:"category"`
	ComposeYAML string `gorm:"type:text" json:"compose_yaml"`
	Version     string `json:"version"`
	Author      string `json:"author"`
	RepoURL     string `json:"repo_url"`
	Tags        string `json:"tags"` // comma-separated
	Downloads   int64  `gorm:"default:0" json:"downloads"`
}

// InstalledApp - deployed apps
type InstalledApp struct {
	Base
	TemplateID  string `gorm:"index" json:"template_id"`
	Name        string `gorm:"uniqueIndex;not null" json:"name"`
	Status      string `gorm:"default:running" json:"status"`
	ComposeYAML string `gorm:"type:text" json:"compose_yaml"`
	InstalledBy string `json:"installed_by"`
	Port        int    `json:"port"`
}

// Notification
type Notification struct {
	Base
	UserID  string `gorm:"index" json:"user_id"`
	Title   string `json:"title"`
	Message string `gorm:"type:text" json:"message"`
	Type    string `json:"type"` // info | warning | error | success
	Read    bool   `gorm:"default:false" json:"read"`
}

// ProxyRule - reverse proxy
type ProxyRule struct {
	Base
	Domain      string `gorm:"uniqueIndex;not null" json:"domain"`
	Target      string `gorm:"not null" json:"target"`
	SSLEnabled  bool   `gorm:"default:true" json:"ssl_enabled"`
	ForceHTTPS  bool   `gorm:"default:true" json:"force_https"`
	CreatedBy   string `json:"created_by"`
}

// BackupJob
type BackupJob struct {
	Base
	Name       string     `json:"name"`
	Schedule   string     `json:"schedule"` // cron expression
	Target     string     `json:"target"`   // path to backup
	Destination string    `json:"destination"`
	LastRunAt  *time.Time `json:"last_run_at"`
	Status     string     `json:"status"`
	Enabled    bool       `gorm:"default:true" json:"enabled"`
}
