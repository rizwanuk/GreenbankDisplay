/**
 * Vercel serverless proxy for Met Office.
 * Usage from client: GET /met/sitespecific/v0/point/{hourly|three-hourly}?latitude=..&longitude=..
 * This function injects the server-side API key and returns JSON.
 */
const ALLOWED_PREFIXES = [
  'sitespecific/v0/point/hourly',
  'sitespecific/v0/point/three-hourly',
  'sitespecific/v0/point/daily'
];

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET');
      return res.end('Method Not Allowed');
    }

    const path = (req.query.path || []).join('/');
    if (!path) {
      res.statusCode = 400;
      return res.end('Missing path');
    }
    if (!ALLOWED_PREFIXES.some(p => path.startsWith(p))) {
      res.statusCode = 400;
      return res.end('Invalid path');
    }

    const API_KEY = process.env.METOFFICE_API_KEY;
    if (!API_KEY) {
      res.statusCode = 500;
      return res.end('Server missing METOFFICE_API_KEY');
    }

    const url = new URL(req.url, 'http://localhost'); // for search params
    const upstream = `https://datahub.metoffice.gov.uk/${path}${url.search || ''}`;

    const upstreamRes = await fetch(upstream, {
      headers: {
        'accept': 'application/json',
        'apikey': API_KEY
      }
    });

    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.statusCode = upstreamRes.status;
    res.setHeader('content-type', contentType);
    res.setHeader('cache-control', upstreamRes.headers.get('cache-control') || 'public, max-age=300');

    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    return res.end(buf);
  } catch (err) {
    res.statusCode = 502;
    return res.end(`Proxy error: ${err.message}`);
  }
};
