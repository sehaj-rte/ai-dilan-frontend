import { useState, useRef, useCallback, useEffect } from 'react';

interface RobustWebSocketConfig {
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void;
}

export const useRobustWebSocket = (config: RobustWebSocketConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const urlRef = useRef<string>('');
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualCloseRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
  }, []);

  const startHeartbeat = useCallback(() => {
    clearTimers();
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000); // 25 seconds
  }, [clearTimers]);

  const updateStatus = useCallback((status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => {
    setIsConnected(status === 'connected');
    setIsConnecting(status === 'connecting');
    setIsReconnecting(status === 'reconnecting');
    config.onStatusChange?.(status);
  }, [config]);

  const connect = useCallback((url: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    urlRef.current = url;
    isManualCloseRef.current = false;
    updateStatus('connecting');
    setError(null);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected with heartbeat');
        reconnectAttemptsRef.current = 0;
        updateStatus('connected');
        startHeartbeat();
        
        // Send initialization
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'conversation_initiation', mode: 'direct' }));
          }
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return; // Handle heartbeat response
        } catch (e) {}
        config.onMessage?.(event);
      };

      ws.onerror = () => {
        setError('Connection error');
        config.onError?.('Connection error');
      };

      ws.onclose = (event) => {
        clearTimers();
        updateStatus('disconnected');
        
        if (!isManualCloseRef.current && event.code !== 1000) {
          attemptReconnect();
        }
      };

    } catch (error) {
      setError('Failed to connect');
      updateStatus('disconnected');
    }
  }, [config, updateStatus, startHeartbeat, clearTimers]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= 5) {
      setError('Max reconnection attempts reached');
      return;
    }

    reconnectAttemptsRef.current++;
    updateStatus('reconnecting');
    
    reconnectRef.current = setTimeout(() => {
      connect(urlRef.current);
    }, 3000);
  }, [connect, updateStatus]);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    clearTimers();
    wsRef.current?.close(1000);
    updateStatus('disconnected');
  }, [clearTimers, updateStatus]);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    return () => {
      isManualCloseRef.current = true;
      clearTimers();
      wsRef.current?.close(1000);
    };
  }, [clearTimers]);

  return {
    isConnected,
    isConnecting,
    isReconnecting,
    error,
    connect,
    disconnect,
    send,
    forceReconnect: () => wsRef.current?.close(1006)
  };
};
