import { requireAdminAuth, patchConfig, setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = await requireAdminAuth(req, res);
  if (!user) return;

  const { host, port, secure, user: smtpUser, pass, from } = req.body ?? {};
  if (!host || !smtpUser || !pass) return res.status(400).json({ error: 'SMTP host, user, and password are required.' });

  await patchConfig({
    smtp_config: { host, port: Number(port) || 587, secure: !!secure, user: smtpUser, pass, from },
  });
  res.json({ success: true });
}
