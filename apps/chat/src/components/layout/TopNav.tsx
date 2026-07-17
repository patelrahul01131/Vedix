import { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Zap, Menu } from 'lucide-react';
import { useChatStore } from '../../features/chat/useChatStore';
import { chatApi } from '../../services/api';

function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    mistral: 'text-orange-400',
    openrouter: 'text-blue-400',
    google: 'text-emerald-400',
    anthropic: 'text-violet-400',
  };
  return colors[provider.toLowerCase()] || 'text-zinc-400';
}

function getProviderBadge(provider: string): string {
  const badges: Record<string, string> = {
    mistral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    openrouter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    google: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    anthropic: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  };
  return badges[provider.toLowerCase()] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
}

export function TopNav() {
  const { currentModel, setCurrentModel, setAvailableModels, toggleSidebar, isSidebarOpen } =
    useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: models } = useQuery<string[]>({
    queryKey: ['models'],
    queryFn: chatApi.getModels,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (models) setAvailableModels(models);
  }, [models, setAvailableModels]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [currentProvider, currentModelName] = currentModel.split(':');
  const displayName = currentModelName || currentModel;

  // Group models by provider
  const grouped = (models || []).reduce<Record<string, string[]>>((acc, m) => {
    const [prov] = m.split(':');
    if (!acc[prov]) acc[prov] = [];
    acc[prov].push(m);
    return acc;
  }, {});

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-[#17171C] bg-[#0A0A0B]/80 backdrop-blur-sm shrink-0 sticky top-0 z-10">
      {/* Left: hamburger + logo/title */}
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#17171C] transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-purple-500" />
          <span className="text-sm font-semibold text-zinc-100 hidden sm:inline">Vedix</span>
        </div>
      </div>

      {/* Center: Model Selector */}
      <div className="relative flex-1 flex justify-center" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#17171C] hover:bg-[#202027] border border-[#202027] text-sm text-zinc-300 transition-all shadow-sm"
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getProviderBadge(currentProvider)}`}
          >
            {currentProvider}
          </span>
          <span className="font-medium text-white max-w-[160px] truncate">{displayName}</span>
          <ChevronDown
            size={14}
            className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 w-72 bg-[#17171C] border border-[#202027] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50"
            >
              <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
                {Object.entries(grouped).map(([provider, provModels]) => (
                  <div key={provider} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest ${getProviderColor(provider)}`}
                      >
                        {provider}
                      </span>
                    </div>
                    {provModels.map((model) => {
                      const [, name] = model.split(':');
                      const isActive = model === currentModel;
                      return (
                         <button
                          key={model}
                          onClick={() => {
                            setCurrentModel(model);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                            isActive
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'text-zinc-400 hover:bg-[#202027] hover:text-zinc-200'
                          }`}
                        >
                          <span className="font-medium truncate">{name || model}</span>
                          {isActive && <Check size={14} className="text-purple-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Status indicator */}
      <div className="flex items-center justify-end w-[80px]">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="hidden sm:inline">Connected</span>
        </div>
      </div>
    </header>
  );
}
