import { requireAdminAuth, ADMIN_EMAILS, setCors } from '../../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = requireAdminAuth(req, res);
  if (!user) return;

  const host = process.env.JIRA_ROADMAP_SMTP_HOST;
  const smtpUser = process.env.JIRA_ROADMAP_SMTP_USER;
  const smtpPass = process.env.JIRA_ROADMAP_SMTP_PASS;

  if (!host || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'SMTP not configured. Set JIRA_ROADMAP_SMTP_* environment variables.' });
  }

  try {
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.JIRA_ROADMAP_SMTP_PORT) || 587,
      secure: process.env.JIRA_ROADMAP_SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.verify();
    res.json({ success: true });
  } catch (err) {
    res.status(502).json({ error: `SMTP test failed: ${err.message}` });
  }
}
