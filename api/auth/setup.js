import { isAdmin, signJWT, hashPassword, setCors } from '../_lib/auth.js';

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const passHash = process.env.JIRA_ROADMAP_PASS_HASH;
  if (passHash) {
    return res.status(400).json({ error: 'Password already configured. Use /api/auth/change-password.' });
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!isAdmin(email)) return res.status(403).json({ error: 'Only authorized administrators can set up the master password.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  // On Vercel, we cannot persist to the filesystem. Generate the hash and instruct the user.
  const hash = hashPassword(password);

  return res.status(503).json({
    error: 'Vercel environment detected. Filesystem writes are not supported.',
    instructions: [
      '1. Copy the hash below and add it as a Vercel environment variable.',
      '2. Set JIRA_ROADMAP_PASS_HASH = <hash> in your Vercel project settings.',
      '3. Set JIRA_ROADMAP_JWT_SECRET = <any random 64-char string> for stable sessions.',
      '4. Redeploy to apply the change.',
    ],
    hash,
  });
}
