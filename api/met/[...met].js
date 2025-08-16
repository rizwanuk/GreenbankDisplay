// api/met/[...met].js
export const config = { runtime: 'nodejs' }; // valid: 'nodejs' or 'edge'

export default async function handler(req, res) {
  try {
    // Build path segments robustly regardless of how Vercel parsed it
    const url = req.url || '';
    const qIdx = url.indexOf('?');
    const search = qIdx >= 0 ? url.slice(qIdx) : '';
    const pathOnly = (qIdx >= 0 ? url.slice(0, qIdx) : url).replace(/^\/api\/met\/?/, '');
    const segs = pathOnly.split('/').filter(Boolean);

    if (segs.length === 0) {
      res.status(400).json({ error: 'Missing upstream path after /api/met/' });
      return;
    }

    // Use the Data Hub host (returns JSON when apikey is present & valid)
    const upstreamUrl = `https://data.hub.api.metoffice.gov.uk/${segs.join('/')}${search}`;

    // Prefer server env; allow header/query for manual tests
    const apiKey =
      process.env.METOFFICE_API_KEY ||
      req.headers['x-metoffice-key'] ||
      req.query?.apikey;

    if (!apiKey) {
      res.status(400).json({ error: 'Missing API key' });
      return;
    }

    const upstream = await fetch(upstreamUrl, {
      headers: {
        accept: 'application/json',
        apikey: apiKey,
      },
    });

    const ctype = upstream.headers.get('content-type') || '';
    const status = upstream.status;

    if (ctype.toLowerCase().includes('application/json')) {
      const data = await upstream.json();
      res.status(status).setHeader('content-type', 'application/json').send(JSON.stringify(data));
    } else {
      // Text (HTML, etc.) helps debug redirects/403s upstream
      const text = await upstream.text();
      res.status(status).setHeader('content-type', 'text/plain; charset=utf-8').send(text);
    }
  } catch (e) {
    res.status(502).json({ error: 'Upstream fetch failed', details: String(e?.message || e) });
  }
}
