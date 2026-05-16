package database

import (
	"github.com/newbulaos/nebulaos/backend/pkg/config"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	var db *gorm.DB
	var err error

	switch cfg.DBDriver {
	case "postgres":
		db, err = gorm.Open(postgres.Open(cfg.PostgresDSN()), gormCfg)
	default:
		db, err = gorm.Open(sqlite.Open(cfg.DBPath), gormCfg)
	}
	if err != nil {
		return nil, err
	}

	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	return db, nil
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&User{},
		&Session{},
		&AuditLog{},
		&AppTemplate{},
		&InstalledApp{},
		&Notification{},
		&ProxyRule{},
		&BackupJob{},
	)
}
