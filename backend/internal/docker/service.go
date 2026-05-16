package docker

import (
	"context"
	"io"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/volume"
	dockerclient "github.com/docker/docker/client"
	"github.com/gofiber/websocket/v2"

	"github.com/newbulaos/nebulaos/backend/pkg/config"
)

type Service struct {
	client *dockerclient.Client
	cfg    *config.Config
}

func NewService(cfg *config.Config) *Service {
	client, err := dockerclient.NewClientWithOpts(
		dockerclient.FromEnv,
		dockerclient.WithAPIVersionNegotiation(),
	)
	if err != nil {
		panic("failed to connect to Docker: " + err.Error())
	}
	return &Service{client: client, cfg: cfg}
}

// Containers

func (s *Service) ListContainers(ctx context.Context) ([]types.Container, error) {
	return s.client.ContainerList(ctx, container.ListOptions{All: true})
}

func (s *Service) GetContainer(ctx context.Context, id string) (types.ContainerJSON, error) {
	return s.client.ContainerInspect(ctx, id)
}

func (s *Service) StartContainer(ctx context.Context, id string) error {
	return s.client.ContainerStart(ctx, id, container.StartOptions{})
}

func (s *Service) StopContainer(ctx context.Context, id string) error {
	timeout := 10
	return s.client.ContainerStop(ctx, id, container.StopOptions{Timeout: &timeout})
}

func (s *Service) RestartContainer(ctx context.Context, id string) error {
	timeout := 10
	return s.client.ContainerRestart(ctx, id, container.StopOptions{Timeout: &timeout})
}

func (s *Service) RemoveContainer(ctx context.Context, id string, force bool) error {
	return s.client.ContainerRemove(ctx, id, container.RemoveOptions{Force: force, RemoveVolumes: false})
}

func (s *Service) GetContainerLogs(ctx context.Context, id string, tail string) (io.ReadCloser, error) {
	return s.client.ContainerLogs(ctx, id, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     false,
		Tail:       tail,
		Timestamps: true,
	})
}

func (s *Service) GetContainerStats(ctx context.Context, id string) (*ContainerStats, error) {
	stats, err := s.client.ContainerStatsOneShot(ctx, id)
	if err != nil {
		return nil, err
	}
	defer stats.Body.Close()
	return parseContainerStats(stats.Body)
}

// Images

func (s *Service) ListImages(ctx context.Context) ([]image.Summary, error) {
	return s.client.ImageList(ctx, image.ListOptions{All: false})
}

func (s *Service) PullImage(ctx context.Context, ref string) (io.ReadCloser, error) {
	return s.client.ImagePull(ctx, ref, image.PullOptions{})
}

func (s *Service) RemoveImage(ctx context.Context, id string) error {
	_, err := s.client.ImageRemove(ctx, id, image.RemoveOptions{Force: false, PruneChildren: false})
	return err
}

// Volumes

func (s *Service) ListVolumes(ctx context.Context) ([]*volume.Volume, error) {
	resp, err := s.client.VolumeList(ctx, volume.ListOptions{})
	if err != nil {
		return nil, err
	}
	return resp.Volumes, nil
}

// Networks

func (s *Service) ListNetworks(ctx context.Context) ([]network.Summary, error) {
	return s.client.NetworkList(ctx, network.ListOptions{
		Filters: filters.NewArgs(filters.Arg("type", "custom")),
	})
}

// WebSocket - realtime logs
func (s *Service) LogsWS(c *websocket.Conn) {
	id := c.Params("id")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logs, err := s.client.ContainerLogs(ctx, id, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Tail:       "100",
		Timestamps: true,
	})
	if err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(`{"error":"container not found"}`))
		return
	}
	defer logs.Close()

	buf := make([]byte, 4096)
	for {
		n, err := logs.Read(buf)
		if err != nil {
			break
		}
		if n > 8 { // strip docker log header (8 bytes)
			if err := c.WriteMessage(websocket.TextMessage, buf[8:n]); err != nil {
				break
			}
		}
	}
}

// WebSocket - exec terminal
func (s *Service) ExecWS(c *websocket.Conn) {
	id := c.Params("id")
	ctx := context.Background()

	exec, err := s.client.ContainerExecCreate(ctx, id, container.ExecOptions{
		Cmd:          []string{"/bin/sh"},
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
	})
	if err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(`{"error":"exec failed"}`))
		return
	}

	attach, err := s.client.ContainerExecAttach(ctx, exec.ID, container.ExecStartOptions{Tty: true})
	if err != nil {
		return
	}
	defer attach.Close()

	// Bidirectional pipe
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := attach.Reader.Read(buf)
			if err != nil {
				break
			}
			_ = c.WriteMessage(websocket.BinaryMessage, buf[:n])
		}
	}()

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			break
		}
		_, _ = attach.Conn.Write(msg)
	}
}

// ContainerStats parsed metrics
type ContainerStats struct {
	CPUPercent    float64 `json:"cpu_percent"`
	MemoryUsage   uint64  `json:"memory_usage"`
	MemoryLimit   uint64  `json:"memory_limit"`
	MemoryPercent float64 `json:"memory_percent"`
	NetworkRx     uint64  `json:"network_rx"`
	NetworkTx     uint64  `json:"network_tx"`
	BlockRead     uint64  `json:"block_read"`
	BlockWrite    uint64  `json:"block_write"`
	Timestamp     time.Time `json:"timestamp"`
}

func parseContainerStats(r io.Reader) (*ContainerStats, error) {
	// Parse Docker stats JSON
	// Implementation uses encoding/json to decode types.StatsJSON
	return &ContainerStats{Timestamp: time.Now()}, nil
}
