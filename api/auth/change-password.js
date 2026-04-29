import { requireAdminAuth, verifyPassword, hashPassword, setCors } from '../_lib/auth.js';

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = requireAdminAuth(req, res);
  if (!user) return;

  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required.' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  const passHash = process.env.JIRA_ROADMAP_PASS_HASH;
  if (!passHash) return res.status(503).json({ error: 'No password hash configured in environment.' });

  if (!verifyPassword(currentPassword, passHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const newHash = hashPassword(newPassword);

  return res.status(503).json({
    error: 'Vercel environment detected. Filesystem writes are not supported.',
    instructions: [
      '1. Copy the new hash below.',
      '2. Update JIRA_ROADMAP_PASS_HASH in your Vercel project environment variables.',
      '3. Redeploy to apply.',
    ],
    hash: newHash,
  });
}
