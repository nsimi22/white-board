import { requireAdminAuth, setCors } from '../_lib/auth.js';

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = requireAdminAuth(req, res);
  if (!user) return;

  const { host, port, secure, user: smtpUser, pass, from } = req.body ?? {};
  if (!host || !smtpUser || !pass) return res.status(400).json({ error: 'SMTP host, user, and password are required.' });

  // On Vercel, SMTP config must be set via environment variables. Return instructions.
  return res.status(503).json({
    error: 'Vercel environment detected. SMTP config must be set via environment variables.',
    instructions: [
      'Set the following in your Vercel project environment variables:',
      `JIRA_ROADMAP_SMTP_HOST=${host}`,
      `JIRA_ROADMAP_SMTP_PORT=${port || 587}`,
      `JIRA_ROADMAP_SMTP_SECURE=${secure ? 'true' : 'false'}`,
      `JIRA_ROADMAP_SMTP_USER=${smtpUser}`,
      'JIRA_ROADMAP_SMTP_PASS=<your password>',
      from ? `JIRA_ROADMAP_SMTP_FROM=${from}` : '',
    ].filter(Boolean),
  });
}
