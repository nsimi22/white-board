import { isSunPower, isAdmin, signJWT, verifyPassword, setCors } from '../_lib/auth.js';

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!isSunPower(email)) return res.status(403).json({ error: 'Access is restricted to @sunpower.com email addresses.' });

  const previewMode = process.env.JIRA_ROADMAP_PREVIEW_MODE === 'true';
  const passHash = process.env.JIRA_ROADMAP_PASS_HASH;

  if (previewMode && !passHash) {
    // Preview deployments: any @sunpower.com email with password "preview" gets in
    if (password !== 'preview') {
      return res.status(401).json({ error: 'Preview mode: use password "preview".' });
    }
    const token = signJWT({ email, role: isAdmin(email) ? 'admin' : 'user' });
    return res.json({ token, email, isAdmin: isAdmin(email) });
  }

  if (!passHash) {
    return res.status(503).json({
      error: 'Master password not configured. Set JIRA_ROADMAP_PASS_HASH in your Vercel environment variables.',
    });
  }

  if (!verifyPassword(password, passHash)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const token = signJWT({ email, role: isAdmin(email) ? 'admin' : 'user' });
  res.json({ token, email, isAdmin: isAdmin(email) });
}
