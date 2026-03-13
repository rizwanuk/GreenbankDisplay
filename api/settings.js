// api/settings.js (MySQL version)
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
const PRIVATE_GROUPS = new Set(["adminUsers"]);
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  const [dbRows] = await getPool().query(
    "SELECT `group`, `key`, `value` FROM settings ORDER BY `group`, `key`"
  );
  const rows = dbRows
    .filter((r) => !PRIVATE_GROUPS.has(r.group))
    .map((r) => ({ Group: r.group, Key: r.key, Value: r.value ?? "" }));
  res.setHeader("Cache-Control", "public, max-age=15");
  return res.json({ ok: true, rows });
}
