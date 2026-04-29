import crypto from 'crypto';

export const ADMIN_EMAILS = ['nick.simi@sunpower.com', 'landon.blume@sunpower.com'];
const ALLOWED_DOMAIN = '@sunpower.com';
const TOKEN_TTL_HOURS = 8;

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

// 30-second module-level cache keeps the proxy fast without hammering Supabase
let _cachedConfig = null;
let _cacheExpiry = 0;

export async function getConfig() {
  if (_cachedConfig && Date.now() < _cacheExpiry) return _cachedConfig;
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/app_config?id=eq.1&limit=1`,
    { headers: sbHeaders() }
  );
  const [row] = await res.json();
  _cachedConfig = row ?? {};
  _cacheExpiry = Date.now() + 30_000;
  return _cachedConfig;
}

export async function patchConfig(updates) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/app_config?id=eq.1`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  });
  _cachedConfig = null; // bust cache
}

// ── Domain / admin checks ─────────────────────────────────────────────────────
export function isSunPower(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

export function isAdmin(email) {
  return typeof email === 'string' && ADMIN_EMAILS.includes(email.toLowerCase());
}

// ── Password hashing (PBKDF2-SHA512) ─────────────────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 200_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const test = crypto.pbkdf2Sync(password, salt, 200_000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch {
    return false;
  }
}

// ── JWT (HS256) — async because jwt_secret lives in Supabase ─────────────────
export async function signJWT(payload) {
  const { jwt_secret } = await getConfig();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_HOURS * 3600;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', jwt_secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export async function verifyJWT(token) {
  const { jwt_secret } = await getConfig();
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = crypto.createHmac('sha256', jwt_secret).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url')))
      return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── CORS ──────────────────────────────────────────────────────────────────────
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jira-domain, x-jira-email, x-jira-token');
}

// ── Auth guards ───────────────────────────────────────────────────────────────
export async function requireAuth(req, res) {
  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  const payload = await verifyJWT(token);
  if (!payload) { res.status(401).json({ error: 'Invalid or expired session. Please log in again.' }); return null; }
  if (!isSunPower(payload.email)) { res.status(403).json({ error: 'Access restricted to @sunpower.com accounts.' }); return null; }
  return payload;
}

export async function requireAdminAuth(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (!isAdmin(user.email)) { res.status(403).json({ error: 'Admin access required.' }); return null; }
  return user;
}
