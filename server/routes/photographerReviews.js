const express = require("express");
const { randomUUID } = require("crypto");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

router.get("/:photographerId", async (req, res) => {
  try {
    const rows = await db.many(
      `SELECT * FROM photographer_reviews
       WHERE photographer_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.params.photographerId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання відгуків", error: String(e) });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { photographerId, rating, comment } = req.body;
    if (!photographerId) return res.status(400).json({ message: "Потрібен photographerId" });
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "Оцінка має бути від 1 до 5" });
    }

    const row = await db.one(
      `INSERT INTO photographer_reviews (id, photographer_id, user_id, user_email, rating, comment, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        randomUUID(),
        String(photographerId),
        req.user.uid,
        req.user.email || null,
        r,
        String(comment || "").trim().slice(0, 2000),
      ]
    );
    res.status(201).json({ ok: true, ...row });
  } catch (e) {
    res.status(500).json({ message: "Помилка збереження відгуку", error: String(e) });
  }
});

module.exports = router;
