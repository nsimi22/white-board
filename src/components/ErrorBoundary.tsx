import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 px-6
                      bg-slate-50 dark:bg-[#080d16] text-slate-900 dark:text-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700/40
                        flex items-center justify-center">
          <AlertTriangle size={26} className="text-red-600 dark:text-red-400" />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-lg font-semibold mb-1">Something went wrong</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>
          <pre className="text-left text-xs bg-slate-100 dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e2f57]
                          rounded-lg p-3 text-red-600 dark:text-red-400 overflow-auto max-h-36 mb-4">
            {error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500
                       text-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
