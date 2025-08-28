// api/push/cron.js  (DIAGNOSTIC)
export const config = { runtime: "nodejs" };

function getQuery(req) {
  try {
    const host = req.headers?.host || "localhost";
    const u = new URL(req.url, `https://${host}`);
    return Object.fromEntries(u.searchParams.entries());
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const out = {
    ok: false,
    step: "start",
    env: {
      hasCronToken: !!process.env.CRON_TOKEN,
      hasVapidPub: !!process.env.VAPID_PUBLIC_KEY,
      hasVapidPriv: !!process.env.VAPID_PRIVATE_KEY,
    },
    query: {},
    auth: {},
    dynamicImports: {},
  };

  try {
    // Parse token robustly
    const q = getQuery(req);
    out.query = q;
    const hdrToken =
      req.headers["x-cron-token"] ||
      req.headers["X-Cron-Token"] ||
      req.headers["x-cron_token"];
    const token = q.token || hdrToken;

    out.auth = {
      provided: !!token,
      matches: !!process.env.CRON_TOKEN && token === process.env.CRON_TOKEN,
    };

    if (!process.env.CRON_TOKEN) {
      out.step = "no-cron-token-env";
      return res.status(500).json(out);
    }
    if (token !== process.env.CRON_TOKEN) {
      out.step = "unauthorized";
      return res.status(401).json(out);
    }

    // Try dynamic imports (so a bad module won’t crash load)
    out.step = "dynamic-imports";
    try {
      await import("web-push");
      out.dynamicImports.webPush = "ok";
    } catch (e) {
      out.dynamicImports.webPush = `error: ${e?.message || String(e)}`;
    }

    try {
      await import("@vercel/blob");
      out.dynamicImports.vercelBlob = "ok";
    } catch (e) {
      out.dynamicImports.vercelBlob = `error: ${e?.message || String(e)}`;
    }

    out.step = "done";
    out.ok = true;
    return res.json(out);
  } catch (e) {
    out.step = "caught-exception";
    out.error = e?.message || String(e);
    return res.status(500).json(out);
  }
}
