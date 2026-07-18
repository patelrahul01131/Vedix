import React, { useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Square, Plus, AtSign, Globe, X } from 'lucide-react';
import { useChatStore } from '../../features/chat/useChatStore';
import { useChat } from '../../features/chat/useChat';

export function ChatInput() {
  const { prompt, setPrompt, isStreaming, attachments, addAttachment, removeAttachment } = useChatStore();
  const { sendMessage, stopGeneration } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenFilesRef = useRef<Set<string>>(new Set());
  const seenHashesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (attachments.length === 0) {
      seenFilesRef.current.clear();
      seenHashesRef.current.clear();
    }
  }, [attachments.length]);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const processFile = (file: File) => {
    if (attachments.length >= 8) {
      showToast("Maximum 8 attachments allowed.");
      return;
    }
    
    const fileSignature = `${file.name}-${file.size}`;
    if (seenFilesRef.current.has(fileSignature)) {
      showToast("This file has already been attached.");
      return;
    }

    const allowedTypes = [
      'image/', 'application/pdf', 'text/', 'application/vnd.ms-powerpoint', 
      'application/vnd.openxmlformats-officedocument.presentationml', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml', 'text/csv'
    ];
    if (allowedTypes.some(type => file.type.startsWith(type))) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const base64 = event.target.result as string;
          
          console.log(`[processFile] File type: ${file.type}, Signature: ${fileSignature}`);
          
          if (attachments.includes(base64)) {
            console.log(`[processFile] Blocked by exact base64 match`);
            showToast("This file has already been attached.");
            return;
          }

          if (file.type.startsWith('image/')) {
            const hash = await new Promise<string>((resolve) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 9;
                canvas.height = 8;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(base64.length.toString());
                
                ctx.drawImage(img, 0, 0, 9, 8);
                const data = ctx.getImageData(0, 0, 9, 8).data;
                const grays: number[] = [];
                for (let i = 0; i < data.length; i += 4) {
                  grays.push(data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
                }
                
                let h = '';
                for (let y = 0; y < 8; y++) {
                  for (let x = 0; x < 8; x++) {
                    h += grays[y * 9 + x] > grays[y * 9 + x + 1] ? '1' : '0';
                  }
                }
                resolve(h);
              };
              img.onerror = () => resolve(base64.length.toString());
              img.src = base64;
            });

            console.log(`[processFile] Generated dHash for ${file.name}: ${hash}`);
            if (seenHashesRef.current.has(hash)) {
              console.log(`[processFile] Blocked by dHash match: ${hash}`);
              showToast("This image has already been attached.");
              return;
            }
            seenHashesRef.current.add(hash);
          }

          console.log(`[processFile] Added new attachment, adding signature ${fileSignature}`);
          seenFilesRef.current.add(fileSignature);
          addAttachment(base64);
        }
      };
      reader.readAsDataURL(file);
    } else {
      showToast(`File type not allowed: ${file.type}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).slice(0, 8 - attachments.length).forEach(processFile);
    }
  };

  // Global drag state tracker
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
    };
  }, []);

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

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      // Prevent default to avoid pasting the image name/URL into the text box if the browser tries to
      e.preventDefault();
      Array.from(files).slice(0, 8 - attachments.length).forEach(processFile);
    }
  }, [attachments.length]);

  const canSend = (prompt.trim().length > 0 || attachments.length > 0) && !isStreaming;

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className="fixed bottom-6 right-6 z-[9999] bg-[#17171C] border border-[#202027] shadow-2xl rounded-2xl p-4 pr-12 text-zinc-300 max-w-sm flex items-start gap-3"
          >
            <div className="mt-0.5 text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <p className="text-sm font-medium leading-relaxed">{toastMessage}</p>
            <button 
              onClick={() => setToastMessage(null)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible Full-Screen Dropzone Overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-[9999] bg-purple-500/10 backdrop-blur-[2px] flex items-center justify-center border-4 border-dashed border-purple-500/50 m-4 rounded-3xl transition-all"
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            
            const dt = e.dataTransfer || e.nativeEvent?.dataTransfer;
            
            if (dt?.files && dt.files.length > 0) {
              Array.from(dt.files).slice(0, 8 - attachments.length).forEach(processFile);
            } else {
              let draggedUrl = null;
              
              const html = dt?.getData('text/html');
              if (html) {
                const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (match && match[1]) {
                  draggedUrl = match[1];
                  if (draggedUrl.startsWith('//')) draggedUrl = 'https:' + draggedUrl;
                }
              }

              if (!draggedUrl) {
                const uriList = dt?.getData('text/uri-list');
                if (uriList) {
                  draggedUrl = uriList.split('\n').find(line => line.trim().startsWith('http'));
                }
              }
              
              if (draggedUrl && attachments.length < 8) {
                const urlToAdd = draggedUrl.trim();
                if (attachments.includes(urlToAdd)) {
                  showToast("This link has already been attached.");
                } else {
                  addAttachment(urlToAdd);
                }
              } else if (draggedUrl) {
                showToast("Maximum 8 attachments allowed.");
              } else {
                showToast("No file or valid URL found to attach.");
              }
            }
          }}
        >
          <div className="bg-[#17171C] text-purple-400 px-8 py-4 rounded-2xl shadow-2xl font-medium flex items-center gap-3 text-lg pointer-events-none">
             <Plus size={24} /> Drop your file here
          </div>
        </div>
      )}

    <div className="w-full px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Main input pill */}
        <div 
          className={`relative flex flex-col bg-[#17171C] border ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-[#202027]'} rounded-2xl overflow-hidden focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all shadow-lg shadow-black/20`}
        >
          {/* Hidden file input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,.pdf,.txt,.doc,.docx,.ppt,.pptx,.csv" 
            multiple
            className="hidden" 
          />

          {/* Attachment Preview Row */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pt-4 pb-2 flex flex-wrap gap-3"
              >
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative inline-block group">
                    <img 
                      src={att} 
                      alt={`Attachment ${idx}`} 
                      className="h-16 w-16 object-cover rounded-lg border border-[#202027] bg-zinc-800" 
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'%3E%3C/path%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'%3E%3C/path%3E%3C/svg%3E";
                        e.currentTarget.className = "h-16 w-16 object-none rounded-lg border border-[#202027] bg-zinc-800";
                      }}
                    />
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="absolute -top-2 -right-2 bg-[#202027] text-zinc-400 hover:text-white p-1 rounded-full border border-zinc-700 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
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
    </>
  );
}
