"use client";

import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useWebSocket } from "@/hooks/useWebSocket";

interface DataPoint {
  time: string;
  cpu: number;
  memory: number;
}

export function ResourceChart() {
  const { data: metrics } = useWebSocket<{ cpu: { usage_percent: number }; memory: { used_percent: number } }>("/ws/metrics");
  const [history, setHistory] = useState<DataPoint[]>([]);
  const maxPoints = 60;

  useEffect(() => {
    if (!metrics) return;
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          time: new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          cpu: parseFloat(metrics.cpu.usage_percent.toFixed(1)),
          memory: parseFloat(metrics.memory.used_percent.toFixed(1)),
        },
      ];
      return next.slice(-maxPoints);
    });
  }, [metrics]);

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-white mb-4">Resource Usage (60s)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2b55" />
          <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{ background: "#1a1836", border: "1px solid #2d2b55", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Area type="monotone" dataKey="cpu" stroke="#6366f1" fill="url(#cpu)" strokeWidth={2} name="CPU" dot={false} />
          <Area type="monotone" dataKey="memory" stroke="#a855f7" fill="url(#mem)" strokeWidth={2} name="Memory" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 bg-nebula-500 rounded" /> CPU
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 bg-purple-500 rounded" /> Memory
        </div>
      </div>
    </div>
  );
}
