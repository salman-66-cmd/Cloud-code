import { useState, useEffect, useRef, useCallback } from 'react';
import { Collaborator } from '../types';
import { authService } from '../services/authService';

interface UseCollaborationProps {
  projectId: string;
  fileId?: string | null;
  onRemoteContentUpdate?: (newContent: string) => void;
}

export function useCollaboration({ projectId, fileId, onRemoteContentUpdate }: UseCollaborationProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!projectId || !fileId) {
      setIsConnected(false);
      setCollaborators([]);
      return;
    }

    const token = authService.getToken();
    if (!token) return;

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/collaborate/${projectId}/${fileId}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);

        // Heartbeat ping every 25 seconds
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'room_state') {
            if (data.collaborators) {
              setCollaborators(data.collaborators);
            }
          } else if (data.type === 'user_joined') {
            if (data.collaborators) {
              setCollaborators(data.collaborators);
            }
          } else if (data.type === 'user_left') {
            if (data.collaborators) {
              setCollaborators(data.collaborators);
            } else {
              setCollaborators(prev => prev.filter(c => c.userId !== data.userId));
            }
          } else if (data.type === 'cursor_update') {
            setCollaborators(prev => {
              const existing = prev.find(c => c.userId === data.userId);
              if (existing) {
                return prev.map(c => c.userId === data.userId ? { ...c, cursor: data.cursor } : c);
              } else {
                return [...prev, {
                  userId: data.userId,
                  username: data.username,
                  color: data.color || '#3b82f6',
                  cursor: data.cursor,
                  lastActive: new Date().toISOString()
                }];
              }
            });
          } else if (data.type === 'doc_change') {
            if (data.content !== undefined && onRemoteContentUpdate) {
              onRemoteContentUpdate(data.content);
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        clearInterval(pingIntervalRef.current);
        if (event.code !== 1000) {
          // Reconnect with backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        setConnectionError("WebSocket connection error. Retrying...");
      };
    } catch (err) {
      console.error("Failed to establish WebSocket connection:", err);
    }
  }, [projectId, fileId, onRemoteContentUpdate]);

  useEffect(() => {
    connect();

    return () => {
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendCursor = useCallback((line: number, ch: number, selection?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        line,
        ch,
        selection
      }));
    }
  }, []);

  const sendDocChange = useCallback((content: string, changes?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const user = authService.getCurrentUser();
      wsRef.current.send(JSON.stringify({
        type: 'doc_change',
        content,
        changes,
        authorId: user?.id
      }));
    }
  }, []);

  return {
    collaborators,
    isConnected,
    connectionError,
    sendCursor,
    sendDocChange
  };
}
