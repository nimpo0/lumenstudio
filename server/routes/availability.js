const express = require("express");
const { db } = require("../db");

const router = express.Router();

function minToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

router.get("/", async (req, res) => {
  try {
    const { photographerId, studioId, from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "Потрібні дати from та to" });
    }

    const busy = [];

    if (photographerId) {
      const bookings = await db.many(
        `SELECT date, start_min, end_min, service_label
         FROM bookings
         WHERE photographer_id = $1 AND date >= $2 AND date <= $3 AND status != 'cancelled'`,
        [photographerId, from, to]
      );
      bookings.forEach((b) => {
        busy.push({
          source: "booking",
          date: b.date,
          startMin: b.start_min,
          endMin: b.end_min,
          startTime: minToTime(b.start_min),
          endTime: minToTime(b.end_min),
          service: b.service_label,
        });
      });

      const blocks = await db.many(
        `SELECT date, start_min, end_min, start_time, end_time, reason
         FROM photographer_blocks
         WHERE photographer_id = $1 AND date >= $2 AND date <= $3`,
        [photographerId, from, to]
      );
      blocks.forEach((b) => {
        busy.push({
          source: "block",
          date: b.date,
          startMin: b.start_min,
          endMin: b.end_min,
          startTime: b.start_time,
          endTime: b.end_time,
          reason: b.reason || "Заблоковано",
        });
      });
    }

    if (studioId) {
      const bookings = await db.many(
        `SELECT date, start_min, end_min
         FROM bookings
         WHERE studio_id = $1 AND date >= $2 AND date <= $3 AND status != 'cancelled'`,
        [studioId, from, to]
      );
      bookings.forEach((b) => {
        busy.push({
          source: "studio",
          date: b.date,
          startMin: b.start_min,
          endMin: b.end_min,
          startTime: minToTime(b.start_min),
          endTime: minToTime(b.end_min),
        });
      });
    }

    busy.sort((a, b) =>
      a.date === b.date ? a.startMin - b.startMin : a.date.localeCompare(b.date)
    );

    res.json({ photographerId, studioId, from, to, busy });
  } catch (e) {
    console.error("Помилка availability:", e);
    res.status(500).json({ message: "Помилка сервера", error: String(e) });
  }
});

module.exports = router;
