package appstore

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"gopkg.in/yaml.v3"
)

// Known CasaOS-compatible app stores
var knownStores = []Store{
	{ID: "casaos-official", Name: "CasaOS Official", URL: "https://github.com/IceWhaleTech/CasaOS-AppStore/archive/refs/heads/main.zip"},
	{ID: "linuxserver", Name: "LinuxServer.io", URL: "https://casaos-appstore.paodayag.dev/linuxserver.zip"},
	{ID: "bigbear", Name: "Big Bear Community", URL: "https://github.com/bigbeartechworld/big-bear-casaos/archive/refs/heads/master.zip"},
	{ID: "coolstore", Name: "CasaOS Coolstore", URL: "https://casaos-appstore.paodayag.dev/coolstore.zip"},
	{ID: "home-automation", Name: "Home Automation", URL: "https://github.com/mr-manuel/CasaOS-HomeAutomation-AppStore/archive/refs/tags/latest.zip"},
}

type Store struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	URL  string `json:"url"`
}

type App struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Tagline     string   `json:"tagline"`
	Icon        string   `json:"icon"`
	Thumbnail   string   `json:"thumbnail"`
	Category    string   `json:"category"`
	Author      string   `json:"author"`
	Developer   string   `json:"developer"`
	PortMap     string   `json:"port_map"`
	StoreID     string   `json:"store_id"`
	Screenshots []string `json:"screenshots"`
}

// cache per store URL
var (
	cache   = map[string][]App{}
	cacheMu sync.RWMutex
	cacheAt = map[string]time.Time{}
	cacheTTL = 30 * time.Minute
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

func (h *Handler) ListStores(c *fiber.Ctx) error {
	return c.JSON(knownStores)
}

func (h *Handler) GetApps(c *fiber.Ctx) error {
	storeID := c.Query("store", "casaos-official")

	var store *Store
	for i := range knownStores {
		if knownStores[i].ID == storeID {
			store = &knownStores[i]
			break
		}
	}
	if store == nil {
		return fiber.NewError(fiber.StatusBadRequest, "unknown store id")
	}

	cacheMu.RLock()
	apps, ok := cache[storeID]
	at := cacheAt[storeID]
	cacheMu.RUnlock()

	if ok && time.Since(at) < cacheTTL {
		return c.JSON(fiber.Map{"store": store, "apps": apps, "cached": true})
	}

	apps, err := fetchAndParse(store.URL, storeID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadGateway, fmt.Sprintf("failed to fetch store: %v", err))
	}

	cacheMu.Lock()
	cache[storeID] = apps
	cacheAt[storeID] = time.Now()
	cacheMu.Unlock()

	return c.JSON(fiber.Map{"store": store, "apps": apps, "cached": false})
}

func (h *Handler) AddStore(c *fiber.Ctx) error {
	var body Store
	if err := c.BodyParser(&body); err != nil || body.URL == "" || body.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name and url required")
	}
	if body.ID == "" {
		body.ID = strings.ToLower(strings.ReplaceAll(body.Name, " ", "-"))
	}
	knownStores = append(knownStores, body)
	return c.Status(fiber.StatusCreated).JSON(body)
}

// fetchAndParse downloads a ZIP and extracts x-casaos metadata from docker-compose.yml files
func fetchAndParse(url, storeID string) ([]App, error) {
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(io.LimitReader(resp.Body, 200*1024*1024)) // 200MB max
	if err != nil {
		return nil, err
	}

	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, err
	}

	var apps []App
	seen := map[string]bool{}

	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		base := filepath.Base(f.Name)
		if base != "docker-compose.yml" && base != "docker-compose.yaml" {
			continue
		}

		rc, err := f.Open()
		if err != nil {
			continue
		}
		content, err := io.ReadAll(io.LimitReader(rc, 512*1024))
		rc.Close()
		if err != nil {
			continue
		}

		app := parseCompose(content, storeID)
		if app == nil || app.Name == "" {
			continue
		}
		if seen[app.ID] {
			continue
		}
		seen[app.ID] = true
		apps = append(apps, *app)
	}

	return apps, nil
}

// composeFile represents the top-level x-casaos block
type composeFile struct {
	XCasaOS *appMeta `yaml:"x-casaos"`
}

type appMeta struct {
	Author      string            `yaml:"author"`
	Category    string            `yaml:"category"`
	Description map[string]string `yaml:"description"`
	Developer   string            `yaml:"developer"`
	Icon        string            `yaml:"icon"`
	Thumbnail   string            `yaml:"thumbnail"`
	PortMap     string            `yaml:"port_map"`
	Screenshots []string          `yaml:"screenshot_link"`
	Tagline     map[string]string `yaml:"tagline"`
	Title       map[string]string `yaml:"title"`
}

func parseCompose(data []byte, storeID string) *App {
	var cf composeFile
	if err := yaml.Unmarshal(data, &cf); err != nil || cf.XCasaOS == nil {
		return nil
	}
	m := cf.XCasaOS

	name := firstOf(m.Title, "en_us", "en")
	if name == "" {
		return nil
	}

	id := strings.ToLower(strings.ReplaceAll(name, " ", "-"))
	id = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, id)

	return &App{
		ID:          storeID + "/" + id,
		Name:        name,
		Description: firstOf(m.Description, "en_us", "en"),
		Tagline:     firstOf(m.Tagline, "en_us", "en"),
		Icon:        m.Icon,
		Thumbnail:   m.Thumbnail,
		Category:    m.Category,
		Author:      m.Author,
		Developer:   m.Developer,
		PortMap:     m.PortMap,
		StoreID:     storeID,
		Screenshots: m.Screenshots,
	}
}

func firstOf(m map[string]string, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != "" {
			return strings.TrimSpace(v)
		}
	}
	// fallback: first value
	for _, v := range m {
		if v != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}
