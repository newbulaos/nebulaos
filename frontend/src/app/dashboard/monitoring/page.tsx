"use client";

import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { Cpu, MemoryStick, HardDrive, Network, Thermometer } from "lucide-react";

interface SystemMetrics {
  cpu: { usage_percent: number; load_avg_1: number; load_avg_5: number; load_avg_15: number; core_count: number; per_core: number[] };
  memory: { used: number; total: number; used_percent: number; cached: number; swap_used: number; swap_total: number };
  disk: Array<{ mountpoint: string; used_percent: number; used: number; total: number; device: string }>;
  network: { bytes_sent: number; bytes_recv: number; packets_sent: number; packets_recv: number };
  temperature: Array<{ name: string; temperature: number }>;
  uptime: number;
}

interface Point { time: string; cpu: number; memory: number; net_in: number; net_out: number }

function fmt(bytes?: number) {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(" ");
}

const tooltipStyle = { contentStyle: { background: "#1a1836", border: "1px solid #2d2b55", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "#9ca3af" } };

export default function MonitoringPage() {
  const { data: metrics, connected } = useWebSocket<SystemMetrics>("/ws/metrics");
  const [history, setHistory] = useState<Point[]>([]);
  const [prevNet, setPrevNet] = useState<{ sent: number; recv: number } | null>(null);

  useEffect(() => {
    if (!metrics) return;
    const net = metrics.network;
    const net_in = prevNet ? Math.max(0, net.bytes_recv - prevNet.recv) / 2 : 0;
    const net_out = prevNet ? Math.max(0, net.bytes_sent - prevNet.sent) / 2 : 0;
    setPrevNet({ sent: net.bytes_sent, recv: net.bytes_recv });
    setHistory((prev) => [...prev, {
      time: new Date().toLocaleTimeString("en", { hour12: false }),
      cpu: +metrics.cpu.usage_percent.toFixed(1),
      memory: +metrics.memory.used_percent.toFixed(1),
      net_in: +(net_in / 1024).toFixed(1),
      net_out: +(net_out / 1024).toFixed(1),
    }].slice(-60));
  }, [metrics]); // eslint-disable-line react-hooks/exhaustive-deps

  const rootDisk = metrics?.disk?.find((d) => d.mountpoint === "/");
  const maxTemp = metrics?.temperature?.reduce((m, t) => Math.max(m, t.temperature), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring</h1>
          <p className="text-muted-foreground text-sm">
            {metrics?.uptime ? `Uptime: ${fmtUptime(metrics.uptime)}` : "Realtime system metrics"}
          </p>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${connected ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          {connected ? "Live" : "Reconnecting..."}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="CPU" value={`${metrics?.cpu.usage_percent.toFixed(1) ?? "—"}%`}
          subtitle={`Load: ${metrics?.cpu.load_avg_1.toFixed(2) ?? "—"} · ${metrics?.cpu.core_count ?? "—"} cores`}
          icon={<Cpu className="w-5 h-5" />} percent={metrics?.cpu.usage_percent} color="blue" />
        <MetricCard title="Memory" value={`${metrics?.memory.used_percent.toFixed(1) ?? "—"}%`}
          subtitle={`${fmt(metrics?.memory.used)} / ${fmt(metrics?.memory.total)}`}
          icon={<MemoryStick className="w-5 h-5" />} percent={metrics?.memory.used_percent} color="purple" />
        <MetricCard title="Disk (/)" value={`${rootDisk?.used_percent.toFixed(1) ?? "—"}%`}
          subtitle={`${fmt(rootDisk?.used)} / ${fmt(rootDisk?.total)}`}
          icon={<HardDrive className="w-5 h-5" />} percent={rootDisk?.used_percent} color="amber" />
        <MetricCard title="Temperature" value={maxTemp > 0 ? `${maxTemp.toFixed(0)}°C` : "—"}
          subtitle={maxTemp > 80 ? "⚠️ High" : "Normal"}
          icon={<Thermometer className="w-5 h-5" />} percent={(maxTemp / 100) * 100} color={maxTemp > 80 ? "red" : "green"} />
      </div>

      {/* CPU + Memory Chart */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-white mb-4">CPU & Memory (60s)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2b55" />
            <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="cpu" stroke="#6366f1" fill="url(#gcpu)" strokeWidth={2} name="CPU" dot={false} />
            <Area type="monotone" dataKey="memory" stroke="#a855f7" fill="url(#gmem)" strokeWidth={2} name="Memory" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Network Chart */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-white mb-1">Network I/O (KB/s)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Total ↑ {fmt(metrics?.network.bytes_sent)} · ↓ {fmt(metrics?.network.bytes_recv)}
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2b55" />
            <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="net_in" fill="#22d3ee" name="In (KB/s)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="net_out" fill="#f59e0b" name="Out (KB/s)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Disks */}
      {metrics?.disk && metrics.disk.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-4">Disk Usage</h3>
          <div className="space-y-3">
            {metrics.disk.map((d) => (
              <div key={d.mountpoint}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white font-mono">{d.mountpoint}</span>
                  <span className="text-muted-foreground">{fmt(d.used)} / {fmt(d.total)} · {d.used_percent.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${d.used_percent > 90 ? "bg-red-500" : d.used_percent > 70 ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${d.used_percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-core CPU */}
      {metrics?.cpu.per_core && metrics.cpu.per_core.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-4">Per-Core CPU</h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {metrics.cpu.per_core.map((v, i) => (
              <div key={i} className="text-center">
                <div className="h-16 bg-surface-hover rounded relative overflow-hidden flex items-end">
                  <div className="w-full bg-nebula-500 transition-all" style={{ height: `${v}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">C{i}</p>
                <p className="text-xs text-white">{v.toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network icon card */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard title="Network ↓" value={fmt(metrics?.network.bytes_recv)}
          subtitle={`${metrics?.network.packets_recv ?? 0} packets`}
          icon={<Network className="w-5 h-5" />} color="green" />
        <MetricCard title="Network ↑" value={fmt(metrics?.network.bytes_sent)}
          subtitle={`${metrics?.network.packets_sent ?? 0} packets`}
          icon={<Network className="w-5 h-5" />} color="amber" />
      </div>
    </div>
  );
}
