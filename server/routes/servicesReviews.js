const express = require("express");
const { db } = require("../firebaseConfig");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

router.get("/:serviceId", async (req, res) => {
  try {
    const serviceId = String(req.params.serviceId);

    const snap = await db
      .collection("service_reviews")
      .where("serviceId", "==", serviceId)
      .limit(100)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return res.json(items.slice(0, 20));
  } catch (e) {
    console.error("Помилка отримання відгуків:", e);
    return res.status(500).json({ message: "Помилка отримання відгуків", error: String(e) });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Неавторизований користувач" });

    const { serviceId, rating, comment } = req.body;

    if (!serviceId) return res.status(400).json({ message: "Потрібен ідентифікатор послуги" });

    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "Оцінка має бути від 1 до 5" });
    }

    const cleanComment = String(comment || "").trim().slice(0, 2000);

    const data = {
      serviceId: String(serviceId),
      userId: req.user.uid,
      userEmail: req.user.email || null,
      rating: r,
      comment: cleanComment,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection("service_reviews").add(data);
    return res.status(201).json({ ok: true, id: ref.id, ...data });
  } catch (e) {
    console.error("Помилка збереження відгуку:", e);
    return res.status(500).json({ message: "Помилка збереження відгуку", error: String(e) });
  }
});

module.exports = router;
