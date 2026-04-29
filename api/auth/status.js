import { getConfig, setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const config = await getConfig();
  res.json({
    configured: !!config.password_hash,
    smtpConfigured: !!config.smtp_config?.host,
  });
}
