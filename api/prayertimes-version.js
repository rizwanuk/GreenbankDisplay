import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: process.env.MYSQL_PORT || 3306,
  database: process.env.MYSQL_DATABASE || "greenbank",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD,
});

export default async function handler(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT MAX(updated_at) as last_updated FROM prayer_times"
    );
    res.setHeader("Cache-Control", "no-store");
    return res.json({ lastUpdated: rows[0]?.last_updated || "" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
