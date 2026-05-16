"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Cookies from "js-cookie";

export function useWebSocket<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      reconnectTimer.current = setTimeout(connect, 2000);
      return;
    }
    const base = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
    const url = `${base}/api/v1${path}?token=${token}`;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };
    ws.current.onerror = () => ws.current?.close();
    ws.current.onmessage = (e) => {
      try { setData(JSON.parse(e.data)); } catch {}
    };
  }, [path]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }, []);

  return { data, connected, send };
}
