import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800">
        <Icon size={24} className="text-zinc-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        {description && <p className="text-xs text-zinc-600 mt-1 max-w-xs">{description}</p>}
      </div>
      {action}
    </div>
  );
}
