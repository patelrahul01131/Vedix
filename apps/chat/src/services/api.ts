import axios from 'axios';
import type { Mission, Message, ConnectorKey } from '../types';

const api = axios.create({
  baseURL: '/api/web',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Intercept responses for error normalization
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 401) {
      // Unauthorized — could redirect to login
    }
    return Promise.reject(err);
  }
);

export const chatApi = {
  // Get all conversations
  getHistory: async (): Promise<Mission[]> => {
    const res = await api.get('/chat/history');
    return res.data.history;
  },

  // Get messages for a specific conversation
  getMessages: async (missionId: string): Promise<Message[]> => {
    const res = await api.get(`/chat/history/${missionId}`);
    return res.data.messages.map((m: any) => ({
      id: m.id,
      role: m.role === 'agent' ? 'assistant' : m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
  },

  // Rename a conversation
  renameMission: async (missionId: string, title: string) => {
    const res = await api.put(`/chat/history/${missionId}`, { title });
    return res.data.mission;
  },

  // Delete a conversation
  deleteMission: async (missionId: string) => {
    const res = await api.delete(`/chat/history/${missionId}`);
    return res.data;
  },

  // Get available models
  getModels: async (): Promise<string[]> => {
    const res = await api.get('/chat/models');
    return res.data.models;
  },

  // Get connector status
  getConnectors: async () => {
    const res = await api.get('/user/connectors');
    return res.data.connectors;
  },

  // Toggle a connector
  updateConnector: async (connector: ConnectorKey, enabled: boolean) => {
    const res = await api.post('/user/connectors', { connector, enabled });
    return res.data;
  },
};

export default api;
