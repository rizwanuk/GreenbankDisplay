// api/admin/_auth.js
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

export async function verifyMicrosoftToken(idToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      getKey,
      {
        audience: CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      },
      (err, decoded) => {
        if (err) return reject(err);
        const email = (decoded?.preferred_username || decoded?.email || "").toLowerCase().trim();
        if (!email) return reject(new Error("No email in token"));
        resolve(email);
      }
    );
  });
}

let _allowedCache = null;
let _allowedAt = 0;
export async function getAllowedUsers(pool) {
  const now = Date.now();
  if (_allowedCache && now - _allowedAt < 60_000) return _allowedCache;
  const [rows] = await pool.query(
    "SELECT `key` FROM settings WHERE `group` = 'adminUsers'"
  );
  _allowedCache = new Set(rows.map((r) => r.key.toLowerCase().trim()));
  _allowedAt = now;
  return _allowedCache;
}

export function bustAllowedUsersCache() {
  _allowedCache = null;
}
