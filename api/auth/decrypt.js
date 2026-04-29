import crypto from 'crypto';
import { requireAdminAuth, setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = await requireAdminAuth(req, res);
  if (!user) return;

  const { encrypted, key, iv } = req.body ?? {};
  if (!encrypted || !key || !iv) return res.status(400).json({ error: 'encrypted, key, and iv are required.' });

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'base64'),
      Buffer.from(iv, 'base64')
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    res.json({ decrypted });
  } catch {
    res.status(400).json({ error: 'Decryption failed. Check your key and IV.' });
  }
}
