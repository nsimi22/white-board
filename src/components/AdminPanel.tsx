import { useState } from 'react';
import {
  X, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Shield,
  Mail, KeyRound, Lock, Unlock,
} from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { changePassword, saveSmtp, testSmtp, decryptEmailPayload } from '../api/auth';

type Tab = 'password' | 'smtp' | 'decrypt';

interface Props {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: Props) {
  const { session } = useAuthStore();
  const token = session!.token;

  const [tab, setTab] = useState<Tab>('password');

  // ── Change password ──────────────────────────────────────────────────────────
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);
    if (newPass !== confirmPass) { setPassError('New passwords do not match.'); return; }
    if (newPass.length < 8) { setPassError('Password must be at least 8 characters.'); return; }

    setChangingPass(true);
    try {
      await changePassword(token, curPass, newPass);
      setPassSuccess(true);
      setCurPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setPassError(e.response?.data?.error ?? e.message ?? 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  }

  // ── SMTP ─────────────────────────────────────────────────────────────────────
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpError, setSmtpError] = useState<string | null>(null);
  const [smtpSuccess, setSmtpSuccess] = useState<string | null>(null);

  async function handleSaveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setSmtpError(null); setSmtpSuccess(null);
    setSavingSmtp(true);
    try {
      await saveSmtp(token, {
        host: smtpHost, port: Number(smtpPort), secure: smtpSecure,
        user: smtpUser, pass: smtpPass, from: smtpFrom || undefined,
      });
      setSmtpSuccess('SMTP settings saved.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setSmtpError(e.response?.data?.error ?? e.message ?? 'Failed to save.');
    } finally {
      setSavingSmtp(false);
    }
  }

  async function handleTestSmtp() {
    setSmtpError(null); setSmtpSuccess(null);
    setTestingSmtp(true);
    try {
      await testSmtp(token);
      setSmtpSuccess('SMTP connection verified!');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setSmtpError(e.response?.data?.error ?? e.message ?? 'Test failed.');
    } finally {
      setTestingSmtp(false);
    }
  }

  // ── Decrypt ──────────────────────────────────────────────────────────────────
  const [encVal, setEncVal] = useState('');
  const [encKey, setEncKey] = useState('');
  const [encIv, setEncIv] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  async function handleDecrypt(e: React.FormEvent) {
    e.preventDefault();
    setDecryptError(null); setDecrypted(null);
    setDecrypting(true);
    try {
      const result = await decryptEmailPayload(token, encVal, encKey, encIv);
      setDecrypted(result);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setDecryptError(e.response?.data?.error ?? e.message ?? 'Decryption failed.');
    } finally {
      setDecrypting(false);
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'password', label: 'Change Password', icon: <KeyRound size={14} /> },
    { key: 'smtp', label: 'Email / SMTP', icon: <Mail size={14} /> },
    { key: 'decrypt', label: 'Decrypt Email', icon: <Unlock size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0d1526] border border-[#1e2f57] rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2f57] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold">Admin Panel</h2>
              <p className="text-xs text-slate-500">{session!.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1e2f57] text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e2f57] flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors
                          ${tab === t.key
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                          }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Change Password ── */}
          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-xs text-slate-400">
                The new password applies to all <span className="text-indigo-400">@sunpower.com</span> users.
                Both admins will receive an encrypted email notification with the new password.
              </p>

              <Field label="Current Password">
                <PasswordInput
                  value={curPass} onChange={setCurPass}
                  show={showCur} onToggle={() => setShowCur(!showCur)}
                  placeholder="Current master password"
                />
              </Field>

              <Field label="New Password">
                <PasswordInput
                  value={newPass} onChange={setNewPass}
                  show={showNew} onToggle={() => setShowNew(!showNew)}
                  placeholder="Min. 8 characters"
                />
              </Field>

              <Field label="Confirm New Password">
                <PasswordInput
                  value={confirmPass} onChange={setConfirmPass}
                  show={showNew} onToggle={() => setShowNew(!showNew)}
                  placeholder="Repeat new password"
                />
                {confirmPass && newPass !== confirmPass && (
                  <p className="text-xs text-rose-400 mt-1">Passwords do not match.</p>
                )}
              </Field>

              {passError && <StatusMsg type="error">{passError}</StatusMsg>}
              {passSuccess && (
                <StatusMsg type="success">
                  Password changed. Email notifications sent to both administrators.
                </StatusMsg>
              )}

              <button
                type="submit"
                disabled={changingPass || !curPass || !newPass || !confirmPass || newPass !== confirmPass}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500
                           disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {changingPass && <Loader2 size={14} className="animate-spin" />}
                <Lock size={14} />
                Change Master Password
              </button>
            </form>
          )}

          {/* ── SMTP ── */}
          {tab === 'smtp' && (
            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <p className="text-xs text-slate-400">
                Configure outbound email so password-change notifications are sent to both admins.
                Office 365: host <code className="text-indigo-400">smtp.office365.com</code>, port <code className="text-indigo-400">587</code>.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="SMTP Host" className="col-span-2 sm:col-span-1">
                  <TextInput value={smtpHost} onChange={setSmtpHost} placeholder="smtp.office365.com" />
                </Field>
                <Field label="Port">
                  <TextInput value={smtpPort} onChange={setSmtpPort} placeholder="587" />
                </Field>
              </div>

              <Field label="Username / Email">
                <TextInput value={smtpUser} onChange={setSmtpUser} placeholder="roadmap@sunpower.com" />
              </Field>

              <Field label="Password">
                <PasswordInput
                  value={smtpPass} onChange={setSmtpPass}
                  show={showSmtpPass} onToggle={() => setShowSmtpPass(!showSmtpPass)}
                  placeholder="SMTP password or app password"
                />
              </Field>

              <Field label="From Address (optional)">
                <TextInput
                  value={smtpFrom} onChange={setSmtpFrom}
                  placeholder={`"Roadmap Tool" <roadmap@sunpower.com>`}
                />
              </Field>

              <div className="flex items-center gap-2">
                <input
                  id="tls"
                  type="checkbox"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="rounded border-[#1e2f57] bg-[#162244]"
                />
                <label htmlFor="tls" className="text-xs text-slate-300">
                  Use SSL/TLS (port 465 only — leave unchecked for STARTTLS on 587)
                </label>
              </div>

              {smtpError && <StatusMsg type="error">{smtpError}</StatusMsg>}
              {smtpSuccess && <StatusMsg type="success">{smtpSuccess}</StatusMsg>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp || !smtpHost}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#1e2f57]
                             hover:bg-[#162244] disabled:opacity-40 text-sm text-slate-300 rounded-lg transition-colors"
                >
                  {testingSmtp && <Loader2 size={14} className="animate-spin" />}
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={savingSmtp || !smtpHost || !smtpUser || !smtpPass}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500
                             disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {savingSmtp && <Loader2 size={14} className="animate-spin" />}
                  Save Settings
                </button>
              </div>
            </form>
          )}

          {/* ── Decrypt ── */}
          {tab === 'decrypt' && (
            <form onSubmit={handleDecrypt} className="space-y-4">
              <p className="text-xs text-slate-400">
                Paste the values from a password-change notification email to reveal the new password.
              </p>

              <Field label="Encrypted Password (base64)">
                <textarea
                  value={encVal}
                  onChange={(e) => { setEncVal(e.target.value); setDecrypted(null); }}
                  rows={3}
                  placeholder="Paste the 'New Password (AES-256-CBC Encrypted)' value here"
                  className="w-full bg-[#162244] border border-[#1e2f57] rounded-lg px-3 py-2.5 text-xs text-slate-100
                             placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                />
              </Field>

              <Field label="Decryption Key (base64)">
                <TextInput
                  value={encKey} onChange={setEncKey}
                  placeholder="Paste the 'Decryption Key' value"
                  mono
                />
              </Field>

              <Field label="IV / Initialization Vector (base64)">
                <TextInput
                  value={encIv} onChange={setEncIv}
                  placeholder="Paste the 'IV' value"
                  mono
                />
              </Field>

              {decryptError && <StatusMsg type="error">{decryptError}</StatusMsg>}

              {decrypted && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
                  <p className="text-xs text-emerald-400 font-medium mb-1 flex items-center gap-1.5">
                    <CheckCircle size={13} />
                    Decrypted Password
                  </p>
                  <code className="text-sm text-emerald-300 font-mono">{decrypted}</code>
                </div>
              )}

              <button
                type="submit"
                disabled={decrypting || !encVal || !encKey || !encIv}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500
                           disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {decrypting && <Loader2 size={14} className="animate-spin" />}
                <Unlock size={14} />
                Decrypt
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small shared sub-components ───────────────────────────────────────────────

function Field({
  label, children, className = '',
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, mono = false,
}: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-[#162244] border border-[#1e2f57] rounded-lg px-3 py-2.5 text-sm text-slate-100
                  placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40
                  ${mono ? 'font-mono text-xs' : ''}`}
    />
  );
}

function PasswordInput({
  value, onChange, show, onToggle, placeholder,
}: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder?: string }) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#162244] border border-[#1e2f57] rounded-lg px-3 py-2.5 pr-10 text-sm text-slate-100
                   placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function StatusMsg({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const isError = type === 'error';
  return (
    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2.5
                     ${isError
                       ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                       : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                     }`}>
      {isError ? <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> : <CheckCircle size={13} className="flex-shrink-0 mt-0.5" />}
      <span>{children}</span>
    </div>
  );
}
