import React, { useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Square, Plus, AtSign, Globe } from 'lucide-react';
import { useChatStore } from '../../features/chat/useChatStore';
import { useChat } from '../../features/chat/useChat';

export function ChatInput() {
  const { prompt, setPrompt, isStreaming } = useChatStore();
  const { sendMessage, stopGeneration } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [prompt]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming) sendMessage();
      }
    },
    [isStreaming, sendMessage]
  );

  const canSend = prompt.trim().length > 0 && !isStreaming;

  return (
    <div className="w-full px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Main input pill */}
        <div className="relative flex flex-col bg-[#17171C] border border-[#202027] rounded-2xl overflow-hidden focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all shadow-lg shadow-black/20">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Vedix anything..."
            rows={1}
            disabled={isStreaming}
            className="w-full resize-none bg-transparent text-white placeholder-zinc-500 text-[15px] leading-relaxed px-4 pt-4 pb-2 outline-none min-h-[56px] max-h-[300px] disabled:opacity-60 custom-scrollbar"
            aria-label="Message input"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
            <div className="flex items-center gap-0.5">
              <button
                disabled
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-[#202027] transition-colors disabled:cursor-not-allowed"
                aria-label="Attach file"
              >
                <Plus size={18} />
              </button>
              <button
                disabled
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-[#202027] transition-colors disabled:cursor-not-allowed hidden sm:flex"
                aria-label="Mention"
              >
                <AtSign size={16} />
              </button>
              <button
                disabled
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-[#202027] transition-colors disabled:cursor-not-allowed hidden sm:flex"
                aria-label="Web Search"
              >
                <Globe size={16} />
              </button>
            </div>

            {/* Send / Stop button */}
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.button
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={stopGeneration}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 transition-colors shrink-0"
                  aria-label="Stop generation"
                >
                  <Square size={14} fill="currentColor" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={sendMessage}
                  disabled={!canSend}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-[#202027] disabled:text-zinc-600 text-white transition-all shrink-0 disabled:cursor-not-allowed shadow-md shadow-purple-900/20"
                  aria-label="Send message"
                >
                  <ArrowUp size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-zinc-700 mt-2">
          Vedix can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
