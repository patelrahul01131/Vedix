import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, Search, Settings, ChevronLeft,
  Loader2, User, HardDrive, Edit2, Trash2, Check, X
} from 'lucide-react';
import { chatApi } from '../../services/api';
import { useChatStore } from '../../features/chat/useChatStore';
import type { Mission } from '../../types';

export function Sidebar() {
  const navigate = useNavigate();
  const { missionId } = useParams<{ missionId: string }>();
  const { isSidebarOpen, toggleSidebar, resetChat, setActiveMissionId, setMessages } = useChatStore();
  const [search, setSearch] = useState('');

  const { data: history, isLoading, refetch } = useQuery<Mission[]>({
    queryKey: ['history'],
    queryFn: chatApi.getHistory,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartEdit = (e: React.MouseEvent, mission: Mission) => {
    e.stopPropagation();
    setEditingId(mission.id);
    setEditTitle(mission.title);
  };

  const handleSaveTitle = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await chatApi.renameMission(id, editTitle.trim());
      setEditingId(null);
      refetch();
    } catch (err) {
      console.error('Failed to rename', err);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await chatApi.deleteMission(id);
      if (missionId === id) {
        handleNewChat();
      }
      refetch();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const filteredHistory = history?.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = useCallback(() => {
    resetChat();
    navigate('/chat');
  }, [resetChat, navigate]);

  const handleSelectMission = useCallback(
    (id: string) => {
      setMessages([]);
      setActiveMissionId(id);
      navigate(`/chat/${id}`);
    },
    [setActiveMissionId, setMessages, navigate]
  );

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <>
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[300px] shrink-0 flex flex-col h-full bg-[#101014] border-r border-[#17171C] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#17171C]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <span className="text-white text-xs font-bold">V</span>
                </div>
                <span className="text-sm font-semibold text-zinc-100 tracking-tight">Vedix</span>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="px-3 pt-3">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-medium transition-all shadow-lg shadow-purple-900/20 group"
              >
                <div className="flex items-center gap-2.5">
                  <Plus size={16} className="shrink-0" />
                  New Chat
                </div>
                <div className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded-md bg-white/20 text-[10px]">
                  ⌘K
                </div>
              </button>
            </div>

            {/* Search */}
            <div className="px-3 pt-2 pb-1">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#17171C] border border-[#202027] rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
                />
              </div>
            </div>

            {/* History */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-zinc-600" />
                </div>
              ) : filteredHistory && filteredHistory.length > 0 ? (
                <>
                  <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-wider px-2 py-2">
                    Recent
                  </p>
                  {filteredHistory.map((mission) => (
                    <div
                      key={mission.id}
                      onClick={() => handleSelectMission(mission.id)}
                      className={`w-full flex items-start justify-between px-3 py-2.5 rounded-xl text-left transition-all group cursor-pointer ${
                        missionId === mission.id
                          ? 'bg-[#202027] text-white shadow-sm'
                          : 'text-[#A1A1AA] hover:bg-[#17171C] hover:text-white'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <MessageSquare
                          size={15}
                          className={`shrink-0 mt-0.5 ${missionId === mission.id ? 'text-purple-400' : 'text-zinc-500'}`}
                        />
                        <div className="flex-1 min-w-0">
                          {editingId === mission.id ? (
                            <input
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle(e, mission.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-medium bg-[#17171C] border border-[#202027] rounded px-1 py-0.5 w-full text-white outline-none focus:border-purple-500 transition-colors"
                            />
                          ) : (
                            <p className="text-sm font-medium truncate">{mission.title}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-zinc-500">
                              {formatTime(mission.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {editingId === mission.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={(e) => handleSaveTitle(e, mission.id)} className="p-1 rounded text-green-500 hover:bg-green-500/20 transition-colors">
                            <Check size={14} />
                          </button>
                          <button onClick={handleCancelEdit} className="p-1 rounded text-zinc-500 hover:bg-zinc-700 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                          <button onClick={(e) => handleStartEdit(e, mission)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors" aria-label="Rename chat">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={(e) => handleDelete(e, mission.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors" aria-label="Delete chat">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <MessageSquare size={22} className="text-zinc-800" />
                  <p className="text-xs text-zinc-700">No conversations yet</p>
                  <p className="text-[10px] text-zinc-800">Start a new chat to begin</p>
                </div>
              )}
            </div>

            {/* Bottom Actions - User Profile */}
            <div className="border-t border-[#17171C] p-3 space-y-1">
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#17171C] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center">
                    <User size={16} className="text-zinc-200" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">Developer</span>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <HardDrive size={10} /> Free Plan
                    </span>
                  </div>
                </div>
                <Settings size={16} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Collapsed state — show toggle button */}
      {!isSidebarOpen && (
        <div className="flex flex-col gap-2 pt-3 px-2 border-r border-[#17171C] h-full bg-[#101014]">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900 transition-colors"
            aria-label="Expand sidebar"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900 transition-colors"
            aria-label="New chat"
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </>
  );
}
