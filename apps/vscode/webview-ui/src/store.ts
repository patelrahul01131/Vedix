import { create } from 'zustand';
import { vscode } from './utilities/vscode';

interface Message {
  role: 'user' | 'agent' | 'activity';
  text: string;
}

export interface AgentActivity {
  id: string;
  type: 'think' | 'tool';
  title: string;
  status: 'running' | 'done' | 'error';
  details?: string;
  duration?: number;
}

export interface AgentState {
  status: string;
  messages: Array<{ role: string, text: string }>;
  streamingText: string;
  ws: WebSocket | null;
  sessions: any[];
  availableModels: string[];
  currentModel: string;
  activeSessionId: string | null;
  connect: () => void;
  sendMessage: (text: string) => void;
  addMessage: (msg: Message) => void;
  addActivity: (activity: AgentActivity) => void;
  appendToken: (token: string) => void;
  setStatus: (status: string) => void;
  fetchSessions: () => void;
  createSession: () => void;
  fetchModels: () => void;
  setModel: (model: string) => void;
  setActiveSessionId: (id: string | null) => void;
  updateSessionTitle: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  status: 'Idle',
  messages: [],
  streamingText: '',
  ws: null,
  sessions: [],
  availableModels: [],
  currentModel: 'mistral:devstral-2512',
  activeSessionId: null,
  
  setModel: (model) => set({ currentModel: model }),
  
  connect: () => {
    // In production this might come from extension config, but for dev we use localhost:3001
    const ws = new WebSocket('ws://localhost:3001/ws');
    
    ws.onopen = () => {
      set({ status: 'Idle', ws });
      get().fetchSessions();
      get().fetchModels();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sessionsList') {
          set({ sessions: data.payload });
        } else if (data.type === 'modelsList') {
          set({ availableModels: data.payload });
        } else if (data.type === 'status') {
          set({ status: data.payload });
        } else if (data.type === 'message') {
          set({ streamingText: '' }); // Clear streaming text when final message arrives
          get().addMessage(data.payload);
        } else if (data.type === 'token') {
          get().appendToken(data.payload);
        } else if (data.type === 'activity') {
          get().addActivity(data.payload);
        } else if (data.type === 'sessionSwitched') {
          get().setActiveSessionId(data.payload);
        } else if (data.type === 'sessionMessages') {
          set({ messages: data.payload });
        } else if (data.type === 'debugData') {
          console.groupCollapsed(`🤖 [Agent Debug] ${data.payload.phase} (Loop ${data.payload.loopCount})`);
          if (data.payload.payload) {
             console.log('📤 Sending to LLM:', data.payload.payload);
          }
          if (data.payload.newMessages) {
             console.log('📥 Received from LLM:', data.payload.newMessages);
          }
          if (data.payload.responseText) {
             console.log('📝 Generated Text:', data.payload.responseText);
          }
          console.groupEnd();
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onclose = () => {
      set({ status: 'Offline', ws: null });
      // Reconnect after 3 seconds
      setTimeout(() => get().connect(), 3000);
    };
    
    set({ ws });
  },

  sendMessage: (text: string) => {
    const { ws, messages, currentModel, activeSessionId } = get();
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Optimistically update UI
      set({ messages: [...messages, { role: 'user', text }] });
      ws.send(JSON.stringify({ 
        command: 'sendMessage', 
        text,
        model: currentModel,
        sessionId: activeSessionId,
        workspaceRoot: (window as any).WORKSPACE_ROOT || ''
      }));
    } else {
      // Fallback to IPC if WS is disconnected (for local extension execution without server)
      vscode.postMessage({ command: 'sendMessage', text });
    }
  },

  addMessage: (msg: Message) => set((state) => ({ messages: [...state.messages, msg] })),
  
  addActivity: (activity: AgentActivity) => set((state) => {
    const existingIndex = state.messages.findIndex(m => {
      if (m.role !== 'activity') return false;
      try {
        const parsed = JSON.parse(m.text);
        return parsed.id === activity.id;
      } catch (e) {
        return false;
      }
    });

    if (existingIndex >= 0) {
      const newMessages = [...state.messages];
      newMessages[existingIndex] = { role: 'activity', text: JSON.stringify(activity) };
      return { messages: newMessages };
    }
    return { messages: [...state.messages, { role: 'activity', text: JSON.stringify(activity) }] };
  }),

  appendToken: (token: string) => set((state) => ({ streamingText: state.streamingText + token })),

  setStatus: (status: string) => {
    set({ status });
    if (status === 'Idle' || status === 'Completed') {
      set({ streamingText: '' });
    }
  },

  fetchSessions: () => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: 'getSessions' }));
    }
  },

  createSession: () => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: 'createSession' }));
    }
  },

  fetchModels: () => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: 'getModels' }));
    }
  },

  setActiveSessionId: (id: string | null) => {
    set({ activeSessionId: id, messages: [], streamingText: '' });
    if (id) {
      const { ws } = get();
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command: 'getSessionMessages', sessionId: id }));
      }
    }
  },

  updateSessionTitle: (id: string, title: string) => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: 'updateSessionTitle', sessionId: id, title }));
    }
  },

  deleteSession: (id: string) => {
    const { ws, activeSessionId } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: 'deleteSession', sessionId: id }));
      if (activeSessionId === id) {
        set({ activeSessionId: null, messages: [] });
      }
    }
  }
}));
