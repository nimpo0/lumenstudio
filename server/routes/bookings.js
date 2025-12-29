const express = require("express");
const { db } = require("../firebaseConfig");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(d) {
  if (!DATE_RE.test(d)) return false;
  const x = new Date(d + "T00:00:00");
  return !Number.isNaN(x.getTime());
}

function isFutureOrToday(d) {
  const today = new Date();
  const t = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  const x = new Date(d + "T00:00:00");
  return x >= t;
}

function timeToMin(t) {
  const [hh, mm] = String(t).split(":").map(Number);
  return hh * 60 + mm;
}

function minToTime(m) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function parseDurationToMinutes(raw) {
  if (!raw) return 60;

  const s = String(raw).trim().toLowerCase().replace(",", ".");

  const hourMatch = s.match(/(\d+(\.\d+)?)\s*(годин|година|години?)/i);
  if (hourMatch) return Math.max(1, Math.round(Number(hourMatch[1]) * 60));

  return 60;
}

router.get("/ping", (req, res) => res.json({ ok: true }));

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Нема токена" });

    const {
      date,
      time,
      photographerId,
      serviceId,
      serviceLabel,
      servicePrice,
      additional,
      notes,
      total,
    } = req.body;

    if (!date || !time) {
      return res.status(400).json({ message: "Потрібно вказати дату та час" });
    }
    if (!isValidDate(date) || !isFutureOrToday(date)) {
      return res.status(400).json({ message: "Невірна дата" });
    }
    if (!TIME_RE.test(time)) {
      return res.status(400).json({ message: "Невірний час" });
    }
    if (!serviceId) {
      return res.status(400).json({ message: "Потрібно вказати сервіс" });
    }

    const photId = photographerId ? String(photographerId) : null;

    let photographerLabel = null;

    if (photId) {
      const photDoc = await db.collection("photographers").doc(photId).get();
      if (!photDoc.exists) {
        return res.status(400).json({ message: "Фотограф не знайдений" });
      }

      const photographerData = photDoc.data() || {};
      photographerLabel = String(photographerData.fullName || photographerData.label || "").trim() || photId;
    }

    const serviceDoc = await db.collection("services").doc(String(serviceId)).get();
    const serviceData = serviceDoc.exists ? (serviceDoc.data() || {}) : {};
    const durationText = serviceData.duration || serviceData.durationText || serviceData.time || "";
    const durationMin = parseDurationToMinutes(durationText);

    const startMin = timeToMin(time);
    const endMin = startMin + durationMin;

    if (photId) {
      const snap = await db
        .collection("bookings")
        .where("photographerId", "==", photId)
        .where("date", "==", date)
        .get();

      for (const d of snap.docs) {
        const b = d.data() || {};
        if (b.status === "cancelled") continue;

        const bStart = Number.isFinite(b.startMin)
          ? Number(b.startMin)
          : timeToMin(b.time || "00:00");

        const bDuration = Number.isFinite(b.durationMin)
          ? Number(b.durationMin)
          : parseDurationToMinutes(b.durationText || b.duration || "");

        const bEnd = Number.isFinite(b.endMin) ? Number(b.endMin) : (bStart + (bDuration || 60));

        if (intervalsOverlap(startMin, endMin, bStart, bEnd)) {
          return res.status(409).json({
            message: "Цей слот перекривається з існуючим бронюванням для обраного фотографа",
            code: "SLOT_TAKEN",
            overlap: {
              existingId: d.id,
              existingStart: minToTime(bStart),
              existingEnd: minToTime(bEnd),
            },
          });
        }
      }
    }

    const status = photId ? "Підтверджено" : "pending_assignment";
    const slotKey = photId ? `${photId}_${date}_${time}` : null;

    const bookingData = {
      userId: req.user.uid,
      createdAt: new Date().toISOString(),
      date,
      time,

      serviceId,
      serviceLabel: serviceLabel || serviceData.label || serviceData.title || serviceId,
      servicePrice: Number(servicePrice || serviceData.priceFrom || serviceData.price || 0),

      durationText: durationText || null,
      durationMin,
      startMin,
      endMin,

      photographerId: photId,
      photographerLabel,

      additional: Array.isArray(additional) ? additional : [],
      notes: String(notes || ""),
      slotKey,
      status,
      total: Number(total || 0),
    };

    const bookingRef = await db.collection("bookings").add(bookingData);

    await db.collection("albums").doc(bookingRef.id).set({
      userId: req.user.uid,
      bookingId: bookingRef.id,
      title: `Альбом • ${bookingData.serviceLabel || "Фотосесія"}`,
      status: "processing",
      message: "Очікуйте, фотограф обробляє ваші фото. Як тільки вони будуть готові — вони з’являться тут.",
      cover: null,
      photos: [],
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ id: bookingRef.id, ...bookingData });
  } catch (e) {
    console.error("Помилка створення бронювання:", e);
    return res.status(500).json({ message: "Помилка створення бронювання", error: String(e) });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Неправильний користувач" });

    const snap = await db.collection("bookings").where("userId", "==", req.user.uid).get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    items.sort((a, b) => {
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      return tb - ta;
    });

    return res.json(items);
  } catch (e) {
    console.error("Помилка отримання бронювань:", e);
    return res.status(500).json({ message: "Помилка отримання бронювань", error: String(e) });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Неправильний користувач" });

    const id = req.params.id;

    const ref = db.collection("bookings").doc(id);
    const docSnap = await ref.get();

    if (!docSnap.exists) return res.status(404).json({ message: "Немає бронювання" });
    if (docSnap.data().userId !== req.user.uid) {
      return res.status(403).json({ message: "Немає доступу до цього бронювання" });
    }

    await ref.delete();
    await db.collection("albums").doc(id).delete().catch(() => {});

    return res.json({ ok: true });
  } catch (e) {
    console.error("Помилка скасування бронювання:", e);
    return res.status(500).json({ message: "Помилка скасування бронювання", error: String(e) });
  }
});

module.exports = router;
