import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, Image, Code2, Bug, FileText } from 'lucide-react';
import { chatApi } from '../../services/api';
import { useChatStore } from './useChatStore';
import { MessageList } from '../../components/chat/MessageList';
import { ChatInput } from '../../components/chat/ChatInput';
import { TopNav } from '../../components/layout/TopNav';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

const STARTER_PROMPTS = [
  { icon: Image, title: 'Generate image', desc: 'Create visuals for your project' },
  { icon: Code2, title: 'Write code', desc: 'Build a new feature or component' },
  { icon: Bug, title: 'Debug issue', desc: 'Fix errors or performance problems' },
  { icon: FileText, title: 'Review file', desc: 'Get feedback on your code' }
];

export default function ChatPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const { messages, setMessages, setActiveMissionId } = useChatStore();

  // Set active mission id when URL changes
  useEffect(() => {
    setActiveMissionId(missionId || null);
  }, [missionId, setActiveMissionId]);

  // Fetch messages if we have a missionId
  const { isLoading } = useQuery({
    queryKey: ['messages', missionId],
    queryFn: () => (missionId ? chatApi.getMessages(missionId) : Promise.resolve([])),
    enabled: !!missionId,
  });

  // Sync fetched messages with Zustand store on successful load
  useEffect(() => {
    const fetchMsgs = async () => {
      if (missionId) {
        try {
          const msgs = await chatApi.getMessages(missionId);
          setMessages(msgs);
        } catch (error) {
          console.error('Failed to load messages', error);
        }
      } else {
        setMessages([]);
      }
    };
    fetchMsgs();
  }, [missionId, setMessages]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-[#0A0A0B] relative overflow-hidden">
        <TopNav />
        
        {/* Scrollable message area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-start h-full gap-8 text-center pt-24 px-4">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-2">
                  <Bot size={28} className="text-white" />
                </div>
                <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">How can I help you today?</h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full mt-8">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => useChatStore.getState().setPrompt(prompt.title)}
                    className="flex flex-col items-start p-4 rounded-2xl bg-[#17171C] border border-[#202027] hover:border-[#202027] hover:bg-[#202027] transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <prompt.icon size={16} className="text-zinc-400 group-hover:text-purple-400 transition-colors" />
                      <span className="font-medium text-zinc-200">{prompt.title}</span>
                    </div>
                    <span className="text-sm text-zinc-500">{prompt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 pb-4">
              <MessageList messages={messages} isLoading={isLoading && messages.length === 0} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/95 to-transparent pt-6 relative z-10">
          <ChatInput />
        </div>
      </div>
    </ErrorBoundary>
  );
}
