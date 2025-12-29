const express = require("express");
const { db } = require("../firebaseConfig");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

router.get("/:albumId", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Неправильний користувач" });

    const albumId = String(req.params.albumId);

    const snap = await db.collection("reviews")
      .where("albumId", "==", albumId)
      .where("userId", "==", req.user.uid)
      .limit(1)
      .get();

    if (snap.empty) return res.json(null);

    const doc = snap.docs[0];
    return res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    console.error("Помилка отримання відгуку:", e);
    return res.status(500).json({ message: "Помилка отримання відгуку", error: String(e) });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Неправильний користувач" });

    const { albumId, rating, comment } = req.body;

    const r = Number(rating);
    if (!albumId) return res.status(400).json({ message: "Потрібно вказати albumId" });
    if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ message: "Оцінка має бути від 1 до 5" });

    const cleanComment = String(comment || "").trim().slice(0, 2000);

    const snap = await db.collection("reviews")
      .where("albumId", "==", String(albumId))
      .where("userId", "==", req.user.uid)
      .limit(1)
      .get();

    const data = {
      albumId: String(albumId),
      userId: req.user.uid,
      rating: r,
      comment: cleanComment,
      updatedAt: new Date().toISOString(),
    };

    if (!snap.empty) {
      const doc = snap.docs[0];
      await db.collection("reviews").doc(doc.id).update(data);
      return res.json({ ok: true, id: doc.id, ...data });
    } else {
      const ref = await db.collection("reviews").add({
        ...data,
        createdAt: new Date().toISOString(),
      });
      return res.status(201).json({ ok: true, id: ref.id, ...data });
    }
  } catch (e) {
    console.error("Помилка збереження відгуку:", e);
    return res.status(500).json({ message: "Помилка збереження відгуку", error: String(e) });
  }
});

module.exports = router;
