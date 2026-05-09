const express = require("express");
const { randomUUID } = require("crypto");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

router.get("/:serviceId", async (req, res) => {
  try {
    const rows = await db.many(
      `SELECT * FROM service_reviews
       WHERE service_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.params.serviceId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання відгуків", error: String(e) });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body;
    if (!serviceId) return res.status(400).json({ message: "Потрібен serviceId" });
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "Оцінка має бути від 1 до 5" });
    }

    const row = await db.one(
      `INSERT INTO service_reviews (id, service_id, user_id, user_email, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        randomUUID(),
        String(serviceId),
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
