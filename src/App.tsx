import { useEffect, useState } from 'react';
import {
  Settings,
  RefreshCw,
  LayoutGrid,
  AlertCircle,
  Loader2,
  GitBranch,
  Shield,
  LogOut,
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
    config,
    epics,
    isLoading,
    error,
    isConfigOpen,
    zoom,
    pendingSaves,
    setIsConfigOpen,
    setZoom,
    setError,
  } = useStore();

  const { loadEpics } = useJira();
  const [adminOpen, setAdminOpen] = useState(false);

  // Auto-load epics when config is set and we have none yet
  useEffect(() => {
    if (session && config && epics.length === 0 && !isLoading) {
      loadEpics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, config]);

  // Not authenticated — show login gate
  if (!session) {
    return <LoginScreen />;
  }

  const savingCount = pendingSaves.size;

  return (
    <div className="h-screen flex flex-col bg-[#080d16] text-slate-100 overflow-hidden">
      {/* ── Top nav ── */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-[#1e2f57] bg-[#0d1526] z-30">
        {/* Logo / title */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <LayoutGrid size={15} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-slate-100">Roadmap</span>
        </div>

        {/* Project pill */}
        {config && (
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#162244] border border-[#1e2f57]
                       text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <GitBranch size={12} />
            <span className="font-mono">{config.projectKey}</span>
            {config.projectName && (
              <span className="text-slate-500">· {config.projectName}</span>
            )}
          </button>
        )}

        <div className="flex-1" />

        {/* Save indicator */}
        {savingCount > 0 && (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs">
            <Loader2 size={12} className="animate-spin" />
            Saving {savingCount} change{savingCount > 1 ? 's' : ''}…
          </div>
        )}

        {/* Filters */}
        {config && epics.length > 0 && <Filters />}

        {/* Zoom controls */}
        <div className="flex items-center bg-[#111d35] border border-[#1e2f57] rounded-lg overflow-hidden">
          {ZOOM_LEVELS.map((z, i) => (
            <button
              key={z.key}
              onClick={() => setZoom(z.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors
                          ${i > 0 ? 'border-l border-[#1e2f57]' : ''}
                          ${zoom === z.key
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#162244]'
                          }`}
            >
              {z.label}
            </button>
          ))}
        </div>

        {/* Sync */}
        {config && (
          <button
            onClick={loadEpics}
            disabled={isLoading}
            title="Sync from Jira"
            className="p-2 rounded-lg border border-[#1e2f57] text-slate-400 hover:text-slate-200
                       hover:bg-[#162244] disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Admin button (admins only) */}
        {session.isAdmin && (
          <button
            onClick={() => setAdminOpen(true)}
            title="Admin Panel"
            className="p-2 rounded-lg border border-[#1e2f57] text-indigo-400 hover:text-indigo-300
                       hover:bg-[#162244] transition-colors"
          >
            <Shield size={15} />
          </button>
        )}

        {/* Jira settings */}
        <button
          onClick={() => setIsConfigOpen(true)}
          title="Jira Settings"
          className="p-2 rounded-lg border border-[#1e2f57] text-slate-400 hover:text-slate-200
                     hover:bg-[#162244] transition-colors"
        >
          <Settings size={15} />
        </button>

        {/* Sign out */}
        <button
          onClick={() => setSession(null)}
          title={`Sign out (${session.email})`}
          className="p-2 rounded-lg border border-[#1e2f57] text-slate-500 hover:text-rose-400
                     hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-950/50 border-b border-red-800/50 text-red-300 text-sm">
          <AlertCircle size={15} />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {!config ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30
                          flex items-center justify-center">
            <LayoutGrid size={32} className="text-indigo-400" />
          </div>
          <div className="text-center max-w-sm">
            <h1 className="text-xl font-semibold text-slate-100 mb-2">
              Connect your Jira project
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Add your Jira domain, email, and API token to pull epics and stories
              onto a fully interactive timeline you can drag and resize.
            </p>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500
                       text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-900/30"
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

      {/* ── Modals ── */}
      {isConfigOpen && <ConfigPanel />}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
