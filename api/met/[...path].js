export default async function handler(req, res) {
  try {
    // 1) Work out the upstream URL
    //    Dynamic route gives us req.query.path (an array)
    const segs = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
    const restPath = segs.join('/');

    const upstream = new URL(`https://datahub.metoffice.gov.uk/${restPath}`);

    // copy query params except our catch-all param
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path') continue;
      if (Array.isArray(v)) v.forEach((val) => upstream.searchParams.append(k, val));
      else upstream.searchParams.set(k, v);
    }

    // 2) Choose API key: header wins, else env var
    const key =
      req.headers['x-metoffice-key'] ||
      process.env.METOFFICE_API_KEY ||
      process.env.VITE_METOFFICE_API_KEY;

    const headers = { accept: 'application/json' };
    if (key) headers['apikey'] = key;

    // 3) Forward the request (GET only is fine for this API)
    const upstreamRes = await fetch(upstream.toString(), {
      method: 'GET',
      headers,
      redirect: 'manual', // prevent HTML login redirects
    });

    // Block auth redirects (they return HTML)
    if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
      const loc = upstreamRes.headers.get('location') || '';
      return res.status(502).json({ error: { code: 'upstream_redirect', location: loc } });
    }

    // 4) Pipe through JSON (or raw) back to the client
    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const bodyBuf = Buffer.from(await upstreamRes.arrayBuffer());

    res.status(upstreamRes.status);
    res.setHeader('content-type', contentType);
    res.setHeader('content-length', String(bodyBuf.length));
    // A little cache is fine; tweak if you like
    res.setHeader('cache-control', 's-maxage=300, stale-while-revalidate=60');
    res.send(bodyBuf);
  } catch (err) {
    res.status(500).json({ error: { message: 'proxy_error', detail: String(err?.message || err) } });
  }
}
