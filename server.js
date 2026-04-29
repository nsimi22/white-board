import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// ── Admin list ─────────────────────────────────────────────────────────────────
const ADMIN_EMAILS = ['nick.simi@sunpower.com', 'landon.blume@sunpower.com'];
const ALLOWED_DOMAIN = '@sunpower.com';

function isSunPower(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}
function isAdmin(email) {
  return typeof email === 'string' && ADMIN_EMAILS.includes(email.toLowerCase());
}

// ── Auth config (persisted to .auth-config.json, gitignored) ──────────────────
const CONFIG_PATH = path.join(__dirname, '.auth-config.json');

function loadAuthConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { passwordHash: null, jwtSecret: crypto.randomBytes(64).toString('hex'), smtp: null };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { passwordHash: null, jwtSecret: crypto.randomBytes(64).toString('hex'), smtp: null };
  }
}

function saveAuthConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

let authConfig = loadAuthConfig();
// Ensure jwtSecret always exists
if (!authConfig.jwtSecret) {
  authConfig.jwtSecret = crypto.randomBytes(64).toString('hex');
  saveAuthConfig(authConfig);
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

// ── JWT (HS256, manual — no extra deps) ──────────────────────────────────────
const TOKEN_TTL_HOURS = 8;

function signJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_HOURS * 3600;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', authConfig.jwtSecret)
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
      .createHmac('sha256', authConfig.jwtSecret)
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
  if (!authConfig.smtp?.host) {
    console.warn('[Email] SMTP not configured — skipping notification email.');
    return;
  }

  // Lazy-load nodemailer only when SMTP is configured
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
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">
            New Password (AES-256-CBC Encrypted)
          </p>
          <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all;line-height:1.6">${encrypted}</code>
        </div>

        <div style="background:#162244;border:1px solid #1e2f57;border-radius:8px;padding:20px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">
            Decryption Key
          </p>
          <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all">${key}</code>
          <p style="margin:8px 0 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">
            IV (Initialization Vector)
          </p>
          <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all">${iv}</code>
        </div>

        <p style="font-size:12px;color:#475569;margin:0">
          To decrypt: <code style="color:#94a3b8">openssl enc -aes-256-cbc -d -base64 -K &lt;key_hex&gt; -iv &lt;iv_hex&gt;</code><br>
          Or use the Admin Panel → "Decrypt" in the Roadmap tool.
        </p>

        <hr style="border:none;border-top:1px solid #1e2f57;margin:24px 0">
        <p style="font-size:11px;color:#334155;margin:0">
          This email was sent because you are an administrator of the SunPower Roadmap tool.
          If you did not request this change, contact your team immediately.
          <br>Transmitted over encrypted TLS connection.
        </p>
      </div>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: authConfig.smtp.host,
    port: authConfig.smtp.port ?? 587,
    secure: authConfig.smtp.secure ?? false,
    auth: { user: authConfig.smtp.user, pass: authConfig.smtp.pass },
  });

  for (const admin of ADMIN_EMAILS) {
    try {
      await transporter.sendMail({
        from: authConfig.smtp.from ?? `"Roadmap Tool" <${authConfig.smtp.user}>`,
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
    if (!isAdmin(req.user.email)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

// ── Express setup ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Auth routes ───────────────────────────────────────────────────────────────

// Check setup status (public)
app.get('/api/auth/status', (_req, res) => {
  res.json({ configured: !!authConfig.passwordHash, smtpConfigured: !!authConfig.smtp?.host });
});

// Initial setup — only allowed before any password is set, and only by admins
app.post('/api/auth/setup', (req, res) => {
  if (authConfig.passwordHash) {
    return res.status(400).json({ error: 'Password already configured. Use /api/auth/change-password.' });
  }
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!isAdmin(email)) return res.status(403).json({ error: 'Only authorized administrators can set up the master password.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  authConfig.passwordHash = hashPassword(password);
  saveAuthConfig(authConfig);

  const token = signJWT({ email, role: 'admin' });
  res.json({ token, email, isAdmin: true });
});

// Login (public)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!isSunPower(email)) return res.status(403).json({ error: 'Access is restricted to @sunpower.com email addresses.' });
  if (!authConfig.passwordHash) return res.status(503).json({ error: 'Master password not yet configured. Contact an administrator.' });
  if (!verifyPassword(password, authConfig.passwordHash)) return res.status(401).json({ error: 'Incorrect password.' });

  const token = signJWT({ email, role: isAdmin(email) ? 'admin' : 'user' });
  res.json({ token, email, isAdmin: isAdmin(email) });
});

// Change password (admin only)
app.post('/api/auth/change-password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required.' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  if (!verifyPassword(currentPassword, authConfig.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  authConfig.passwordHash = hashPassword(newPassword);
  saveAuthConfig(authConfig);

  // Fire-and-forget email to both admins
  sendPasswordChangedEmail(newPassword, req.user.email).catch(console.error);

  res.json({ success: true });
});

// Decrypt a password from an email notification (admin only)
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

// Save SMTP config (admin only)
app.post('/api/auth/smtp', requireAdmin, (req, res) => {
  const { host, port, secure, user, pass, from } = req.body ?? {};
  if (!host || !user || !pass) return res.status(400).json({ error: 'SMTP host, user, and password are required.' });
  authConfig.smtp = { host, port: Number(port) || 587, secure: !!secure, user, pass, from };
  saveAuthConfig(authConfig);
  res.json({ success: true });
});

// Test SMTP connection (admin only)
app.post('/api/auth/smtp/test', requireAdmin, async (req, res) => {
  if (!authConfig.smtp?.host) return res.status(400).json({ error: 'SMTP not configured.' });
  try {
    const nodemailer = (await import('nodemailer')).default;
    const t = nodemailer.createTransport({
      host: authConfig.smtp.host,
      port: authConfig.smtp.port ?? 587,
      secure: authConfig.smtp.secure ?? false,
      auth: { user: authConfig.smtp.user, pass: authConfig.smtp.pass },
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
  const configured = !!authConfig.passwordHash;
  console.log(`   Auth: ${configured ? '✓ Password configured' : '⚠ No password set — admins must complete setup'}`);
  console.log(`   SMTP: ${authConfig.smtp?.host ? `✓ ${authConfig.smtp.host}` : '— not configured'}\n`);
});
