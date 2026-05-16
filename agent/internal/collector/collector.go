package collector

import (
	"context"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"
	"github.com/shirou/gopsutil/v4/sensors"
)

type Snapshot struct {
	Timestamp   time.Time
	CPU         CPUInfo
	Memory      MemInfo
	Disks       []DiskInfo
	Network     NetInfo
	Temperature []TempInfo
	Uptime      uint64
}

type CPUInfo struct {
	UsagePercent float64
	PerCore      []float64
	LoadAvg1     float64
	LoadAvg5     float64
	LoadAvg15    float64
	CoreCount    int
}

type MemInfo struct {
	Total       uint64
	Used        uint64
	Free        uint64
	Cached      uint64
	UsedPercent float64
	SwapTotal   uint64
	SwapUsed    uint64
}

type DiskInfo struct {
	Device      string
	Mountpoint  string
	Total       uint64
	Used        uint64
	Free        uint64
	UsedPercent float64
	ReadBytes   uint64
	WriteBytes  uint64
}

type NetInfo struct {
	BytesSent   uint64
	BytesRecv   uint64
	PacketsSent uint64
	PacketsRecv uint64
}

type TempInfo struct {
	Name        string
	Temperature float64
	High        float64
	Critical    float64
}

type Collector struct {
	mu       sync.RWMutex
	snapshot *Snapshot
}

func New() *Collector {
	return &Collector{}
}

func (c *Collector) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				snap := c.collect()
				c.mu.Lock()
				c.snapshot = snap
				c.mu.Unlock()
			}
		}
	}()
}

func (c *Collector) Latest() *Snapshot {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.snapshot
}

func (c *Collector) collect() *Snapshot {
	snap := &Snapshot{Timestamp: time.Now()}

	// CPU
	if pct, err := cpu.Percent(0, false); err == nil && len(pct) > 0 {
		snap.CPU.UsagePercent = pct[0]
	}
	if perCore, err := cpu.Percent(0, true); err == nil {
		snap.CPU.PerCore = perCore
		snap.CPU.CoreCount = len(perCore)
	}
	if avg, err := load.Avg(); err == nil {
		snap.CPU.LoadAvg1 = avg.Load1
		snap.CPU.LoadAvg5 = avg.Load5
		snap.CPU.LoadAvg15 = avg.Load15
	}

	// Memory
	if vm, err := mem.VirtualMemory(); err == nil {
		snap.Memory = MemInfo{
			Total: vm.Total, Used: vm.Used, Free: vm.Free,
			Cached: vm.Cached, UsedPercent: vm.UsedPercent,
		}
	}
	if sw, err := mem.SwapMemory(); err == nil {
		snap.Memory.SwapTotal = sw.Total
		snap.Memory.SwapUsed = sw.Used
	}

	// Disk
	if parts, err := disk.Partitions(false); err == nil {
		for _, p := range parts {
			if usage, err := disk.Usage(p.Mountpoint); err == nil {
				snap.Disks = append(snap.Disks, DiskInfo{
					Device: p.Device, Mountpoint: p.Mountpoint,
					Total: usage.Total, Used: usage.Used, Free: usage.Free,
					UsedPercent: usage.UsedPercent,
				})
			}
		}
	}

	// Network
	if stats, err := net.IOCounters(false); err == nil && len(stats) > 0 {
		snap.Network = NetInfo{
			BytesSent: stats[0].BytesSent, BytesRecv: stats[0].BytesRecv,
			PacketsSent: stats[0].PacketsSent, PacketsRecv: stats[0].PacketsRecv,
		}
	}

	// Temperature
	if temps, err := sensors.SensorsTemperatures(); err == nil {
		for _, t := range temps {
			snap.Temperature = append(snap.Temperature, TempInfo{
				Name: t.SensorKey, Temperature: t.Temperature,
				High: t.High, Critical: t.Critical,
			})
		}
	}

	// Uptime
	if info, err := host.Info(); err == nil {
		snap.Uptime = info.Uptime
	}

	return snap
}
