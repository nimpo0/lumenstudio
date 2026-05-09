const express = require("express");
const { randomUUID } = require("crypto");
const { db } = require("../db");
const { authMiddleware, requireRole } = require("../middleware/middleware");

const router = express.Router();
router.use(authMiddleware, requireRole("photographer"));

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function timeToMin(t) {
  const [hh, mm] = String(t).split(":").map(Number);
  return hh * 60 + mm;
}

router.get("/me", async (req, res) => {
  try {
    const phId = req.user.photographerId;
    if (!phId) return res.status(404).json({ message: "Профіль не знайдено" });
    const row = await db.one("SELECT * FROM photographers WHERE id = $1", [phId]);
    if (!row) return res.status(404).json({ message: "Профіль не знайдено" });
    res.json({
      id: row.id, name: row.name, email: row.email,
      specialty: row.specialty, experienceYears: row.experience_years,
      experienceLabel: row.experience_label, bio: row.bio, image: row.image,
      personalPortfolio: row.personal_portfolio || [],
    });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.patch("/me", async (req, res) => {
  try {
    const phId = req.user.photographerId;
    if (!phId) return res.status(404).json({ message: "Профіль не знайдено" });
    const { specialty, experienceYears, experienceLabel, bio, image, personalPortfolio } = req.body;

    const row = await db.one(
      `UPDATE photographers SET
        specialty = COALESCE($1, specialty),
        experience_years = COALESCE($2, experience_years),
        experience_label = COALESCE($3, experience_label),
        bio = COALESCE($4, bio),
        image = COALESCE($5, image),
        personal_portfolio = COALESCE($6, personal_portfolio)
       WHERE id = $7 RETURNING *`,
      [
        specialty, experienceYears != null ? Number(experienceYears) : null,
        experienceLabel, bio, image,
        Array.isArray(personalPortfolio) ? personalPortfolio : null,
        phId,
      ]
    );
    res.json({ id: row.id, name: row.name, specialty: row.specialty, image: row.image });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const phId = req.user.photographerId;
    if (!phId) return res.json({ today: 0, thisWeek: 0, processing: 0, avgRating: 0, reviews: 0 });

    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const [counts, ratingRow, processing] = await Promise.all([
      db.one(
        `SELECT
           SUM(CASE WHEN date = $1 THEN 1 ELSE 0 END) AS today,
           SUM(CASE WHEN date >= $1 AND date <= $2 THEN 1 ELSE 0 END) AS this_week
         FROM bookings WHERE photographer_id = $3 AND status != 'cancelled'`,
        [today, weekEndStr, phId]
      ),
      db.one(
        "SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM photographer_reviews WHERE photographer_id = $1",
        [phId]
      ),
      db.one(
        `SELECT COUNT(*) AS cnt FROM albums
         WHERE booking_id IN (SELECT id FROM bookings WHERE photographer_id = $1)
         AND status = 'processing'`,
        [phId]
      ),
    ]);

    res.json({
      today: Number(counts.today || 0),
      thisWeek: Number(counts.this_week || 0),
      processing: Number(processing.cnt || 0),
      avgRating: Math.round(Number(ratingRow.avg || 0) * 10) / 10,
      reviews: Number(ratingRow.cnt || 0),
    });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.get("/bookings", async (req, res) => {
  try {
    const phId = req.user.photographerId;
    if (!phId) return res.json([]);
    const rows = await db.many(
      `SELECT b.*, u.name AS client_name, u.email AS client_email
       FROM bookings b
       LEFT JOIN users u ON u.id = b.user_id
       WHERE b.photographer_id = $1
       ORDER BY b.date, b.time`,
      [phId]
    );
    res.json(rows.map((r) => ({
      id: r.id, date: r.date, time: r.time,
      serviceLabel: r.service_label, status: r.status,
      durationMin: r.duration_min,
      clientName: r.client_name || r.client_email || r.user_id,
      notes: r.notes,
    })));
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.patch("/bookings/:id/status", async (req, res) => {
  try {
    const allowed = ["Підтверджено", "В роботі", "Готово до видачі", "Завершено"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Недозволений статус" });

    const b = await db.one("SELECT photographer_id, id FROM bookings WHERE id = $1", [req.params.id]);
    if (!b || b.photographer_id !== req.user.photographerId) return res.status(403).json({ message: "Нема доступу" });

    await db.query("UPDATE bookings SET status = $1 WHERE id = $2", [req.body.status, b.id]);

    if (req.body.status === "Готово до видачі") {
      await db.query("UPDATE albums SET status = 'ready' WHERE booking_id = $1", [b.id]);
    }

    res.json({ ok: true, status: req.body.status });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.get("/blocks", async (req, res) => {
  try {
    const rows = await db.many(
      "SELECT * FROM photographer_blocks WHERE photographer_id = $1 ORDER BY date, start_min",
      [req.user.photographerId]
    );
    res.json(rows.map((r) => ({
      id: r.id, date: r.date,
      startTime: r.start_time, endTime: r.end_time,
      startMin: r.start_min, endMin: r.end_min,
      reason: r.reason,
    })));
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.post("/blocks", async (req, res) => {
  try {
    const phId = req.user.photographerId;
    if (!phId) return res.status(404).json({ message: "Профіль не знайдено" });
    const { date, startTime, endTime, reason } = req.body;
    if (!DATE_RE.test(date)) return res.status(400).json({ message: "Невірна дата" });
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) return res.status(400).json({ message: "Невірний час" });
    const startMin = timeToMin(startTime);
    const endMin = timeToMin(endTime);
    if (endMin <= startMin) return res.status(400).json({ message: "Кінець має бути після початку" });

    const id = randomUUID();
    await db.query(
      `INSERT INTO photographer_blocks (id, photographer_id, date, start_time, end_time, start_min, end_min, reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [id, phId, date, startTime, endTime, startMin, endMin, String(reason || "")]
    );
    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.delete("/blocks/:id", async (req, res) => {
  try {
    const b = await db.one("SELECT photographer_id FROM photographer_blocks WHERE id = $1", [req.params.id]);
    if (!b || b.photographer_id !== req.user.photographerId) return res.status(403).json({ message: "Нема доступу" });
    await db.query("DELETE FROM photographer_blocks WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.get("/albums", async (req, res) => {
  try {
    const phId = req.user.photographerId;
    if (!phId) return res.json([]);
    const rows = await db.many(
      `SELECT a.* FROM albums a
       JOIN bookings b ON b.id = a.booking_id
       WHERE b.photographer_id = $1`,
      [phId]
    );
    res.json(rows.map((r) => ({
      id: r.id, bookingId: r.booking_id, title: r.title,
      status: r.status, message: r.message, cover: r.cover,
      photos: r.photos || [],
    })));
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.patch("/albums/:id", async (req, res) => {
  try {
    const phId = req.user.photographerId;
    const album = await db.one("SELECT * FROM albums WHERE id = $1", [req.params.id]);
    if (!album) return res.status(404).json({ message: "Не знайдено" });

    const booking = await db.one("SELECT photographer_id FROM bookings WHERE id = $1", [album.booking_id]);
    if (!booking || booking.photographer_id !== phId) return res.status(403).json({ message: "Нема доступу" });

    const { photos, cover, status, message, title } = req.body;
    const sets = [];
    const vals = [];
    let i = 1;
    if (Array.isArray(photos)) { sets.push(`photos = $${i++}`); vals.push(photos); }
    if (cover !== undefined) { sets.push(`cover = $${i++}`); vals.push(cover); }
    if (status !== undefined) { sets.push(`status = $${i++}`); vals.push(status); }
    if (message !== undefined) { sets.push(`message = $${i++}`); vals.push(message); }
    if (title !== undefined) { sets.push(`title = $${i++}`); vals.push(title); }
    if (sets.length === 0) return res.json(album);

    vals.push(req.params.id);
    const updated = await db.one(
      `UPDATE albums SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );
    res.json({ id: updated.id, status: updated.status, photos: updated.photos || [] });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

module.exports = router;
