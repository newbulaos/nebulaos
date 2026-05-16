package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/newbulaos/nebulaos/backend/pkg/config"
	"github.com/newbulaos/nebulaos/backend/pkg/database"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserInactive       = errors.New("user account is inactive")
	ErrTOTPRequired       = errors.New("totp code required")
	ErrInvalidTOTP        = errors.New("invalid totp code")
)

type Service struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewService(db *gorm.DB, cfg *config.Config) *Service {
	return &Service{db: db, cfg: cfg}
}

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required,min=8"`
	TOTPCode string `json:"totp_code"`
}

type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

func (s *Service) Login(req LoginRequest, ip, ua string) (*TokenPair, error) {
	var user database.User
	if err := s.db.Where("username = ? OR email = ?", req.Username, req.Username).First(&user).Error; err != nil {
		return nil, ErrInvalidCredentials
	}

	if !user.IsActive {
		return nil, ErrUserInactive
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	if user.TOTPEnabled {
		if req.TOTPCode == "" {
			return nil, ErrTOTPRequired
		}
		if !totp.Validate(req.TOTPCode, user.TOTPSecret) {
			return nil, ErrInvalidTOTP
		}
	}

	now := time.Now()
	s.db.Model(&user).Update("last_login_at", now)

	return s.generateTokenPair(&user, ip, ua)
}

func (s *Service) generateTokenPair(user *database.User, ip, ua string) (*TokenPair, error) {
	expiresAt := time.Now().Add(time.Duration(s.cfg.JWTExpiry) * time.Hour)

	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      expiresAt.Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	// Refresh token
	refreshToken := uuid.New().String()
	session := database.Session{
		UserID:       user.ID,
		RefreshToken: refreshToken,
		UserAgent:    ua,
		IPAddress:    ip,
		ExpiresAt:    time.Now().AddDate(0, 0, s.cfg.JWTRefreshExpiry),
	}
	s.db.Create(&session)

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
	}, nil
}

func (s *Service) RefreshToken(refreshToken, ip, ua string) (*TokenPair, error) {
	var session database.Session
	if err := s.db.Where("refresh_token = ? AND revoked_at IS NULL AND expires_at > ?",
		refreshToken, time.Now()).First(&session).Error; err != nil {
		return nil, errors.New("invalid or expired refresh token")
	}

	var user database.User
	if err := s.db.First(&user, "id = ?", session.UserID).Error; err != nil {
		return nil, ErrUserNotFound
	}

	// Rotate refresh token
	now := time.Now()
	s.db.Model(&session).Update("revoked_at", now)

	return s.generateTokenPair(&user, ip, ua)
}

func (s *Service) Logout(refreshToken string) error {
	now := time.Now()
	return s.db.Model(&database.Session{}).
		Where("refresh_token = ?", refreshToken).
		Update("revoked_at", now).Error
}

func (s *Service) SetupTOTP(userID string) (string, string, error) {
	var user database.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return "", "", ErrUserNotFound
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "NebulaOS",
		AccountName: user.Email,
	})
	if err != nil {
		return "", "", err
	}

	s.db.Model(&user).Update("totp_secret", key.Secret())
	return key.Secret(), key.URL(), nil
}

func (s *Service) EnableTOTP(userID, code string) error {
	var user database.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return ErrUserNotFound
	}

	if !totp.Validate(code, user.TOTPSecret) {
		return ErrInvalidTOTP
	}

	return s.db.Model(&user).Update("totp_enabled", true).Error
}

func (s *Service) CreateUser(username, email, password, role string) (*database.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &database.User{
		Username:     username,
		Email:        email,
		PasswordHash: string(hash),
		Role:         role,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (s *Service) GetUser(userID string) (*database.User, error) {
	var user database.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, ErrUserNotFound
	}
	return &user, nil
}

func (s *Service) ListUsers() ([]database.User, error) {
	var users []database.User
	err := s.db.Find(&users).Error
	return users, err
}

func (s *Service) ChangePassword(userID, oldPassword, newPassword string) error {
	var user database.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return ErrUserNotFound
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return ErrInvalidCredentials
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.db.Model(&user).Update("password_hash", string(hash)).Error
}
