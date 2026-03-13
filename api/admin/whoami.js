import { verifyMicrosoftToken, getAllowedUsers } from "./_auth.js";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: process.env.MYSQL_PORT || 3306,
  database: process.env.MYSQL_DATABASE || "greenbank",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD,
  socketPath: process.env.MYSQL_SOCKET || undefined,
});

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing Bearer token" });
    }

    const email = await verifyMicrosoftToken(token);
    const allowed = await getAllowedUsers(pool);

    if (!allowed.has(email)) {
      return res.status(403).json({ ok: false, error: "Not authorised", email });
    }

    return res.status(200).json({ ok: true, email });
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: err?.message || String(err),
    });
  }
}
