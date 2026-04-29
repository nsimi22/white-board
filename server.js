import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

// ── Supabase REST helpers ─────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function sbHeaders() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function loadConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[Supabase] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — auth disabled.');
    return {};
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config?id=eq.1&limit=1`, {
    headers: sbHeaders(),
  });
  const [row] = await res.json();
  return row ?? {};
}

async function saveConfig(updates) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/app_config?id=eq.1`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  });
  Object.assign(authConfig, updates);
}

// ── Admin list ─────────────────────────────────────────────────────────────────
const ADMIN_EMAILS = ['nick.simi@sunpower.com', 'landen.blume@sunpower.com'];
const ALLOWED_DOMAIN = '@sunpower.com';

function isSunPower(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}
function isAdmin(email) {
  return typeof email === 'string' && ADMIN_EMAILS.includes(email.toLowerCase());
}

// ── Password hashing (PBKDF2-SHA512) ─────────────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 200_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const test = crypto.pbkdf2Sync(password, salt, 200_000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch {
    return false;
  }
}

// ── JWT (HS256) ───────────────────────────────────────────────────────────────
const TOKEN_TTL_HOURS = 8;

function signJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_HOURS * 3600;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', authConfig.jwt_secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = crypto
      .createHmac('sha256', authConfig.jwt_secret)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url')))
      return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Load config at startup (top-level await — ES module) ─────────────────────
let authConfig = await loadConfig();

// ── AES-256-CBC encryption for email body ────────────────────────────────────
function encryptForEmail(plaintext) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    key: key.toString('base64'),
  };
}

// ── Email notification ────────────────────────────────────────────────────────
async function sendPasswordChangedEmail(newPassword, changedBy) {
  const smtp = authConfig.smtp_config;
  if (!smtp?.host) {
    console.warn('[Email] SMTP not configured — skipping notification email.');
    return;
  }

  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    console.error('[Email] nodemailer not available.');
    return;
  }

  const { encrypted, iv, key } = encryptForEmail(newPassword);

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#0d1526;color:#f1f5f9;border-radius:12px;overflow:hidden">
      <div style="background:#6366f1;padding:24px 32px">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff">🔒 Roadmap Password Changed</h1>
        <p style="margin:6px 0 0;font-size:14px;color:#c7d2fe;opacity:0.9">SunPower Internal Roadmap Tool</p>
      </div>
      <div style="padding:32px">
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
          The master access password was changed by <strong style="color:#f1f5f9">${changedBy}</strong>.
        </p>
        <div style="background:#162244;border:1px solid #1e2f57;border-radius:8px;padding:20px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">New Password (AES-256-CBC Encrypted)</p>
          <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all;line-height:1.6">${encrypted}</code>
        </div>
        <div style="background:#162244;border:1px solid #1e2f57;border-radius:8px;padding:20px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">Decryption Key</p>
          <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all">${key}</code>
          <p style="margin:8px 0 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">IV</p>
          <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all">${iv}</code>
        </div>
        <hr style="border:none;border-top:1px solid #1e2f57;margin:24px 0">
        <p style="font-size:11px;color:#334155;margin:0">
          This email was sent because you are an administrator of the SunPower Roadmap tool.
        </p>
      </div>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port ?? 587,
    secure: smtp.secure ?? false,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  for (const admin of ADMIN_EMAILS) {
    try {
      await transporter.sendMail({
        from: smtp.from ?? `"Roadmap Tool" <${smtp.user}>`,
        to: admin,
        subject: '🔒 [CONFIDENTIAL] Roadmap master password changed',
        html,
      });
      console.log(`[Email] Notification sent to ${admin}`);
    } catch (err) {
      console.error(`[Email] Failed to send to ${admin}:`, err.message);
    }
  }
}

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  if (!isSunPower(payload.email)) return res.status(403).json({ error: 'Access restricted to @sunpower.com accounts.' });
  req.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!isAdmin(req.user.email)) return res.status(403).json({ error: 'Admin access required.' });
    next();
  });
}

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── Auth routes ───────────────────────────────────────────────────────────────

app.get('/api/auth/status', (_req, res) => {
  res.json({
    configured: !!authConfig.password_hash,
    smtpConfigured: !!authConfig.smtp_config?.host,
  });
});

app.post('/api/auth/setup', async (req, res) => {
  if (authConfig.password_hash) {
    return res.status(400).json({ error: 'Password already configured. Use /api/auth/change-password.' });
  }
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!isAdmin(email)) return res.status(403).json({ error: 'Only authorized administrators can set up the master password.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  await saveConfig({ password_hash: hashPassword(password) });

  const token = signJWT({ email, role: 'admin' });
  res.json({ token, email, isAdmin: true });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!isSunPower(email)) return res.status(403).json({ error: 'Access is restricted to @sunpower.com email addresses.' });
  if (!authConfig.password_hash) return res.status(503).json({ error: 'Master password not yet configured. Contact an administrator.' });
  if (!verifyPassword(password, authConfig.password_hash)) return res.status(401).json({ error: 'Incorrect password.' });

  const token = signJWT({ email, role: isAdmin(email) ? 'admin' : 'user' });
  res.json({ token, email, isAdmin: isAdmin(email) });
});

app.post('/api/auth/change-password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required.' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  if (!verifyPassword(currentPassword, authConfig.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  await saveConfig({ password_hash: hashPassword(newPassword) });
  sendPasswordChangedEmail(newPassword, req.user.email).catch(console.error);
  res.json({ success: true });
});

app.post('/api/auth/decrypt', requireAdmin, (req, res) => {
  const { encrypted, key, iv } = req.body ?? {};
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'base64'),
      Buffer.from(iv, 'base64')
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    res.json({ decrypted });
  } catch {
    res.status(400).json({ error: 'Decryption failed. Check your key and IV.' });
  }
});

app.post('/api/auth/smtp', requireAdmin, async (req, res) => {
  const { host, port, secure, user, pass, from } = req.body ?? {};
  if (!host || !user || !pass) return res.status(400).json({ error: 'SMTP host, user, and password are required.' });
  await saveConfig({ smtp_config: { host, port: Number(port) || 587, secure: !!secure, user, pass, from } });
  res.json({ success: true });
});

app.post('/api/auth/smtp/test', requireAdmin, async (req, res) => {
  const smtp = authConfig.smtp_config;
  if (!smtp?.host) return res.status(400).json({ error: 'SMTP not configured.' });
  try {
    const nodemailer = (await import('nodemailer')).default;
    const t = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port ?? 587,
      secure: smtp.secure ?? false,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await t.verify();
    res.json({ success: true });
  } catch (err) {
    res.status(502).json({ error: `SMTP test failed: ${err.message}` });
  }
});

// ── Jira proxy (requires auth) ────────────────────────────────────────────────
app.all('/proxy/*', requireAuth, async (req, res) => {
  const domain = req.headers['x-jira-domain'];
  const email = req.headers['x-jira-email'];
  const token = req.headers['x-jira-token'];

  if (!domain || !email || !token) {
    return res.status(400).json({ error: 'Missing Jira credentials in request headers.' });
  }

  const jiraPath = req.path.replace(/^\/proxy/, '');
  const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const jiraUrl = `https://${domain}${jiraPath}${queryString}`;
  const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: { Authorization: authHeader, 'Content-Type': 'application/json', Accept: 'application/json' },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(jiraUrl, fetchOptions);
    const contentType = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    if (contentType.includes('application/json')) {
      res.json(await upstream.json());
    } else {
      res.set('Content-Type', contentType).send(await upstream.text());
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Failed to reach Jira. Check your domain and network.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Jira proxy server running on http://localhost:${PORT}`);
  console.log(`   Auth:  ${authConfig.password_hash ? '✓ Password configured' : '⚠ No password set — run setup'}`);
  console.log(`   SMTP:  ${authConfig.smtp_config?.host ? `✓ ${authConfig.smtp_config.host}` : '— not configured'}\n`);
});
