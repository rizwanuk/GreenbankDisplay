// api/push/cron.js (DIAGNOSTIC VERSION)
import webPush from "web-push";
import { get, put } from "@vercel/blob";

export const config = { runtime: "nodejs" };

const {
  CRON_TOKEN,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = "mailto:admin@example.com",
  PUSH_TOLERANCE_MIN = "3",
} = process.env;

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
  const diag = {
    ok: false,
    step: "start",
    env: {
      hasCronToken: !!CRON_TOKEN,
      hasVapidPub: !!VAPID_PUBLIC_KEY,
      hasVapidPriv: !!VAPID_PRIVATE_KEY,
      tolMin: PUSH_TOLERANCE_MIN,
    },
    query: {},
    auth: {},
    vapidSetup: null,
    blob: {
      canGetSubs: null,
      getSubsError: null,
      canPutDiag: null,
      putDiagError: null,
    },
  };

  try {
    // Parse query + auth
    const q = getQuery(req);
    diag.query = q;
    const hdrToken =
      req.headers["x-cron-token"] ||
      req.headers["X-Cron-Token"] ||
      req.headers["x-cron_token"];
    const token = q.token || hdrToken;
    diag.auth = {
      provided: !!token,
      matches: !!CRON_TOKEN && token === CRON_TOKEN,
    };
    if (!CRON_TOKEN) {
      diag.step = "missing-cron-token-env";
      return res.status(500).json(diag);
    }
    if (token !== CRON_TOKEN) {
      diag.step = "unauthorized";
      return res.status(401).json(diag);
    }

    // VAPID setup
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      diag.vapidSetup = "missing-vapid-keys";
      diag.step = "vapid-missing";
      return res.status(500).json(diag);
    }
    try {
      webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      diag.vapidSetup = "ok";
    } catch (e) {
      diag.vapidSetup = `error: ${e?.message || String(e)}`;
      diag.step = "vapid-error";
      return res.status(500).json(diag);
    }

    // Blob GET check (subscriptions)
    try {
      const r = await get("push/subscriptions.json", { allowPrivate: true });
      // some SDK versions return an object with 'body' (ReadableStream-like)
      // others require fetching the downloadUrl. Try both paths safely.
      try {
        const txt = await r?.body?.text?.();
        diag.blob.canGetSubs = !!txt || !!r?.downloadUrl || !!r?.url;
      } catch {
        diag.blob.canGetSubs = !!r?.downloadUrl || !!r?.url;
      }
    } catch (e) {
      diag.blob.canGetSubs = false;
      diag.blob.getSubsError = e?.message || String(e);
    }

    // Blob PUT check (write permission)
    try {
      await put("push/_diag.txt", `ok ${Date.now()}`, {
        access: "private",
        contentType: "text/plain",
      });
      diag.blob.canPutDiag = true;
    } catch (e) {
      diag.blob.canPutDiag = false;
      diag.blob.putDiagError = e?.message || String(e);
    }

    diag.step = "done";
    diag.ok = true;
    return res.json(diag);
  } catch (e) {
    diag.step = "caught-exception";
    diag.error = e?.message || String(e);
    return res.status(500).json(diag);
  }
}
