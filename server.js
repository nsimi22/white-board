import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Proxy all /proxy/* requests to the user's Jira instance.
// Credentials are passed via request headers so this server stays stateless.
app.all('/proxy/*', async (req, res) => {
  const domain = req.headers['x-jira-domain'];
  const email = req.headers['x-jira-email'];
  const token = req.headers['x-jira-token'];

  if (!domain || !email || !token) {
    return res.status(400).json({ error: 'Missing Jira credentials in request headers.' });
  }

  // Strip the /proxy prefix to get the Jira path
  const jiraPath = req.path.replace(/^\/proxy/, '');
  const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
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

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(jiraUrl, fetchOptions);
    const contentType = upstream.headers.get('content-type') || '';

    res.status(upstream.status);

    if (contentType.includes('application/json')) {
      const data = await upstream.json();
      res.json(data);
    } else {
      const text = await upstream.text();
      res.set('Content-Type', contentType).send(text);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Failed to reach Jira. Check your domain and network.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Jira proxy server running on http://localhost:${PORT}`);
  console.log('   Proxying /proxy/* → https://<your-jira-domain>/*\n');
});
