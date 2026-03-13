import { broadcast } from "../events.js";
// api/admin/settings.js (MySQL version)
import mysql from "mysql2/promise";
import { verifyMicrosoftToken, getAllowedUsers } from "./_auth.js";

function getPool() {
  if (!getPool._pool) {
    getPool._pool = mysql.createPool({
      host:     process.env.MYSQL_HOST     || "127.0.0.1",
      port:     Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE || "greenbank",
      user:     process.env.MYSQL_USER     || "root",
      password: process.env.MYSQL_PASSWORD || "",
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
    });
  }
  return getPool._pool;
}

export default async function handler(req, res) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ ok: false, error: "Missing bearer token" });

  let email;
  try {
    email = await verifyMicrosoftToken(token);
  } catch (e) {
    return res.status(401).json({ ok: false, error: e.message || "Invalid token" });
  }

  const pool = getPool();
  const allowed = await getAllowedUsers(pool);
  if (!allowed.has(email)) {
    return res.status(403).json({ ok: false, error: `${email} is not an admin user` });
  }

  if (req.method === "GET") {
    const [dbRows] = await pool.query(
      "SELECT `group`, `key`, `value` FROM settings ORDER BY `group`, `key`"
    );
    const rows = [
      ["Group", "Key", "Value"],
      ...dbRows.map((r) => [r.group, r.key, r.value ?? ""]),
    ];
    return res.json({ ok: true, email, rows });
  }

  if (req.method === "POST") {
    const { updates } = req.body || {};
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ ok: false, error: "No updates provided" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const u of updates) {
        const group = String(u.Group || "").trim();
        const key   = String(u.Key   || "").trim();
        const value = String(u.Value ?? "");
        if (!group || !key) continue;
        if (group === "adminUsers") continue;
        await conn.execute(
          `INSERT INTO settings (\`group\`, \`key\`, \`value\`)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
          [group, key, value]
        );
      }
      await conn.execute(
        `INSERT INTO settings (\`group\`, \`key\`, \`value\`)
         VALUES ('meta', 'lastUpdated', NOW())
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
        
      );
      await conn.commit();
      broadcast({ type: "update", source: "settings" });
      return res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
