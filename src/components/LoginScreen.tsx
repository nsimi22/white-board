import { useState, useEffect } from 'react';
import { LayoutGrid, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { login, setupPassword, getAuthStatus } from '../api/auth';
import { useAuthStore } from '../store/useStore';

type Mode = 'loading' | 'setup' | 'login';

export default function LoginScreen() {
  const { setSession } = useAuthStore();
  const [mode, setMode] = useState<Mode>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    getAuthStatus()
      .then(({ configured }) => setMode(configured ? 'login' : 'setup'))
      .catch(() => setMode('login'));
  }, []);

  const ADMIN_EMAILS = ['nick.simi@sunpower.com', 'landon.blume@sunpower.com'];
  const isSunPower = email.toLowerCase().endsWith('@sunpower.com');
  const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const resp =
        mode === 'setup'
          ? await setupPassword(email, password)
          : await login(email, password);

      setSession({ token: resp.token, email: resp.email, isAdmin: resp.isAdmin });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? err.message
          : 'Something went wrong.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'loading') {
    return (
      <div className="h-screen bg-[#080d16] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#080d16] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <LayoutGrid size={28} className="text-indigo-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100">Roadmap</h1>
          <p className="text-sm text-slate-500 mt-1">SunPower Internal Tool</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#0d1526] border border-[#1e2f57] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1e2f57]">
          {mode === 'setup' ? (
            <>
              <h2 className="text-base font-semibold text-slate-100">First-time Setup</h2>
              <p className="text-xs text-slate-400 mt-1">
                Create the master password. Only authorized administrators can complete setup.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-slate-100">Sign in</h2>
              <p className="text-xs text-slate-400 mt-1">
                Use your <span className="text-indigo-400">@sunpower.com</span> email and the master password.
              </p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@sunpower.com"
              required
              autoFocus
              className="w-full bg-[#162244] border border-[#1e2f57] rounded-lg px-3 py-2.5 text-sm text-slate-100
                         placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
            />
            {email && !isSunPower && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                Only @sunpower.com email addresses are allowed.
              </p>
            )}
            {mode === 'setup' && isSunPower && !isAdminEmail && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                Setup can only be performed by authorized administrators.
              </p>
            )}
            {mode === 'setup' && isAdminEmail && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle size={11} />
                Administrator account recognized.
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {mode === 'setup' ? 'Create Master Password' : 'Master Password'}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder={mode === 'setup' ? 'Min. 8 characters' : '••••••••'}
                required
                className="w-full bg-[#162244] border border-[#1e2f57] rounded-lg px-3 py-2.5 pr-10 text-sm text-slate-100
                           placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {mode === 'setup' && password && password.length < 8 && (
              <p className="text-xs text-amber-400 mt-1">
                Password must be at least 8 characters.
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              submitting ||
              !email ||
              !password ||
              !isSunPower ||
              (mode === 'setup' && (!isAdminEmail || password.length < 8))
            }
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500
                       disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg
                       transition-colors shadow-lg shadow-indigo-900/20"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {mode === 'setup' ? 'Set Master Password' : 'Sign In'}
          </button>

          {/* Mode switcher for setup done */}
          {mode === 'setup' && setupDone && (
            <button
              type="button"
              onClick={() => { setMode('login'); setSetupDone(false); setPassword(''); }}
              className="w-full text-xs text-indigo-400 hover:text-indigo-300 text-center"
            >
              Password set — click to sign in
            </button>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 pb-5">
          <p className="text-center text-xs text-slate-600">
            {mode === 'login' ? (
              <>Need access? Contact{' '}
                <a href="mailto:nick.simi@sunpower.com" className="text-slate-500 hover:text-slate-300">
                  Nick Simi
                </a>
                {' '}or{' '}
                <a href="mailto:landon.blume@sunpower.com" className="text-slate-500 hover:text-slate-300">
                  Landon Blume
                </a>
                {' '}to get the password.
              </>
            ) : (
              'Access restricted to SunPower employees.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
