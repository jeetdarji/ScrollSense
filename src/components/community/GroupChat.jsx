import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'JUST NOW';
  if (diffMin < 60) return `${diffMin}M AGO`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}H AGO`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}D AGO`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export default function GroupChat({
  messages = [],
  myAnonymousName = '',
  onSendMessage,
  onDeleteMessage,
  isSending = false,
  isLoading = false,
  hasMore = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Reverse messages so newest is at bottom
  const sortedMessages = [...(messages || [])].reverse();

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sortedMessages.length, isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    try {
      await onSendMessage(text);
    } catch (err) {
      // Show error inline — don't crash
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (messageId) => {
    if (!onDeleteMessage) return;
    try {
      await onDeleteMessage(messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] mb-6 bg-[#09090B] overflow-hidden"
    >
      {/* Header — toggle chat */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-[#27272A]/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <MessageCircle size={16} color="#DFE104" />
          <div className="text-left">
            <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-0.5">
              GROUP CHAT
            </p>
            <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
              TALK TO YOUR GROUP
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sortedMessages.length > 0 && (
            <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">
              {sortedMessages.length} MESSAGE{sortedMessages.length !== 1 ? 'S' : ''}
            </span>
          )}
          <ChevronDown
            size={14}
            color="#A1A1AA"
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Chat body */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#3F3F46]">
              {/* Messages area */}
              <div className="px-6 md:px-8 py-4 max-h-[320px] overflow-y-auto custom-scrollbar">
                {isLoading && (
                  <div className="text-center py-8">
                    <p className="text-xs uppercase tracking-widest text-[#3F3F46]">LOADING MESSAGES...</p>
                  </div>
                )}

                {!isLoading && sortedMessages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle size={18} color="#3F3F46" className="mx-auto mb-2" />
                    <p className="text-xs uppercase tracking-widest text-[#3F3F46]">
                      NO MESSAGES YET
                    </p>
                    <p className="text-[10px] text-[#27272A] mt-1">
                      Be the first to say something — anonymously.
                    </p>
                  </div>
                )}

                {sortedMessages.map((msg) => {
                  const isMe = msg.anonymousName === myAnonymousName;

                  return (
                    <div
                      key={msg.id}
                      className={`py-3 border-b border-[#27272A]/50 last:border-0 group/msg ${isMe ? 'pl-4 border-l-2 border-l-[#DFE104]/20' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase tracking-tighter ${isMe ? 'text-[#DFE104]' : 'text-[#FAFAFA]'}`}>
                              {msg.anonymousName}
                              {isMe && <span className="text-[10px] text-[#DFE104]/60 ml-1">(YOU)</span>}
                            </span>
                            <span className="text-[10px] uppercase text-[#3F3F46]">
                              {formatTime(msg.sentAt)}
                            </span>
                          </div>
                          <p className="text-sm text-[#A1A1AA] leading-relaxed break-words">
                            {msg.content}
                          </p>
                        </div>

                        {isMe && (
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 hover:text-red-400 text-[#3F3F46] shrink-0"
                            title="Delete message"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-[#3F3F46] px-6 md:px-8 py-4 flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={500}
                  placeholder="TYPE A MESSAGE..."
                  className="flex-1 bg-transparent border-b border-[#3F3F46] focus:border-[#DFE104] text-[#FAFAFA] text-sm outline-none transition-colors placeholder:text-[#3F3F46] pb-1 uppercase tracking-wider"
                  disabled={isSending}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className={`border border-[#3F3F46] p-2.5 transition-all ${
                    input.trim() && !isSending
                      ? 'hover:border-[#DFE104] hover:text-[#DFE104] text-[#A1A1AA] cursor-pointer'
                      : 'text-[#27272A] cursor-not-allowed'
                  }`}
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Anonymity reminder */}
              <div className="px-6 md:px-8 pb-4">
                <p className="text-[10px] uppercase tracking-wider text-[#27272A]">
                  Messages are sent as '{myAnonymousName}'. No real identity is shared.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
