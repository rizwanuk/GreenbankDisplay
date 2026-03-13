// api/admin/device-config.js
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
    const [rows] = await pool.query("SELECT * FROM device_config ORDER BY created_at DESC");
    return res.json({ ok: true, devices: rows });
  }

  if (req.method === "POST") {
    const { device_code, device_name, display_mode, theme_override, enabled, notes } = req.body;
    if (!device_code) return res.status(400).json({ ok: false, error: "Missing device_code" });
    await pool.query(
      `INSERT INTO device_config (device_code, device_name, display_mode, theme_override, enabled, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         device_name    = VALUES(device_name),
         display_mode   = VALUES(display_mode),
         theme_override = VALUES(theme_override),
         enabled        = VALUES(enabled),
         notes          = VALUES(notes),
         updated_at     = NOW()`,
      [device_code, device_name || "", display_mode || "", theme_override || "", enabled ? 1 : 0, notes || ""]
    );
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { device_code } = req.body;
    if (!device_code) return res.status(400).json({ ok: false, error: "Missing device_code" });
    await pool.query("DELETE FROM device_config WHERE device_code = ?", [device_code]);
    return res.json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
