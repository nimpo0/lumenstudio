const express = require("express");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

function albumRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    bookingId: r.booking_id,
    title: r.title,
    status: r.status,
    message: r.message,
    cover: r.cover,
    photos: r.photos || [],
    createdAt: r.created_at,
  };
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const rows = await db.many(
      "SELECT * FROM albums WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.uid]
    );
    res.json(rows.map(albumRow));
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання альбомів", error: String(e) });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const row = await db.one("SELECT * FROM albums WHERE id = $1", [req.params.id]);
    if (!row) return res.status(404).json({ message: "Немає альбому" });
    if (row.user_id !== req.user.uid) {
      return res.status(403).json({ message: "Немає доступу до альбому" });
    }
    res.json(albumRow(row));
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання альбому", error: String(e) });
  }
});

module.exports = router;
