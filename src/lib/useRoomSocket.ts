import { useCallback, useEffect, useRef, useState } from 'react';
import type { WSClientMessage, WSServerMessage } from '../shared/types';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed';

interface UseRoomSocketOptions {
  authMessage: WSClientMessage | null;
  onMessage: (msg: WSServerMessage) => void;
}

export function useRoomSocket({ authMessage, onMessage }: UseRoomSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const authRef = useRef(authMessage);
  authRef.current = authMessage;

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const shouldReconnectRef = useRef(true);
  const retryDelayRef = useRef(600);

  useEffect(() => {
    if (!authMessage) return;
    shouldReconnectRef.current = true;
    let timer: number | undefined;
    let pingInterval: number | undefined;

    const connect = () => {
      if (!shouldReconnectRef.current) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryDelayRef.current = 600;
        setStatus('connected');
        if (authRef.current) {
          ws.send(JSON.stringify(authRef.current));
        }
        pingInterval = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as WSServerMessage;
          onMessageRef.current(parsed);
        } catch {
          // Ignore invalid payloads
        }
      };

      ws.onclose = () => {
        if (pingInterval) window.clearInterval(pingInterval);
        if (!shouldReconnectRef.current) {
          setStatus('closed');
          return;
        }
        setStatus('reconnecting');
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(4000, Math.round(delay * 1.5));
        timer = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (timer) window.clearTimeout(timer);
      if (pingInterval) window.clearInterval(pingInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [JSON.stringify(authMessage)]);

  const send = useCallback((msg: WSClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  return { status, send };
}
