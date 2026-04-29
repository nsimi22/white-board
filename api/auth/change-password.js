import crypto from 'crypto';
import { requireAdminAuth, verifyPassword, hashPassword, getConfig, patchConfig, setCors, ADMIN_EMAILS } from '../_lib/auth.js';

async function sendPasswordChangedEmail(newPassword, changedBy, smtp) {
  if (!smtp?.host) return;
  try {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(newPassword, 'utf8'), cipher.final()]).toString('base64');

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#0d1526;color:#f1f5f9;border-radius:12px;overflow:hidden">
        <div style="background:#6366f1;padding:24px 32px">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff">🔒 Roadmap Password Changed</h1>
          <p style="margin:6px 0 0;font-size:14px;color:#c7d2fe;opacity:0.9">SunPower Internal Roadmap Tool</p>
        </div>
        <div style="padding:32px">
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
            The master access password was changed by <strong style="color:#f1f5f9">${changedBy}</strong>.
          </p>
          <div style="background:#162244;border:1px solid #1e2f57;border-radius:8px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">New Password (AES-256-CBC Encrypted)</p>
            <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all;line-height:1.6">${encrypted}</code>
          </div>
          <div style="background:#162244;border:1px solid #1e2f57;border-radius:8px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">Decryption Key</p>
            <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all">${key.toString('base64')}</code>
            <p style="margin:8px 0 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6366f1">IV</p>
            <code style="display:block;font-size:12px;color:#a5b4fc;word-break:break-all">${iv.toString('base64')}</code>
          </div>
          <hr style="border:none;border-top:1px solid #1e2f57;margin:24px 0">
          <p style="font-size:11px;color:#334155;margin:0">This email was sent because you are an administrator of the SunPower Roadmap tool.</p>
        </div>
      </div>
    `;

    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port ?? 587,
      secure: smtp.secure ?? false,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    for (const admin of ADMIN_EMAILS) {
      await transporter.sendMail({
        from: smtp.from ?? `"Roadmap Tool" <${smtp.user}>`,
        to: admin,
        subject: '🔒 [CONFIDENTIAL] Roadmap master password changed',
        html,
      }).catch((err) => console.error(`[Email] Failed to ${admin}:`, err.message));
    }
  } catch (err) {
    console.error('[Email]', err.message);
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = await requireAdminAuth(req, res);
  if (!user) return;

  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required.' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  const config = await getConfig();
  if (!verifyPassword(currentPassword, config.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  await patchConfig({ password_hash: hashPassword(newPassword) });
  sendPasswordChangedEmail(newPassword, user.email, config.smtp_config).catch(console.error);
  res.json({ success: true });
}
