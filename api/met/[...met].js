export const config = { runtime: 'nodejs20' };

// Catch-all proxy: /api/met/<...path>?query -> https://datahub.metoffice.gov.uk/<...path>?query
export default async function handler(req, res) {
  try {
    const segs = Array.isArray(req.query.met) ? req.query.met : (req.query.met ? [req.query.met] : []);
    const restPath = segs.join('/');

    // Build upstream URL
    const upstream = new URL(`https://datahub.metoffice.gov.uk/${restPath}`);
    // Copy all query params except our catch-all param "met"
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'met') continue;
      if (Array.isArray(v)) v.forEach(val => upstream.searchParams.append(k, val));
      else upstream.searchParams.set(k, v);
    }

    const upstreamRes = await fetch(upstream.toString(), {
      method: req.method,
      headers: {
        accept: 'application/json',
        // server-side (do NOT prefix with VITE_)
        apikey: process.env.METOFFICE_API_KEY || '',
      },
      redirect: 'manual', // surface redirects as errors
    });

    // Surface upstream redirects clearly (prevents HTML login pages)
    if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
      const loc = upstreamRes.headers.get('location') || '';
      return res.status(502).json({
        error: { code: 'upstream_redirect', message: 'Upstream sent a redirect', location: loc },
      });
    }

    const ctype = upstreamRes.headers.get('content-type') || '';
    const textBody = await upstreamRes.text();

    if (!ctype.toLowerCase().includes('application/json')) {
      return res.status(upstreamRes.status || 502).json({
        error: {
          code: 'bad_content_type',
          message: 'Upstream did not return JSON (likely HTML/redirect)',
          upstreamStatus: upstreamRes.status,
          bodySnippet: textBody.slice(0, 300),
        },
      });
    }

    // Pass JSON through unchanged
    res.setHeader('content-type', 'application/json');
    res.status(upstreamRes.status).send(textBody);
  } catch (err) {
    res.status(500).json({
      error: { code: 'proxy_error', message: err?.message || String(err) },
    });
  }
}
