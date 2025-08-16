// api/met/[...met].js
export const config = { runtime: "nodejs" }; // ✅ valid values: "nodejs" or "edge"

export default async function handler(req, res) {
  try {
    const segs = Array.isArray(req.query.met) ? req.query.met : [];
    const search = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

    // Use the Data Hub host (does not 302 to OAuth when apikey is present)
    const upstreamUrl = `https://data.hub.api.metoffice.gov.uk/${segs.join("/")}${search}`;

    // Read key: prefer server env, fall back to header or query (for local tests)
    const apiKey =
      process.env.METOFFICE_API_KEY ||
      req.headers["x-metoffice-key"] ||
      req.query.apikey;

    if (!apiKey) {
      res.status(400).json({ error: "Missing API key" });
      return;
    }

    const upstream = await fetch(upstreamUrl, {
      headers: {
        accept: "application/json",
        apikey: apiKey,
      },
      // keepalive not necessary here; node runtime handles it
    });

    const ctype = upstream.headers.get("content-type") || "";
    const status = upstream.status;

    // Pass through JSON when possible; otherwise return plain text for easier debugging
    if (ctype.includes("application/json")) {
      const data = await upstream.json();
      res.status(status).setHeader("content-type", "application/json").send(JSON.stringify(data));
    } else {
      const text = await upstream.text();
      res
        .status(status)
        .setHeader("content-type", "text/plain; charset=utf-8")
        .send(text);
    }
  } catch (e) {
    res.status(502).json({ error: "Upstream fetch failed", details: String(e?.message || e) });
  }
}
