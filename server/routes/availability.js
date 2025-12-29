const express = require("express");
const { db } = require("../firebaseConfig");

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(d) {
  if (!DATE_RE.test(d)) return false;
  const x = new Date(d + "T00:00:00");
  return !Number.isNaN(x.getTime());
}

function minToTime(m) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

router.get("/", async (req, res) => {
  try {
    const { photographerId, from, to } = req.query;

    if (!photographerId) return res.status(400).json({ message: "Потрібен ідентифікатор фотографа" });
    if (!from || !to) return res.status(400).json({ message: "Потрібні дати початку та кінця" });
    if (!isValidDate(from) || !isValidDate(to)) return res.status(400).json({ message: "Неправильна дата" });

    const photId = String(photographerId);

    const snap = await db
      .collection("bookings")
      .where("photographerId", "==", photId)
      .get();

    const busy = [];

    snap.docs.forEach((d) => {
      const b = d.data() || {};
      if (b.status === "cancelled") return;

      const date = String(b.date || "");
      if (!DATE_RE.test(date)) return;
      if (date < from || date > to) return;

      const startMin = Number.isFinite(b.startMin) ? Number(b.startMin) : null;
      const endMin = Number.isFinite(b.endMin) ? Number(b.endMin) : null;
      if (startMin == null || endMin == null) return;

      busy.push({
        date,
        startMin,
        endMin,
        startTime: minToTime(startMin),
        endTime: minToTime(endMin),
        service: b.serviceLabel || b.serviceId || null,
        bookingId: d.id,
      });
    });

    busy.sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date.localeCompare(b.date)));

    return res.json({ photographerId: photId, from, to, busy });
  } catch (e) {
    console.error("Помилка сервера:", e);
    return res.status(500).json({ message: "Помилка сервера", error: String(e) });
  }
});

module.exports = router;
