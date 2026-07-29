// CompetenceTrack — WebSocket Hook
// Real-time collaboration and push notifications via Socket.IO

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/lib/store';

// ─── Types ───────────────────────────────────────────────────────────

export interface CursorData {
  userId: string;
  userName: string;
  pageId: string;
  x: number;
  y: number;
  color: string;
}

export interface EditData {
  userId: string;
  userName: string;
  pageId: string;
  content: string;
  timestamp: number;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  pageId: string;
  color: string;
  cursor: CursorData | null;
}

export interface NotificationPush {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedId?: string;
  timestamp: number;
}

export interface ActivityEvent {
  userId: string;
  userName: string;
  pageId: string;
  pageTitle: string;
  timestamp: number;
}

// ─── Singleton Socket Manager ────────────────────────────────────────

let socketInstance: Socket | null = null;
let socketConnected = false;

function getSocket(): Socket | null {
  return socketInstance;
}

function connectSocket(userId: string, userName: string, schoolId: string, role: string): Socket {
  if (socketInstance && socketConnected) {
    return socketInstance;
  }

  // Disconnect existing if any
  if (socketInstance) {
    socketInstance.disconnect();
  }

  const socket = io('/?XTransformPort=3003', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[CT-WS] Connected to WebSocket service');
    socketConnected = true;
    // Authenticate
    socket.emit('auth', { userId, userName, schoolId, role });
  });

  socket.on('disconnect', () => {
    console.log('[CT-WS] Disconnected from WebSocket service');
    socketConnected = false;
  });

  socket.on('connect_error', (err) => {
    console.warn('[CT-WS] Connection error:', err.message);
    socketConnected = false;
  });

  socketInstance = socket;
  return socket;
}

function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    socketConnected = false;
  }
}

// ─── Hook: useWebSocket ──────────────────────────────────────────────

export function useWebSocket() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      disconnectSocket();
      setConnected(false);
      return;
    }

    const socket = connectSocket(
      currentUser.id,
      `${currentUser.firstName} ${currentUser.lastName}`,
      currentUser.schoolId ?? '',
      currentUser.role
    );

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected
    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [currentUser]);

  return { connected, socket: getSocket() };
}

// ─── Hook: useNotebookCollaboration ──────────────────────────────────

export function useNotebookCollaboration(notebookId: string | null) {
  const currentUser = useAppStore((s) => s.currentUser);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<CursorData[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [lastEdit, setLastEdit] = useState<EditData | null>(null);
  const [editingUsers, setEditingUsers] = useState<Map<string, { userName: string; pageId: string; timestamp: number }>>(new Map());

  const activityListenersRef = useRef<((event: ActivityEvent) => void)[]>([]);
  const editListenersRef = useRef<((edit: EditData) => void)[]>([]);

  // Join/Leave notebook room
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !notebookId || !currentUser) return;

    // Join notebook room
    socket.emit('notebook:join', { notebookId });

    // Listen for presence updates
    const handlePresenceUpdate = (data: { notebookId: string; users: PresenceUser[] }) => {
      if (data.notebookId === notebookId) {
        setOnlineUsers(data.users.filter((u) => u.userId !== currentUser.id));
        // Update cursors
        setCursors(data.users.filter((u) => u.cursor && u.userId !== currentUser.id).map((u) => u.cursor!));
      }
    };

    // Listen for cursor updates
    const handleCursor = (cursor: CursorData) => {
      if (cursor.userId !== currentUser.id) {
        setCursors((prev) => {
          const filtered = prev.filter((c) => c.userId !== cursor.userId);
          return [...filtered, cursor];
        });
      }
    };

    // Listen for edits
    const handleEdit = (edit: EditData) => {
      if (edit.userId !== currentUser.id) {
        setLastEdit(edit);
        setEditingUsers((prev) => {
          const next = new Map(prev);
          next.set(edit.userId, { userName: edit.userName, pageId: edit.pageId, timestamp: edit.timestamp });
          return next;
        });
        // Notify listeners
        editListenersRef.current.forEach((fn) => fn(edit));
      }
    };

    // Listen for activity events
    const handleActivity = (event: ActivityEvent) => {
      if (event.userId !== currentUser.id) {
        setActivities((prev) => [event, ...prev].slice(0, 20));
        activityListenersRef.current.forEach((fn) => fn(event));
      }
    };

    socket.on('presence:update', handlePresenceUpdate);
    socket.on('notebook:cursor', handleCursor);
    socket.on('notebook:edit', handleEdit);
    socket.on('activity:join', handleActivity);

    return () => {
      // Leave notebook room
      socket.emit('notebook:leave', { notebookId });
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('notebook:cursor', handleCursor);
      socket.off('notebook:edit', handleEdit);
      socket.off('activity:join', handleActivity);
      setOnlineUsers([]);
      setCursors([]);
      setActivities([]);
      setLastEdit(null);
      setEditingUsers(new Map());
    };
  }, [notebookId, currentUser]);

  // Broadcast cursor position
  const broadcastCursor = useCallback((pageId: string, x: number, y: number) => {
    const socket = getSocket();
    if (!socket || !notebookId) return;
    socket.emit('notebook:cursor', { notebookId, pageId, x, y });
  }, [notebookId]);

  // Broadcast edit
  const broadcastEdit = useCallback((pageId: string, content: string) => {
    const socket = getSocket();
    if (!socket || !notebookId) return;
    socket.emit('notebook:edit', { notebookId, pageId, content });
  }, [notebookId]);

  // Broadcast activity (user started editing a page)
  const broadcastActivity = useCallback((pageId: string, pageTitle: string) => {
    const socket = getSocket();
    if (!socket || !notebookId) return;
    socket.emit('activity:join', { notebookId, pageId, pageTitle });
  }, [notebookId]);

  // Add edit listener
  const addEditListener = useCallback((fn: (edit: EditData) => void) => {
    editListenersRef.current.push(fn);
    return () => {
      editListenersRef.current = editListenersRef.current.filter((f) => f !== fn);
    };
  }, []);

  // Add activity listener
  const addActivityListener = useCallback((fn: (event: ActivityEvent) => void) => {
    activityListenersRef.current.push(fn);
    return () => {
      activityListenersRef.current = activityListenersRef.current.filter((f) => f !== fn);
    };
  }, []);

  return {
    onlineUsers,
    cursors,
    activities,
    lastEdit,
    editingUsers,
    broadcastCursor,
    broadcastEdit,
    broadcastActivity,
    addEditListener,
    addActivityListener,
  };
}

// ─── Hook: usePushNotifications ──────────────────────────────────────

export function usePushNotifications() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [notification, setNotification] = useState<NotificationPush | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentUser) return;

    const handleNewNotification = (data: NotificationPush) => {
      setNotification(data);
      // Auto-clear after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    };

    const handleNotificationRead = (data: { notificationId: string; userId: string }) => {
      // Could be used to update UI in real-time
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:read', handleNotificationRead);
    };
  }, [currentUser]);

  return { notification };
}

// ─── Notification Sound Helper ───────────────────────────────────────

let audioContext: AudioContext | null = null;

export function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
}

// ─── Notification Sound Preference ───────────────────────────────────

const NOTIF_SOUND_KEY = 'ct_notification_sound';

export function getNotificationSoundPref(): boolean {
  try {
    const stored = localStorage.getItem(NOTIF_SOUND_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // ignore
  }
  return true; // default on
}

export function setNotificationSoundPref(enabled: boolean) {
  try {
    localStorage.setItem(NOTIF_SOUND_KEY, String(enabled));
  } catch {
    // ignore
  }
}
