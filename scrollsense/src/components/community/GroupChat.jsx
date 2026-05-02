/**
 * GroupChat — Real-time anonymous group chat component.
 *
 * Features: message list with auto-scroll, typing indicators, online
 * presence sidebar, streak badges, reactions, system/milestone messages,
 * load-more pagination, rate limit feedback.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Wifi, WifiOff, ChevronUp, Flame, Heart, Trophy, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REACTION_EMOJI = {
  fire: '🔥',
  clap: '👏',
  heart: '❤️',
  strong: '💪',
};

export default function GroupChat({
  messages = [],
  typingMembers = [],
  onlineMembers = [],
  myAnonymousName = '',
  isConnected = false,
  rateLimited: rateLimitedProp = false,
  members = [],
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onAddReaction,
  onRemoveReaction,
  onLoadMore,
  onDeleteMessage,
}) {
  const [input, setInput] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [rateLimitedLocal, setRateLimitedLocal] = useState(false);
  const isRateLimited = rateLimitedProp || rateLimitedLocal;
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const wasAtBottomRef = useRef(true);
  const typingDebounceRef = useRef(null);
  const loadMoreGuardRef = useRef(false);
  const rateLimitTimerRef = useRef(null);

  // ── Auto-scroll to bottom on new messages ──
  useEffect(() => {
    if (wasAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const el = chatContainerRef.current;
    wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;

    // Load more when scrolled to top (with guard against repeated calls)
    if (el.scrollTop < 20 && messages.length > 0 && !loadMoreGuardRef.current) {
      const oldestMsg = messages[0];
      if (oldestMsg?.sentAt && onLoadMore) {
        loadMoreGuardRef.current = true;
        onLoadMore(oldestMsg.sentAt);
        // Reset guard after 2 seconds
        setTimeout(() => { loadMoreGuardRef.current = false; }, 2000);
      }
    }
  }, [messages, onLoadMore]);

  // ── Typing handler ──
  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (e.target.value.length > 0 && onStartTyping) {
      onStartTyping();
    }

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      if (onStopTyping) onStopTyping();
    }, 2000);
  };

  // ── Send message ──
  // Expose a way for the parent to tell us we're rate limited
  const triggerRateLimitWarning = useCallback(() => {
    setRateLimited(true);
    if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
    rateLimitTimerRef.current = setTimeout(() => setRateLimited(false), 5000);
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !onSendMessage) return;

    if (trimmed.length > 500) {
      return;
    }

    onSendMessage(trimmed);
    setInput('');
    if (onStopTyping) onStopTyping();
    wasAtBottomRef.current = true;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Streak badge ──
  const renderStreakBadge = (streak) => {
    if (!streak || streak < 3) return null;
    const dots = Math.min(streak, 10);
    return (
      <span className="ml-1.5 text-[#DFE104] text-[10px] tracking-tight" title={`${streak}-week streak`}>
        {'●'.repeat(dots)}
      </span>
    );
  };

  // ── Reactions bar ──
  const renderReactions = (msg) => {
    const reactions = msg.reactions || {};
    const hasAny = Object.values(reactions).some(v => v > 0);

    return (
      <div className="flex items-center gap-1 mt-1">
        {Object.entries(REACTION_EMOJI).map(([key, emoji]) => {
          const count = reactions[key] || 0;
          return (
            <button
              key={key}
              onClick={() => count > 0 && onRemoveReaction ? onRemoveReaction(msg.id, key) : onAddReaction && onAddReaction(msg.id, key)}
              className={`text-[11px] px-1.5 py-0.5 border transition-all cursor-pointer ${
                count > 0
                  ? 'border-[#DFE104]/30 bg-[#DFE104]/5 text-[#DFE104]'
                  : 'border-[#27272A] text-[#3F3F46] hover:border-[#3F3F46] hover:text-[#A1A1AA]'
              }`}
              title={key}
            >
              {emoji}{count > 0 ? ` ${count}` : ''}
            </button>
          );
        })}
      </div>
    );
  };

  // ── Message rendering ──
  const renderMessage = (msg, idx) => {
    const isSystem = msg.messageType === 'system';
    const isMilestone = msg.messageType === 'milestone';
    const isMe = msg.anonymousName === myAnonymousName;

    // System messages — centered, no bubble
    if (isSystem) {
      return (
        <motion.div
          key={msg.id || idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center py-2"
        >
          <p className="text-[10px] uppercase tracking-widest text-[#3F3F46] bg-[#27272A]/30 px-3 py-1 border border-[#27272A]">
            {msg.content}
          </p>
        </motion.div>
      );
    }

    // Milestone messages — centered with celebration styling
    if (isMilestone) {
      return (
        <motion.div
          key={msg.id || idx}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center py-3"
        >
          <div className="border-2 border-[#DFE104]/30 bg-[#DFE104]/5 px-4 py-2 text-center">
            <Trophy size={14} className="mx-auto mb-1 text-[#DFE104]" />
            <p className="text-xs uppercase tracking-widest text-[#DFE104] font-bold">
              {msg.content}
            </p>
          </div>
        </motion.div>
      );
    }

    // User messages
    const time = msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).toUpperCase() : '';

    return (
      <motion.div
        key={msg.id || idx}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} py-1`}
      >
        {/* Name + streak + time */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] uppercase tracking-widest font-bold ${
            isMe ? 'text-[#DFE104]' : 'text-[#A1A1AA]'
          }`}>
            {msg.anonymousName}
            {isMe && <span className="text-[#DFE104]/50 ml-1">(YOU)</span>}
          </span>
          {renderStreakBadge(msg.streak)}
          <span className="text-[9px] text-[#27272A]">{time}</span>
          {isMe && onDeleteMessage && (
            <button
              onClick={() => onDeleteMessage(msg.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Delete message"
            >
              <Trash2 size={10} className="text-[#3F3F46] hover:text-red-400" />
            </button>
          )}
        </div>

        {/* Message bubble */}
        <div className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
          isMe
            ? 'bg-[#DFE104]/10 border border-[#DFE104]/20 text-[#FAFAFA]'
            : 'bg-[#27272A]/40 border border-[#27272A] text-[#E4E4E7]'
        }`}>
          {msg.content}
        </div>

        {/* Reactions */}
        {renderReactions(msg)}
      </motion.div>
    );
  };

  // ── Online count ──
  const onlineCount = onlineMembers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] mb-6 flex flex-col"
    >
      {/* ── Chat Header ── */}
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-[#3F3F46]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-0.5">GROUP CHAT</p>
          <p className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
            TALK TO YOUR GROUP
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Online indicator */}
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-1.5 border border-[#3F3F46] px-2.5 py-1 hover:border-[#FAFAFA]/20 transition-all cursor-pointer"
          >
            <div className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-green-500' : 'bg-[#3F3F46]'}`} />
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
              {onlineCount} ONLINE
            </span>
          </button>
          {/* Connection status */}
          <div className="flex items-center gap-1" title={isConnected ? 'Connected' : 'Reconnecting...'}>
            {isConnected ? (
              <Wifi size={12} className="text-green-500" />
            ) : (
              <WifiOff size={12} className="text-red-400 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* ── Members Panel (collapsible) ── */}
      <AnimatePresence>
        {showMembers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[#3F3F46]"
          >
            <div className="p-3 flex flex-wrap gap-2">
              {members.map((m) => {
                const isOnline = onlineMembers.includes(m.anonymousName);
                const isYou = m.anonymousName === myAnonymousName;
                return (
                  <div
                    key={m.anonymousName}
                    className={`flex items-center gap-1.5 px-2 py-1 border text-[10px] uppercase tracking-widest ${
                      isYou ? 'border-[#DFE104]/30 text-[#DFE104]' : 'border-[#27272A] text-[#A1A1AA]'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-[#3F3F46]'}`} />
                    {m.anonymousName}
                    {isYou && ' (YOU)'}
                    {renderStreakBadge(m.submissionStreak)}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Not connected banner ── */}
      {!isConnected && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-900/30">
          <p className="text-[10px] uppercase tracking-widest text-red-400 flex items-center gap-2">
            <WifiOff size={10} />
            RECONNECTING — MESSAGES MAY BE DELAYED
          </p>
        </div>
      )}

      {/* ── Message List ── */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
        style={{ maxHeight: '400px', minHeight: '200px' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <p className="text-sm uppercase tracking-tighter text-[#3F3F46] font-bold mb-1">
              NO MESSAGES YET
            </p>
            <p className="text-[10px] uppercase tracking-widest text-[#27272A]">
              BE THE FIRST TO SAY SOMETHING
            </p>
          </div>
        )}

        {messages.map((msg, idx) => renderMessage(msg, idx))}

        {/* Typing indicators */}
        <AnimatePresence>
          {typingMembers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="py-1"
            >
              <p className="text-[10px] uppercase tracking-widest text-[#3F3F46] italic">
                {typingMembers.join(', ')} {typingMembers.length === 1 ? 'is' : 'are'} typing...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Rate limit warning ── */}
      <AnimatePresence>
        {isRateLimited && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-1 bg-[#DFE104]/10 border-t border-[#DFE104]/20"
          >
            <p className="text-[10px] uppercase tracking-widest text-[#DFE104]">
              SLOW DOWN — MAX 10 MESSAGES PER HOUR
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Bar ── */}
      <div className="flex items-center gap-2 p-3 border-t border-[#3F3F46]">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? 'TYPE A MESSAGE...' : 'CONNECTING...'}
          disabled={!isConnected}
          maxLength={500}
          className="flex-1 bg-transparent border-b-2 border-[#27272A] focus:border-[#DFE104] text-[#FAFAFA] text-sm outline-none transition-colors placeholder:text-[#27272A] pb-1.5 uppercase tracking-tight disabled:opacity-30"
        />
        <button
          onClick={handleSend}
          disabled={!isConnected || !input.trim()}
          className="border-2 border-[#3F3F46] p-2.5 hover:border-[#DFE104] hover:bg-[#DFE104]/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send size={14} className="text-[#DFE104]" />
        </button>
      </div>

      {/* ── Character count ── */}
      {input.length > 400 && (
        <div className="px-4 pb-2">
          <p className={`text-[10px] uppercase tracking-widest ${input.length > 480 ? 'text-red-400' : 'text-[#3F3F46]'}`}>
            {input.length} / 500
          </p>
        </div>
      )}
    </motion.div>
  );
}
