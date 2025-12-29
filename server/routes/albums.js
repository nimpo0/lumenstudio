const express = require("express");
const { db } = require("../firebaseConfig");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Нема токена" });

    const snap = await db.collection("albums")
      .where("userId", "==", req.user.uid)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    items.sort((a, b) => {
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      return tb - ta;
    });

    return res.json(items);
  } catch (e) {
    console.error("Помилка отримання альбомів", e);
    return res.status(500).json({ message: "Помилка отримання альбомів", error: String(e) });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Нема токена" });

    const ref = db.collection("albums").doc(req.params.id);
    const snap = await ref.get();

    if (!snap.exists) return res.status(404).json({ message: "Немає альбому" });

    const data = snap.data();
    if (data.userId !== req.user.uid) return res.status(403).json({ message: "Немає доступу до альбому" });

    return res.json({ id: snap.id, ...data });
  } catch (e) {
    console.error("Помилка отримання альбому", e);
    return res.status(500).json({ message: "Помилка отримання альбому", error: String(e) });
  }
});

module.exports = router;
