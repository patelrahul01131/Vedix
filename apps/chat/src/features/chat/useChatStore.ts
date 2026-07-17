import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ChatStore, Message } from '../../types';

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        activeMissionId: null,
        messages: [],
        isStreaming: false,
        isSidebarOpen: true,
        currentModel: 'mistral:mistral-large-2512',
        availableModels: [],
        prompt: '',

        // Actions
        setActiveMissionId: (id: string | null) => set({ activeMissionId: id }),
        setMessages: (msgs: Message[]) => set({ messages: msgs }),
        appendMessage: (msg: Message) => set((state) => ({ messages: [...state.messages, msg] })),
        updateLastMessage: (content: string) =>
          set((state) => {
            const msgs = [...state.messages];
            if (msgs.length > 0) {
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
            }
            return { messages: msgs };
          }),
        appendActivity: (activity: any) =>
          set((state) => {
            const msgs = [...state.messages];
            if (msgs.length > 0) {
              const lastMsg = { ...msgs[msgs.length - 1] };
              if (!lastMsg.activities) lastMsg.activities = [];
              
              // Handle update or append
              const existingIdx = lastMsg.activities.findIndex(a => a.id === activity.id);
              if (existingIdx >= 0) {
                lastMsg.activities[existingIdx] = { ...lastMsg.activities[existingIdx], ...activity };
              } else {
                lastMsg.activities.push(activity);
              }
              msgs[msgs.length - 1] = lastMsg;
            }
            return { messages: msgs };
          }),
        setIsStreaming: (val: boolean) => set({ isStreaming: val }),
        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        setSidebarOpen: (val: boolean) => set({ isSidebarOpen: val }),
        setCurrentModel: (model: string) => set({ currentModel: model }),
        setAvailableModels: (models: string[]) => set({ availableModels: models }),
        setPrompt: (val: string) => set({ prompt: val }),
        resetChat: () =>
          set({ activeMissionId: null, messages: [], isStreaming: false, prompt: '' }),
      }),
      {
        name: 'vedix-chat-store',
        partialize: (state) => ({
          currentModel: state.currentModel,
          isSidebarOpen: state.isSidebarOpen,
        }),
      }
    )
  )
);
