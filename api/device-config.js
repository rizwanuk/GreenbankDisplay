// api/device-config.js
// Public endpoint — display screens poll this to get their remote config
import mysql from "mysql2/promise";

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
  const { code } = req.query;
  if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

  const pool = getPool();

  // Update last_seen and return config
  const [[rows]] = await Promise.all([
    pool.query("SELECT * FROM device_config WHERE device_code = ?", [code]),
    pool.query("UPDATE device_config SET last_seen = NOW() WHERE device_code = ?", [code]),
  ]);

  if (!rows.length) {
    return res.json({ ok: true, data: null }); // unknown device — no overrides
  }

  const row = rows[0];
  return res.json({
    ok: true,
    data: {
      enabled:      row.enabled === 1,
      displayMode:  row.display_mode  || null,
      themeOverride: row.theme_override || null,
      deviceName:   row.device_name   || null,
    },
  });
}
