import { useState, useRef, useCallback, useEffect } from 'react';

interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  heartbeatInterval?: number; // milliseconds
  reconnectInterval?: number; // milliseconds
  maxReconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

interface WebSocketState {
  readyState: number;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
}

export const useWebSocketConnection = (config: WebSocketConfig) => {
  const [state, setState] = useState<WebSocketState>({
    readyState: WebSocket.CLOSED,
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastError: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);
  const lastPongRef = useRef<number>(Date.now());
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const updateState = useCallback((updates: Partial<WebSocketState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearTimers = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    const interval = configRef.current.heartbeatInterval || 30000; // 30 seconds default
    
    clearTimers();
    
    heartbeatIntervalRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send ping message
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          
          // Check if we received a pong recently (within 2x heartbeat interval)
          const timeSinceLastPong = Date.now() - lastPongRef.current;
          if (timeSinceLastPong > interval * 2) {
            console.warn('WebSocket heartbeat timeout - connection may be stale');
            // Force reconnection
            ws.close(1006, 'Heartbeat timeout');
          }
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
        }
      }
    }, interval);
  }, [clearTimers]);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return; // Already connecting
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    isManuallyClosedRef.current = false;
    updateState({ 
      isConnecting: true, 
      lastError: null,
      readyState: WebSocket.CONNECTING 
    });

    try {
      const ws = new WebSocket(configRef.current.url, configRef.current.protocols);
      wsRef.current = ws;

      ws.onopen = (event) => {
        console.log('WebSocket connected');
        lastPongRef.current = Date.now();
        updateState({
          readyState: WebSocket.OPEN,
          isConnected: true,
          isConnecting: false,
          isReconnecting: false,
          reconnectAttempts: 0,
          lastError: null,
        });
        
        startHeartbeat();
        configRef.current.onOpen?.(event);
      };

      ws.onmessage = (event) => {
        try {
          // Handle pong messages for heartbeat
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            lastPongRef.current = Date.now();
            return; // Don't pass pong messages to the application
          }
        } catch (e) {
          // Not JSON or not a pong message, pass through
        }
        
        configRef.current.onMessage?.(event);
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        updateState({ 
          lastError: 'Connection error occurred',
          isConnecting: false 
        });
        configRef.current.onError?.(event);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        clearTimers();
        
        updateState({
          readyState: WebSocket.CLOSED,
          isConnected: false,
          isConnecting: false,
        });

        configRef.current.onClose?.(event);

        // Attempt reconnection if not manually closed
        if (!isManuallyClosedRef.current && event.code !== 1000) {
          attemptReconnect();
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      updateState({ 
        isConnecting: false, 
        lastError: 'Failed to create connection' 
      });
    }
  }, [updateState, startHeartbeat, clearTimers]);

  const attemptReconnect = useCallback(() => {
    const maxAttempts = configRef.current.maxReconnectAttempts || 5;
    const reconnectInterval = configRef.current.reconnectInterval || 3000;

    setState(prev => {
      const newAttempts = prev.reconnectAttempts + 1;
      
      if (newAttempts > maxAttempts) {
        console.error('Max reconnection attempts reached');
        configRef.current.onReconnectFailed?.();
        return {
          ...prev,
          isReconnecting: false,
          lastError: 'Connection failed after multiple attempts'
        };
      }

      console.log(`Attempting to reconnect (${newAttempts}/${maxAttempts})...`);
      configRef.current.onReconnect?.(newAttempts);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);

      return {
        ...prev,
        isReconnecting: true,
        reconnectAttempts: newAttempts
      };
    });
  }, [connect]);

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    clearTimers();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    updateState({
      readyState: WebSocket.CLOSED,
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
    });
  }, [clearTimers, updateState]);

  const send = useCallback((data: string | ArrayBuffer | Blob) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        updateState({ lastError: 'Failed to send message' });
        return false;
      }
    } else {
      console.warn('WebSocket is not connected');
      updateState({ lastError: 'Not connected' });
      return false;
    }
  }, [updateState]);

  const forceReconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1006, 'Force reconnect');
    } else {
      connect();
    }
  }, [connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isManuallyClosedRef.current = true;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
      }
    };
  }, [clearTimers]);

  return {
    ...state,
    connect,
    disconnect,
    send,
    forceReconnect,
    websocket: wsRef.current,
  };
};
