import { requireAuth, setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const domain = req.headers['x-jira-domain'];
  const email = req.headers['x-jira-email'];
  const token = req.headers['x-jira-token'];

  if (!domain || !email || !token) {
    return res.status(400).json({ error: 'Missing Jira credentials in request headers.' });
  }

  // Build the Jira path from the catch-all segments
  const pathArr = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  const jiraPath = '/' + pathArr.join('/');

  // Reconstruct query string without the 'path' param that Vercel injects
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue;
    if (Array.isArray(v)) v.forEach((val) => searchParams.append(k, val));
    else searchParams.append(k, v);
  }
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const jiraUrl = `https://${domain}${jiraPath}${queryString}`;

  const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(jiraUrl, fetchOptions);
    const contentType = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    if (contentType.includes('application/json')) {
      res.json(await upstream.json());
    } else {
      res.setHeader('Content-Type', contentType);
      res.send(await upstream.text());
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Failed to reach Jira. Check your domain and network.' });
  }
}
