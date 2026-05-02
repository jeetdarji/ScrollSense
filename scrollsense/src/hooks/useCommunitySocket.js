/**
 * useCommunitySocket — Real-time WebSocket hook for community chat.
 *
 * Manages Socket.io connection, listens for events, and exposes
 * send functions. Handles token refresh on expiry.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import api from '../lib/axios';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function useCommunitySocket(groupId) {
  const accessToken = useAuthStore(state => state.accessToken);
  const setAccessToken = useAuthStore(state => state.setAccessToken);
  const setUser = useAuthStore(state => state.setUser);

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingMembers, setTypingMembers] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [myAnonymousName, setMyAnonymousName] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const rateLimitTimerRef = useRef(null);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  // ─── Connection Management ──────────────────────────────────────────
  useEffect(() => {
    if (!accessToken || !groupId) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // ── Connection events ──
    socket.on('connect', () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      console.log('[socket] Connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[socket] Connection error:', error.message);
      reconnectAttemptRef.current++;

      // If authentication failed, try refreshing token
      if (error.message.includes('Authentication failed') || error.message.includes('token expired')) {
        handleTokenRefresh(socket);
      }
    });

    // ── Auth events ──
    socket.on('token_expired', () => {
      handleTokenRefresh(socket);
    });

    // ── Connection setup ──
    socket.on('connected', (data) => {
      if (data.anonymousName) setMyAnonymousName(data.anonymousName);
      if (data.onlineMembers) setOnlineMembers(data.onlineMembers);
    });

    socket.on('no_group', () => {
      console.log('[socket] User has no active group');
    });

    // ── Message events ──
    socket.on('initial_messages', (data) => {
      if (data.messages) {
        setMessages(data.messages);
      }
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('message_sent', () => {
      // Confirmation — no action needed, message already in state via new_message
    });

    socket.on('message_deleted', (data) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId && m.id?.toString() !== data.messageId));
    });

    socket.on('messages_loaded', (data) => {
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => [...data.messages, ...prev]);
      }
    });

    // ── Typing events ──
    socket.on('member_typing', (data) => {
      setTypingMembers(prev => {
        if (prev.includes(data.anonymousName)) return prev;
        return [...prev, data.anonymousName];
      });
    });

    socket.on('member_stopped_typing', (data) => {
      setTypingMembers(prev => prev.filter(n => n !== data.anonymousName));
    });

    // ── Presence events ──
    socket.on('member_online', (data) => {
      setOnlineMembers(prev => {
        if (prev.includes(data.anonymousName)) return prev;
        return [...prev, data.anonymousName];
      });
    });

    socket.on('member_offline', (data) => {
      setOnlineMembers(prev => prev.filter(n => n !== data.anonymousName));
      // Also clear typing if they were typing
      setTypingMembers(prev => prev.filter(n => n !== data.anonymousName));
    });

    // ── Reaction events ──
    socket.on('reaction_updated', (data) => {
      setMessages(prev => prev.map(m => {
        if ((m.id === data.messageId) || (m.id?.toString() === data.messageId)) {
          return { ...m, reactions: data.reactions };
        }
        return m;
      }));
    });

    // ── Group lifecycle events ──
    socket.on('submission_received', (data) => {
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    socket.on('group_milestone', (data) => {
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    socket.on('member_joined', (data) => {
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    socket.on('member_left', (data) => {
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    // ── Force leave ──
    socket.on('force_leave_room', () => {
      socket.disconnect();
    });

    // ── Error handling ──
    socket.on('error', (data) => {
      console.warn('[socket] Server error:', data.message);
    });

    socket.on('rate_limited', (data) => {
      console.warn('[socket] Rate limited:', data.message);
      setRateLimited(true);
      if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
      rateLimitTimerRef.current = setTimeout(() => setRateLimited(false), 5000);
    });

    // Cleanup on unmount or groupId change
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setMessages([]);
      setTypingMembers([]);
      setOnlineMembers([]);
    };
  }, [accessToken, groupId]);

  // join_group_room is now handled automatically on connection since
  // the socket reconnects when groupId changes (dependency in main effect).

  // ── Token refresh handler ──
  async function handleTokenRefresh(socket) {
    try {
      const res = await api.post('/auth/refresh');
      const { accessToken: newToken, user } = res.data;
      setAccessToken(newToken);
      setUser(user);

      // Reconnect with new token
      socket.auth = { token: newToken };
      socket.connect();
    } catch (err) {
      console.error('[socket] Token refresh failed:', err);
    }
  }

  // ─── Send Functions ─────────────────────────────────────────────────

  const sendMessage = useCallback((content) => {
    if (!socketRef.current || !content?.trim()) return;
    socketRef.current.emit('send_message', { content: content.trim() });
  }, []);

  const startTyping = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing_start');

    // Auto-stop after 3 seconds of no further calls
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('typing_stop');
      }
    }, 3000);
  }, []);

  const stopTyping = useCallback(() => {
    if (!socketRef.current) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socketRef.current.emit('typing_stop');
  }, []);

  const addReaction = useCallback((messageId, reaction) => {
    if (!socketRef.current) return;
    socketRef.current.emit('add_reaction', { messageId, reaction });
  }, []);

  const removeReaction = useCallback((messageId, reaction) => {
    if (!socketRef.current) return;
    socketRef.current.emit('remove_reaction', { messageId, reaction });
  }, []);

  const loadMoreMessages = useCallback((beforeTimestamp) => {
    if (!socketRef.current) return;
    socketRef.current.emit('load_more_messages', {
      before: beforeTimestamp,
      limit: 50,
    });
  }, []);

  return {
    isConnected,
    messages,
    typingMembers,
    onlineMembers,
    myAnonymousName,
    rateLimited,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    loadMoreMessages,
  };
}
