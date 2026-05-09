const express = require("express");
const { randomUUID } = require("crypto");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

router.get("/:albumId", authMiddleware, async (req, res) => {
  try {
    const row = await db.one(
      "SELECT * FROM reviews WHERE album_id = $1 AND user_id = $2",
      [req.params.albumId, req.user.uid]
    );
    res.json(row || null);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання відгуку", error: String(e) });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { albumId, rating, comment } = req.body;
    const r = Number(rating);
    if (!albumId) return res.status(400).json({ message: "Потрібно вказати albumId" });
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "Оцінка має бути від 1 до 5" });
    }

    const cleanComment = String(comment || "").trim().slice(0, 2000);

    const row = await db.one(
      `INSERT INTO reviews (id, album_id, user_id, rating, comment, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (album_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
       RETURNING *`,
      [randomUUID(), String(albumId), req.user.uid, r, cleanComment]
    );

    res.json({ ok: true, ...row });
  } catch (e) {
    res.status(500).json({ message: "Помилка збереження відгуку", error: String(e) });
  }
});

module.exports = router;
