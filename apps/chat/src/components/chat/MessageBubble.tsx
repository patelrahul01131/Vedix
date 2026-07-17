import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, User, Bot, RefreshCcw, Edit2, ThumbsUp, ThumbsDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../../types';
import 'highlight.js/styles/github-dark.css';

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  inline?: boolean;
}

function CodeBlock({ className, children, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(String(children)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  if (inline) {
    return (
      <code className={className} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied</span></>
          ) : (
            <><Copy size={12} /><span>Copy</span></>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto bg-zinc-950">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  index: number;
}

export function MessageBubble({ message, index }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming && !message.content;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.02 }}
      className={`flex gap-4 py-5 group ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar — assistant only */}
      {!isUser && (
        <div className="flex items-start pt-0.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot size={16} className="text-white" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        {isUser ? (
          /* User bubble */
          <div className="bg-[#202027] text-zinc-100 rounded-2xl rounded-tr-sm px-5 py-3 text-[15px] leading-relaxed">
            {message.content}
          </div>
        ) : isStreaming ? (
          /* Thinking dots */
          <div className="flex items-center gap-1 px-1 py-3">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </div>
        ) : (
          /* Assistant message with markdown and activities */
          <div className="flex flex-col gap-3">
            {/* Activities block */}
            {message.activities && message.activities.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                <AnimatePresence>
                  {message.activities.map((act) => (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 text-[13px]"
                    >
                      {act.status === 'running' && <Loader2 size={14} className="text-purple-400 animate-spin" />}
                      {act.status === 'done' && <CheckCircle2 size={14} className="text-green-400" />}
                      {act.status === 'error' && <AlertCircle size={14} className="text-red-400" />}
                      
                      <span className={`${act.status === 'error' ? 'text-red-400' : 'text-zinc-400 font-mono'}`}>
                        {act.title}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            
            <div className={`prose-chat text-zinc-200 text-[15px] ${message.isStreaming ? 'streaming-cursor' : ''}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code: ({ className, children, ...props }: any) => (
                  <CodeBlock className={className} inline={props.inline}>
                    {children}
                  </CodeBlock>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          </div>
        )}

        {/* Action Toolbar — only for non-empty assistant messages */}
        {!isUser && message.content && !message.isStreaming && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1.5 -ml-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-[#202027]"
              aria-label="Copy message"
            >
              {copied ? (
                <><Check size={14} className="text-green-400" /></>
              ) : (
                <><Copy size={14} /></>
              )}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-[#202027]" aria-label="Retry">
              <RefreshCcw size={14} />
            </button>
            <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-[#202027]" aria-label="Edit">
              <Edit2 size={14} />
            </button>
            <div className="w-px h-4 bg-[#202027] mx-1"></div>
            <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-[#202027]" aria-label="Like">
              <ThumbsUp size={14} />
            </button>
            <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-[#202027]" aria-label="Dislike">
              <ThumbsDown size={14} />
            </button>
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex items-start pt-0.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-[#202027]">
            <User size={16} className="text-zinc-400" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
