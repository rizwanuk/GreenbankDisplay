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
      "SELECT * FROM prayer_times ORDER BY month, day"
    );
    // Return in same shape as static JSON file
    const data = rows.map(r => ({
      "Day": String(r.day),
      "Month": String(r.month),
      "Fajr Adhan": r.fajr_adhan,
      "Fajr Iqamah": r.fajr_iqamah,
      "Shouruq": r.shouruq,
      "Dhuhr Adhan": r.dhuhr_adhan,
      "Dhuhr Iqamah": r.dhuhr_iqamah,
      "Asr Adhan": r.asr_adhan,
      "Asr Iqamah": r.asr_iqamah,
      "Maghrib Adhan": r.maghrib_adhan,
      "Maghrib Iqamah": r.maghrib_iqamah,
      "Isha Adhan": r.isha_adhan,
      "Isha Iqamah": r.isha_iqamah,
    }));
    res.setHeader("Cache-Control", "no-store");
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
