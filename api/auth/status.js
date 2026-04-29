import { setCors } from '../_lib/auth.js';

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const passHash = process.env.JIRA_ROADMAP_PASS_HASH;
  const previewMode = process.env.JIRA_ROADMAP_PREVIEW_MODE === 'true';
  const smtpConfigured = !!(
    process.env.JIRA_ROADMAP_SMTP_HOST &&
    process.env.JIRA_ROADMAP_SMTP_USER &&
    process.env.JIRA_ROADMAP_SMTP_PASS
  );

  if (previewMode) {
    return res.json({ configured: true, smtpConfigured, previewMode: true });
  }

  res.json({ configured: !!passHash, smtpConfigured });
}
