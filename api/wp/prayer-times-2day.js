// api/wp/prayer-times-2day.js (MySQL version)
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

function formatRow(r) {
  if (!r) return null;
  return {
    day:           r.day,
    month:         r.month,
    fajrAdhan:     r.fajr_adhan     || "",
    fajrIqamah:    r.fajr_iqamah    || "",
    shouruq:       r.shouruq         || "",
    dhuhrAdhan:    r.dhuhr_adhan    || "",
    dhuhrIqamah:   r.dhuhr_iqamah   || "",
    asrAdhan:      r.asr_adhan      || "",
    asrIqamah:     r.asr_iqamah     || "",
    maghribAdhan:  r.maghrib_adhan  || "",
    maghribIqamah: r.maghrib_iqamah || "",
    ishaAdhan:     r.isha_adhan     || "",
    ishaIqamah:    r.isha_iqamah    || "",
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const now      = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pool = getPool();
  const [[todayRows], [tomorrowRows]] = await Promise.all([
    pool.query(
      "SELECT * FROM prayer_times WHERE day = ? AND month = ? LIMIT 1",
      [now.getDate(), now.getMonth() + 1]
    ),
    pool.query(
      "SELECT * FROM prayer_times WHERE day = ? AND month = ? LIMIT 1",
      [tomorrow.getDate(), tomorrow.getMonth() + 1]
    ),
  ]);

  res.setHeader("Cache-Control", "public, max-age=300");
  return res.json({
    ok: true,
    today:    formatRow(todayRows[0]    || null),
    tomorrow: formatRow(tomorrowRows[0] || null),
  });
}
