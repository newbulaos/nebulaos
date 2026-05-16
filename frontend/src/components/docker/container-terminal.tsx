"use client";

import { useEffect, useRef } from "react";
import Cookies from "js-cookie";

interface Props {
  containerId: string;
}

export function ContainerTerminal({ containerId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    let term: import("xterm").Terminal;
    let fit: import("xterm-addon-fit").FitAddon;
    let ro: ResizeObserver;
    let ws: WebSocket;

    import("xterm").then(({ Terminal }) =>
      Promise.all([
        import("xterm-addon-fit"),
        import("xterm-addon-web-links"),
        import("xterm/css/xterm.css" as string),
      ]).then(([{ FitAddon }, { WebLinksAddon }]) => {
        if (!ref.current) return;
        term = new Terminal({
          theme: { background: "#0f0e2a", foreground: "#e2e8f0", cursor: "#6366f1" },
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          cursorBlink: true,
        });
        fit = new FitAddon();
        term.loadAddon(fit);
        term.loadAddon(new WebLinksAddon());
        term.open(ref.current);
        fit.fit();
        termRef.current = term;

        const token = Cookies.get("access_token");
        const base = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
        ws = new WebSocket(`${base}/api/v1/ws/containers/${containerId}/exec?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => term.writeln("\r\n\x1b[32m✓ Connected\x1b[0m\r\n");
        ws.onclose = () => term.writeln("\r\n\x1b[31m✗ Disconnected\x1b[0m");
        ws.onmessage = (e) => {
          if (e.data instanceof Blob) {
            e.data.arrayBuffer().then((buf) => term.write(new Uint8Array(buf)));
          } else {
            term.write(e.data);
          }
        };
        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });

        ro = new ResizeObserver(() => fit.fit());
        ro.observe(ref.current!);
      })
    );

    return () => {
      ws?.close();
      term?.dispose();
      ro?.disconnect();
    };
  }, [containerId]);

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-surface-border flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-xs text-muted-foreground ml-2 font-mono">{containerId.slice(0, 12)}</span>
      </div>
      <div ref={ref} className="p-2" style={{ height: 400 }} />
    </div>
  );
}
