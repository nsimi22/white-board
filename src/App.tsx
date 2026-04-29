import { useEffect, useState } from 'react';
import {
  Settings, RefreshCw, LayoutGrid, AlertCircle, Loader2,
  GitBranch, Shield, LogOut, Sun, Moon,
} from 'lucide-react';
import { useStore, useAuthStore } from './store/useStore';
import { useJira } from './hooks/useJira';
import ConfigPanel from './components/ConfigPanel';
import RoadmapTimeline from './components/RoadmapTimeline';
import Filters from './components/Filters';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import { ZoomLevel } from './types/jira';

const ZOOM_LEVELS: { key: ZoomLevel; label: string }[] = [
  { key: 'day',     label: 'Day' },
  { key: 'week',    label: 'Week' },
  { key: 'month',   label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
];

export default function App() {
  const { session, setSession } = useAuthStore();
  const {
    config, epics, isLoading, error, isConfigOpen, zoom, pendingSaves,
    theme, setIsConfigOpen, setZoom, setError, toggleTheme,
  } = useStore();

  const { loadEpics } = useJira();
  const [adminOpen, setAdminOpen] = useState(false);

  // Apply dark/light class to <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Auto-load epics when config arrives
  useEffect(() => {
    if (session && config && epics.length === 0 && !isLoading) {
      loadEpics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, config]);

  if (!session) return <LoginScreen />;

  const savingCount = pendingSaves.size;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#080d16] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* ── Top nav ── */}
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-[#1e2f57] bg-white dark:bg-[#0d1526] z-30">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <LayoutGrid size={15} className="text-white" />
          </div>
          <span className="font-semibold text-sm">Roadmap</span>
        </div>

        {/* Project pill */}
        {config && (
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                       bg-slate-100 dark:bg-[#162244] border border-slate-200 dark:border-[#1e2f57]
                       text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
                       hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
          >
            <GitBranch size={12} />
            <span className="font-mono">{config.projectKey}</span>
            {config.projectName && (
              <span className="text-slate-400 dark:text-slate-500">· {config.projectName}</span>
            )}
          </button>
        )}

        <div className="flex-1" />

        {/* Saving indicator */}
        {savingCount > 0 && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
            <Loader2 size={12} className="animate-spin" />
            Saving {savingCount} change{savingCount > 1 ? 's' : ''}…
          </div>
        )}

        {/* Filters */}
        {config && epics.length > 0 && <Filters />}

        {/* Zoom controls */}
        <div className="flex items-center bg-slate-100 dark:bg-[#111d35] border border-slate-200 dark:border-[#1e2f57] rounded-lg overflow-hidden">
          {ZOOM_LEVELS.map((z, i) => (
            <button
              key={z.key}
              onClick={() => setZoom(z.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors
                          ${i > 0 ? 'border-l border-slate-200 dark:border-[#1e2f57]' : ''}
                          ${zoom === z.key
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#162244]'
                          }`}
            >
              {z.label}
            </button>
          ))}
        </div>

        {/* ── Refresh button (labeled) ── */}
        {config && (
          <button
            onClick={loadEpics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       border border-slate-200 dark:border-[#1e2f57]
                       bg-white dark:bg-[#0d1526] text-slate-600 dark:text-slate-300
                       hover:bg-slate-50 dark:hover:bg-[#162244] hover:text-slate-900 dark:hover:text-white
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        )}

        {/* Admin (admins only) */}
        {session.isAdmin && (
          <button
            onClick={() => setAdminOpen(true)}
            title="Admin Panel"
            className="p-2 rounded-lg border border-slate-200 dark:border-[#1e2f57]
                       text-indigo-500 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#162244] transition-colors"
          >
            <Shield size={15} />
          </button>
        )}

        {/* Jira settings */}
        <button
          onClick={() => setIsConfigOpen(true)}
          title="Jira Settings"
          className="p-2 rounded-lg border border-slate-200 dark:border-[#1e2f57]
                     text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200
                     hover:bg-slate-100 dark:hover:bg-[#162244] transition-colors"
        >
          <Settings size={15} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg border border-slate-200 dark:border-[#1e2f57]
                     text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200
                     hover:bg-slate-100 dark:hover:bg-[#162244] transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Sign out */}
        <button
          onClick={() => setSession(null)}
          title={`Sign out (${session.email})`}
          className="p-2 rounded-lg border border-slate-200 dark:border-[#1e2f57]
                     text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-rose-400
                     hover:bg-red-50 dark:hover:bg-rose-500/10 hover:border-red-200 dark:hover:border-rose-500/30 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5
                        bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800/50
                        text-red-700 dark:text-red-300 text-sm">
          <AlertCircle size={15} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {!config ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 bg-slate-50 dark:bg-[#080d16]">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
            <LayoutGrid size={32} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-center max-w-sm">
            <h1 className="text-xl font-semibold mb-2">Connect your Jira project</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Add your Jira domain, email, and API token to pull epics and stories
              onto a fully interactive timeline you can drag and resize.
            </p>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500
                       text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <Settings size={16} />
            Connect Jira
          </button>
        </div>
      ) : isLoading && epics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p className="text-sm">Loading epics from {config.projectName ?? config.projectKey}…</p>
        </div>
      ) : (
        <RoadmapTimeline />
      )}

      {isConfigOpen && <ConfigPanel />}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
