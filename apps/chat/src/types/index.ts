// All TypeScript types for the Vedix Chat application
export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  activities?: any[];
  attachments?: string[];
}

export interface Mission {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  displayName: string;
  description?: string;
}

export interface ConnectorState {
  gmail: boolean;
  canva: boolean;
}

export type ConnectorKey = 'gmail' | 'canva';

export interface ChatStore {
  // State
  activeMissionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  isSidebarOpen: boolean;
  currentModel: string;
  availableModels: string[];
  prompt: string;
  attachments: string[];

  // Actions
  setActiveMissionId: (id: string | null) => void;
  setMessages: (msgs: Message[]) => void;
  appendMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  appendActivity: (activity: any) => void;
  setIsStreaming: (val: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (val: boolean) => void;
  setCurrentModel: (model: string) => void;
  setAvailableModels: (models: string[]) => void;
  setPrompt: (val: string) => void;
  addAttachment: (val: string) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  resetChat: () => void;
}

export interface ApiError {
  message: string;
  status?: number;
}
