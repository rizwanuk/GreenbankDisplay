import { broadcast } from "../events.js";
// api/admin/prayertimes.js (MySQL version)
import mysql from "mysql2/promise";
import { verifyMicrosoftToken, getAllowedUsers } from "./_auth.js";

const HEADERS = [
  "Day", "Month",
  "Fajr Adhan", "Fajr Iqamah", "Shouruq",
  "Dhuhr Adhan", "Dhuhr Iqamah",
  "Asr Adhan", "Asr Iqamah",
  "Maghrib Adhan", "Maghrib Iqamah",
  "Isha Adhan", "Isha Iqamah",
];

const COL_MAP = {
  1: "day", 2: "month",
  3: "fajr_adhan", 4: "fajr_iqamah", 5: "shouruq",
  6: "dhuhr_adhan", 7: "dhuhr_iqamah",
  8: "asr_adhan", 9: "asr_iqamah",
  10: "maghrib_adhan", 11: "maghrib_iqamah",
  12: "isha_adhan", 13: "isha_iqamah",
};

const READONLY_COLS = new Set(["day", "month"]);

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

function isValidTime(v) {
  if (!v) return true;
  return /^\d{2}:\d{2}$/.test(v);
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
      `SELECT day, month,
              fajr_adhan, fajr_iqamah, shouruq,
              dhuhr_adhan, dhuhr_iqamah,
              asr_adhan, asr_iqamah,
              maghrib_adhan, maghrib_iqamah,
              isha_adhan, isha_iqamah
       FROM prayer_times ORDER BY month, day`
    );
    const rows = dbRows.map((r) => [
      r.day, r.month,
      r.fajr_adhan    || "", r.fajr_iqamah   || "", r.shouruq        || "",
      r.dhuhr_adhan   || "", r.dhuhr_iqamah  || "",
      r.asr_adhan     || "", r.asr_iqamah    || "",
      r.maghrib_adhan || "", r.maghrib_iqamah|| "",
      r.isha_adhan    || "", r.isha_iqamah   || "",
    ]);
    return res.json({ ok: true, sheet: "PrayerTimes", headers: HEADERS, rows });
  }

  if (req.method === "POST") {
    const { patches } = req.body || {};
    if (!Array.isArray(patches) || patches.length === 0) {
      return res.status(400).json({ ok: false, error: "No patches provided" });
    }

    const [orderedRows] = await pool.query(
      "SELECT id, day, month FROM prayer_times ORDER BY month, day"
    );

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const patch of patches) {
        const rowIndex = patch.r - 2;
        const colIndex = patch.c;
        const value    = String(patch.value ?? "").trim();

        if (rowIndex < 0 || rowIndex >= orderedRows.length) {
          return res.status(400).json({ ok: false, error: `Row ${patch.r} out of range` });
        }
        const colName = COL_MAP[colIndex];
        if (!colName) {
          return res.status(400).json({ ok: false, error: `Unknown column ${colIndex}` });
        }
        if (READONLY_COLS.has(colName)) {
          return res.status(400).json({ ok: false, error: `Column ${colName} is read-only` });
        }
        if (!isValidTime(value)) {
          return res.status(400).json({ ok: false, error: `Invalid time "${value}"` });
        }
        const { id } = orderedRows[rowIndex];
        await conn.execute(
          `UPDATE prayer_times SET \`${colName}\` = ? WHERE id = ?`,
          [value || null, id]
        );
      }
      await conn.execute("INSERT INTO settings (`group`, `key`, `value`) VALUES ('meta', 'lastUpdated', NOW()) ON DUPLICATE KEY UPDATE `value` = NOW()");
      await conn.commit();
      broadcast({ type: "update", source: "prayertimes" });
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
