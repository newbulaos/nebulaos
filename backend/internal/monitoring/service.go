package monitoring

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/nebulaos/nebulaos/backend/pkg/config"
)

type SystemMetrics struct {
	Timestamp   time.Time    `json:"timestamp"`
	CPU         CPUMetrics   `json:"cpu"`
	Memory      MemMetrics   `json:"memory"`
	Disk        []DiskMetric `json:"disk"`
	Network     NetMetrics   `json:"network"`
	Temperature []TempSensor `json:"temperature,omitempty"`
	Uptime      int64        `json:"uptime"`
}

type CPUMetrics struct {
	UsagePercent float64   `json:"usage_percent"`
	CoreCount    int       `json:"core_count"`
	PerCore      []float64 `json:"per_core"`
	LoadAvg1     float64   `json:"load_avg_1"`
	LoadAvg5     float64   `json:"load_avg_5"`
	LoadAvg15    float64   `json:"load_avg_15"`
}

type MemMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	Cached      uint64  `json:"cached"`
	UsedPercent float64 `json:"used_percent"`
	SwapTotal   uint64  `json:"swap_total"`
	SwapUsed    uint64  `json:"swap_used"`
}

type DiskMetric struct {
	Device      string  `json:"device"`
	Mountpoint  string  `json:"mountpoint"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
	ReadBytes   uint64  `json:"read_bytes"`
	WriteBytes  uint64  `json:"write_bytes"`
}

type NetMetrics struct {
	BytesSent   uint64 `json:"bytes_sent"`
	BytesRecv   uint64 `json:"bytes_recv"`
	PacketsSent uint64 `json:"packets_sent"`
	PacketsRecv uint64 `json:"packets_recv"`
}

type TempSensor struct {
	Name        string  `json:"name"`
	Temperature float64 `json:"temperature"`
	High        float64 `json:"high"`
	Critical    float64 `json:"critical"`
}

type Service struct {
	cfg         *config.Config
	subscribers sync.Map // map[string]chan SystemMetrics
	latest      *SystemMetrics
	mu          sync.RWMutex
}

func NewService(cfg *config.Config) *Service {
	svc := &Service{cfg: cfg}
	go svc.collectLoop()
	return svc
}

func (s *Service) collectLoop() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		metrics := s.collect()
		s.mu.Lock()
		s.latest = metrics
		s.mu.Unlock()

		// Broadcast to all WebSocket subscribers
		s.subscribers.Range(func(key, val any) bool {
			ch, ok := val.(chan *SystemMetrics)
			if ok {
				select {
				case ch <- metrics:
				default: // drop if slow consumer
				}
			}
			return true
		})
	}
}

func (s *Service) collect() *SystemMetrics {
	// In production, this reads from the agent via gRPC
	// For now, reads directly from /proc
	return &SystemMetrics{
		Timestamp: time.Now(),
		CPU:       s.collectCPU(),
		Memory:    s.collectMemory(),
		Disk:      s.collectDisk(),
		Network:   s.collectNetwork(),
	}
}

func (s *Service) GetLatest(_ context.Context) *SystemMetrics {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.latest
}

// MetricsWS - WebSocket handler for realtime metrics
func (s *Service) MetricsWS(c *websocket.Conn) {
	ch := make(chan *SystemMetrics, 10)
	id := c.RemoteAddr().String()
	s.subscribers.Store(id, ch)
	defer func() {
		s.subscribers.Delete(id)
		close(ch)
	}()

	// Send current metrics immediately
	s.mu.RLock()
	if s.latest != nil {
		data, _ := json.Marshal(s.latest)
		_ = c.WriteMessage(websocket.TextMessage, data)
	}
	s.mu.RUnlock()

	for metrics := range ch {
		data, err := json.Marshal(metrics)
		if err != nil {
			continue
		}
		if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
			break
		}
	}
}

// Stub collectors - real implementation reads /proc or calls agent gRPC
func (s *Service) collectCPU() CPUMetrics    { return CPUMetrics{} }
func (s *Service) collectMemory() MemMetrics { return MemMetrics{} }
func (s *Service) collectDisk() []DiskMetric { return nil }
func (s *Service) collectNetwork() NetMetrics { return NetMetrics{} }
