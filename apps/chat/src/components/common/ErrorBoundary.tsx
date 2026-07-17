import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={26} className="text-red-400" />
          </div>
          <div className="text-center max-w-sm">
            <h3 className="text-base font-semibold text-white mb-1">Something went wrong</h3>
            <p className="text-sm text-zinc-500">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
