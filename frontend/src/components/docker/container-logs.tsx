"use client";

import { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";

interface Props { containerId: string }

export function ContainerLogs({ containerId }: Props) {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs([]);
    const token = Cookies.get("access_token");
    const base = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
    const ws = new WebSocket(`${base}/api/v1/ws/containers/${containerId}/logs?token=${token}`);

    ws.onmessage = (e) => {
      setLogs((prev) => [...prev.slice(-500), e.data as string]);
    };

    return () => ws.close();
  }, [containerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-[#0a0918] border border-surface-border rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-surface-border text-xs text-muted-foreground font-mono">
        stdout/stderr — last 500 lines
      </div>
      <div className="h-96 overflow-y-auto p-4 font-mono text-xs text-green-400 space-y-0.5">
        {logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-5">{line}</div>
        ))}
        {logs.length === 0 && (
          <p className="text-muted-foreground">Waiting for logs...</p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
