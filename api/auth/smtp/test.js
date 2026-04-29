import { requireAdminAuth, getConfig, setCors } from '../../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = await requireAdminAuth(req, res);
  if (!user) return;

  const config = await getConfig();
  const smtp = config.smtp_config;
  if (!smtp?.host) return res.status(400).json({ error: 'SMTP not configured.' });

  try {
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port ?? 587,
      secure: smtp.secure ?? false,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.verify();
    res.json({ success: true });
  } catch (err) {
    res.status(502).json({ error: `SMTP test failed: ${err.message}` });
  }
}
