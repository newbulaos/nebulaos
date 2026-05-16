"use client";

import { motion } from "framer-motion";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ResourceChart } from "@/components/dashboard/resource-chart";
import { ContainerList } from "@/components/docker/container-list";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Cpu, MemoryStick, HardDrive, Network, Container, Thermometer } from "lucide-react";

interface SystemMetrics {
  cpu: { usage_percent: number; load_avg_1: number; core_count: number };
  memory: { used: number; total: number; used_percent: number };
  disk: Array<{ mountpoint: string; used_percent: number; used: number; total: number }>;
  network: { bytes_sent: number; bytes_recv: number };
  temperature: Array<{ name: string; temperature: number }>;
}

export default function DashboardPage() {
  const { data: metrics, connected } = useWebSocket<SystemMetrics>("/ws/metrics");
  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.get("/docker/containers").then((r) => Array.isArray(r.data) ? r.data : r.data.containers ?? []),
    refetchInterval: 10000,
  });

  const rootDisk = metrics?.disk?.find((d) => d.mountpoint === "/");
  const maxTemp = metrics?.temperature?.reduce((max, t) => Math.max(max, t.temperature), 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-muted-foreground text-sm">System overview</p>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${connected ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          {connected ? "Live" : "Reconnecting..."}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU"
          value={`${metrics?.cpu.usage_percent.toFixed(1) ?? "—"}%`}
          subtitle={`${metrics?.cpu.core_count ?? "—"} cores · Load ${metrics?.cpu.load_avg_1.toFixed(2) ?? "—"}`}
          icon={<Cpu className="w-5 h-5" />}
          percent={metrics?.cpu.usage_percent}
          color="blue"
        />
        <MetricCard
          title="Memory"
          value={`${metrics?.memory.used_percent.toFixed(1) ?? "—"}%`}
          subtitle={`${formatBytes(metrics?.memory.used)} / ${formatBytes(metrics?.memory.total)}`}
          icon={<MemoryStick className="w-5 h-5" />}
          percent={metrics?.memory.used_percent}
          color="purple"
        />
        <MetricCard
          title="Disk"
          value={`${rootDisk?.used_percent.toFixed(1) ?? "—"}%`}
          subtitle={`${formatBytes(rootDisk?.used)} / ${formatBytes(rootDisk?.total)}`}
          icon={<HardDrive className="w-5 h-5" />}
          percent={rootDisk?.used_percent}
          color="amber"
        />
        <MetricCard
          title="Temperature"
          value={maxTemp > 0 ? `${maxTemp.toFixed(0)}°C` : "—"}
          subtitle={maxTemp > 80 ? "⚠️ High" : "Normal"}
          icon={<Thermometer className="w-5 h-5" />}
          percent={(maxTemp / 100) * 100}
          color={maxTemp > 80 ? "red" : "green"}
        />
      </div>

      {/* Charts + Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ResourceChart />
        </div>
        <div>
          <ContainerList containers={containers?.slice(0, 6) ?? []} compact />
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
