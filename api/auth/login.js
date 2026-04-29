import { isSunPower, isAdmin, signJWT, verifyPassword, getConfig, setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!isSunPower(email)) return res.status(403).json({ error: 'Access is restricted to @sunpower.com email addresses.' });

  const config = await getConfig();
  if (!config.password_hash) {
    return res.status(503).json({ error: 'Master password not yet configured. Contact an administrator.' });
  }

  if (!verifyPassword(password, config.password_hash)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const token = await signJWT({ email, role: isAdmin(email) ? 'admin' : 'user' });
  res.json({ token, email, isAdmin: isAdmin(email) });
}
