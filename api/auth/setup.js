import { isAdmin, signJWT, hashPassword, getConfig, patchConfig, setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const config = await getConfig();
  if (config.password_hash) {
    return res.status(400).json({ error: 'Password already configured. Use /api/auth/change-password.' });
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!isAdmin(email)) return res.status(403).json({ error: 'Only authorized administrators can set up the master password.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  await patchConfig({ password_hash: hashPassword(password) });

  const token = await signJWT({ email, role: 'admin' });
  res.json({ token, email, isAdmin: true });
}
