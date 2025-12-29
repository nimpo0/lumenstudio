const express = require("express");
const { db } = require("../firebaseConfig");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

router.get("/:photographerId", async (req, res) => {
  try {
    const photographerId = String(req.params.photographerId);

    const snap = await db.collection("photographer_reviews")
      .where("photographerId", "==", photographerId)
      .limit(50)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

    return res.json(items.slice(0, 20));
  } catch (e) {
    console.error("Помилка отримання відгуків:", e);
    return res.status(500).json({ message: "Помилка отримання відгуків", error: String(e) });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Неавторизований користувач" });

    const { photographerId, rating, comment } = req.body;

    if (!photographerId) return res.status(400).json({ message: "Потрібен ідентифікатор фотографа" });
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "rating must be 1..5" });
    }

    const cleanComment = String(comment || "").trim().slice(0, 2000);

    const data = {
      photographerId: String(photographerId),
      userId: req.user.uid,
      userEmail: req.user.email || null,
      rating: r,
      comment: cleanComment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await db.collection("photographer_reviews").add(data);
    return res.status(201).json({ ok: true, id: ref.id, ...data });
  } catch (e) {
    console.error("Помилка збереження відгуку:", e);
    return res.status(500).json({ message: "Помилка збереження відгуку", error: String(e) });
  }
});

module.exports = router;
