import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { MessageSkeleton } from '../common/LoadingStates';
import type { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) return <MessageSkeleton />;

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-4">
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <MessageBubble
            key={`${message.role}-${index}-${message.createdAt || index}`}
            message={message}
            index={index}
          />
        ))}
      </AnimatePresence>
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
