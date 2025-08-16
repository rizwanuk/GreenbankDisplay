// api/met.js
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    // we expect vercel to rewrite /api/met/(.*) -> /api/met.js?path=$1&<original query>
    const path = typeof req.query.path === "string" ? req.query.path : "";

    if (!path) {
      res.status(400).json({ error: "Missing 'path' in query" });
      return;
    }

    // build query string for upstream, excluding our internal 'path'
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === "path") continue;
      if (Array.isArray(v)) v.forEach(val => qs.append(k, val));
      else if (v != null) qs.append(k, String(v));
    }

    const upstreamUrl =
      `https://data.hub.api.metoffice.gov.uk/${path}` +
      (qs.toString() ? `?${qs.toString()}` : "");

    // API key: prefer server env, then header, then ?apikey for manual tests
    const apiKey =
      process.env.METOFFICE_API_KEY ||
      req.headers["x-metoffice-key"] ||
      req.query.apikey;

    if (!apiKey) {
      res.status(400).json({ error: "Missing API key" });
      return;
    }

    const upstream = await fetch(upstreamUrl, {
      headers: { accept: "application/json", apikey: apiKey },
    });

    const status = upstream.status;
    const ctype = upstream.headers.get("content-type") || "";

    if (ctype.includes("application/json")) {
      const data = await upstream.json();
      res.status(status).setHeader("content-type", "application/json").send(JSON.stringify(data));
    } else {
      const text = await upstream.text();
      res.status(status).setHeader("content-type", "text/plain; charset=utf-8").send(text);
    }
  } catch (e) {
    res.status(502).json({ error: "Upstream fetch failed", details: String(e?.message || e) });
  }
}
