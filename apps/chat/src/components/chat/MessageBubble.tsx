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
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming && !message.content;

  // Aggregate and deduplicate sources from all web_search activities
  const allSources = React.useMemo(() => {
    if (!message.activities) return [];
    const sourceMap = new Map();
    message.activities
      .filter(act => act.title.includes('web_search') && act.status === 'done' && act.details)
      .forEach(act => {
        try {
          const data = JSON.parse(act.details!);
          if (data.sources && Array.isArray(data.sources)) {
            data.sources.forEach((src: any) => {
              if (src.url && !sourceMap.has(src.url)) {
                sourceMap.set(src.url, src);
              }
            });
          }
        } catch (e) {}
      });
    return Array.from(sourceMap.values());
  }, [message.activities]);

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
          <div className="flex flex-col gap-2 items-end">
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-end mb-1">
                {message.attachments.map((att, i) => {
                  const isImage = att.startsWith('data:image/') || att.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  if (isImage) {
                    return <img key={i} src={att} className="max-w-[250px] rounded-xl border border-zinc-700 shadow-md" alt="Attachment" />;
                  }
                  return (
                    <div key={i} className="flex items-center gap-2 bg-[#202027] text-zinc-300 px-3 py-2 rounded-lg border border-zinc-700">
                      <span className="text-xs font-mono">Attachment {i+1}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="bg-[#202027] text-zinc-100 rounded-2xl rounded-tr-sm px-5 py-3 text-[15px] leading-relaxed prose-chat-user">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                img: ({ node, ...props }) => (
                  <img {...props} className="max-w-[250px] rounded-xl my-2 border border-zinc-700 shadow-md" alt="Attachment" />
                ),
                a: ({ node, ...props }) => (
                  <a {...props} className="text-purple-400 hover:underline break-all" target="_blank" rel="noopener noreferrer" />
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
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

            {/* Collapsible Sources Grid */}
            {allSources.length > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors bg-[#202027] hover:bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700/50 mb-2"
                >
                  <span className="w-4 h-4 flex items-center justify-center bg-zinc-800 rounded-full text-[10px] text-purple-400 border border-zinc-700">
                    {allSources.length}
                  </span>
                  {showSources ? 'Hide Sources' : 'View Sources'}
                </button>

                <AnimatePresence>
                  {showSources && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 pt-1 pb-3">
                        {allSources.map((src: any, i: number) => (
                          <a
                            key={`src-${i}`}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 bg-[#202027] border border-zinc-700/50 hover:bg-zinc-800/80 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md rounded-xl p-2.5 w-[200px]"
                            title={src.title}
                          >
                            <div className="w-5 h-5 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center overflow-hidden border border-zinc-700">
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=32`} 
                                alt={src.domain}
                                className="w-3.5 h-3.5"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12.5px] font-medium text-zinc-200 truncate leading-tight">{src.title}</span>
                              <span className="text-[10px] text-zinc-500 truncate leading-tight mt-0.5">{src.domain}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
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
