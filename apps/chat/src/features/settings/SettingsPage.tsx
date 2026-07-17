import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Mail, Image as ImageIcon, Loader2 } from 'lucide-react';
import { chatApi } from '../../services/api';
import type { ConnectorKey } from '../../types';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: connectors, isLoading } = useQuery({
    queryKey: ['connectors'],
    queryFn: chatApi.getConnectors,
  });

  const mutation = useMutation({
    mutationFn: ({ connector, enabled }: { connector: ConnectorKey; enabled: boolean }) =>
      chatApi.updateConnector(connector, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
    },
  });

  const handleGmailToggle = () => {
    if (!connectors?.gmail) {
      // Redirect to backend OAuth flow
      window.location.href = 'http://localhost:3002/api/web/oauth/connect/google';
    } else {
      mutation.mutate({ connector: 'gmail', enabled: false });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0d0d] p-6 lg:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header>
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <Settings className="text-zinc-400" /> Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your account and connected services.</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Integrations</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
            
            {/* Gmail Connector */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                  <Mail className="text-red-400" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-200">Gmail</h3>
                  <p className="text-xs text-zinc-500">Allow Vedix to read and send emails on your behalf.</p>
                </div>
              </div>
              <button
                onClick={handleGmailToggle}
                disabled={mutation.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  connectors?.gmail ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    connectors?.gmail ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Canva Connector */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
                  <ImageIcon className="text-cyan-400" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-200">Canva</h3>
                  <p className="text-xs text-zinc-500">Connect to your Canva designs and assets.</p>
                </div>
              </div>
              <button
                onClick={() => mutation.mutate({ connector: 'canva', enabled: !connectors?.canva })}
                disabled={mutation.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  connectors?.canva ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    connectors?.canva ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
