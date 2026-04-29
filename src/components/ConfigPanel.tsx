import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchProjects, validateConfig } from '../api/jira';
import { JiraConfig, JiraProject } from '../types/jira';

export default function ConfigPanel() {
  const { config, setConfig, setIsConfigOpen } = useStore();

  const [domain, setDomain] = useState(config?.domain ?? '');
  const [email, setEmail] = useState(config?.email ?? '');
  const [token, setToken] = useState(config?.apiToken ?? '');
  const [projectKey, setProjectKey] = useState(config?.projectKey ?? '');
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (config) {
      setDomain(config.domain);
      setEmail(config.email);
      setToken(config.apiToken);
      setProjectKey(config.projectKey);
    }
  }, [config]);

  const cleanDomain = (raw: string) => raw.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

  async function handleValidate() {
    setValidating(true);
    setValidated(false);
    setValidationError(null);
    setProjects([]);

    const draft: JiraConfig = { domain: cleanDomain(domain), email: email.trim(), apiToken: token.trim(), projectKey: '' };
    const ok = await validateConfig(draft);

    if (!ok) {
      setValidationError('Could not authenticate. Check your domain, email, and API token.');
      setValidating(false);
      return;
    }

    setValidated(true);
    setLoadingProjects(true);
    try {
      const list = await fetchProjects(draft);
      setProjects(list.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      setValidationError('Authenticated but failed to load projects.');
    } finally {
      setLoadingProjects(false);
      setValidating(false);
    }
  }

  function handleSave() {
    const selected = projects.find((p) => p.key === projectKey);
    setConfig({ domain: cleanDomain(domain), email: email.trim(), apiToken: token.trim(), projectKey, projectName: selected?.name });
    setIsConfigOpen(false);
  }

  const domainHint = domain && !domain.includes('.') ? `${domain}.atlassian.net` : cleanDomain(domain);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e2f57] rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57]">
          <div>
            <h2 className="text-lg font-semibold">Connect Jira</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Credentials are stored locally and never leave your machine.
            </p>
          </div>
          <button
            onClick={() => setIsConfigOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1e2f57] text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jira Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => { setDomain(e.target.value); setValidated(false); }}
              placeholder="acme.atlassian.net"
              className="w-full bg-slate-50 dark:bg-[#162244] border border-slate-200 dark:border-[#1e2f57] rounded-lg px-3 py-2.5 text-sm
                         text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
                         focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
            />
            {domain && domain !== domainHint && (
              <p className="text-xs text-slate-500 mt-1">Will use: <span className="text-indigo-600 dark:text-indigo-400">{domainHint}</span></p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setValidated(false); }}
              placeholder="you@company.com"
              className="w-full bg-slate-50 dark:bg-[#162244] border border-slate-200 dark:border-[#1e2f57] rounded-lg px-3 py-2.5 text-sm
                         text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
                         focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
            />
          </div>

          {/* API Token */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              API Token
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-normal"
              >
                Get a token ↗
              </a>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => { setToken(e.target.value); setValidated(false); }}
                placeholder="••••••••••••••••••••••"
                className="w-full bg-slate-50 dark:bg-[#162244] border border-slate-200 dark:border-[#1e2f57] rounded-lg px-3 py-2.5 pr-10 text-sm
                           text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
                           focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleValidate}
            disabled={!domain || !email || !token || validating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
                       bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            {validating && <Loader2 size={16} className="animate-spin" />}
            {validating ? 'Connecting…' : validated ? 'Re-validate' : 'Connect to Jira'}
          </button>

          {validated && !validationError && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
              <CheckCircle size={16} /><span>Connected successfully</span>
            </div>
          )}
          {validationError && (
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><span>{validationError}</span>
            </div>
          )}

          {/* Project picker */}
          {(validated || loadingProjects) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Project</label>
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 size={14} className="animate-spin" />Loading projects…
                </div>
              ) : (
                <select
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#162244] border border-slate-200 dark:border-[#1e2f57] rounded-lg px-3 py-2.5 text-sm
                             text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                >
                  <option value="">— Select a project —</option>
                  {projects.map((p) => (
                    <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={() => setIsConfigOpen(false)}
            className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200
                       rounded-lg hover:bg-slate-100 dark:hover:bg-[#1e2f57] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!validated || !projectKey}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save & Load Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}
