const express = require("express");
const { randomUUID } = require("crypto");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(d) {
  if (!DATE_RE.test(d)) return false;
  return !Number.isNaN(new Date(d + "T00:00:00").getTime());
}

function isFutureOrToday(d) {
  const today = new Date().toISOString().slice(0, 10);
  return d >= today;
}

function timeToMin(t) {
  const [hh, mm] = String(t).split(":").map(Number);
  return hh * 60 + mm;
}

function minToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function parseDurationToMinutes(raw) {
  if (!raw) return 60;
  const s = String(raw).trim().toLowerCase().replace(",", ".");
  const m = s.match(/(\d+(\.\d+)?)\s*(годин|година|години?)/i);
  if (m) return Math.max(1, Math.round(Number(m[1]) * 60));
  return 60;
}

function bookingRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    date: r.date,
    time: r.time,
    serviceId: r.service_id,
    serviceLabel: r.service_label,
    servicePrice: Number(r.service_price),
    photographerId: r.photographer_id,
    photographerLabel: r.photographer_label,
    studioId: r.studio_id,
    studioLabel: r.studio_label,
    studioPrice: Number(r.studio_price || 0),
    durationMin: r.duration_min,
    startMin: r.start_min,
    endMin: r.end_min,
    additional: r.additional || [],
    notes: r.notes,
    status: r.status,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    total: Number(r.total),
    createdAt: r.created_at,
    rescheduledAt: r.rescheduled_at,
  };
}

async function checkConflicts({ photographerId, studioId, date, startMin, endMin, excludeId }) {
  const conflicts = [];

  if (photographerId) {
    const bookings = await db.many(
      `SELECT id, start_min, end_min FROM bookings
       WHERE photographer_id = $1 AND date = $2 AND status != 'cancelled'
       ${excludeId ? "AND id != $3" : ""}`,
      excludeId ? [photographerId, date, excludeId] : [photographerId, date]
    );
    for (const b of bookings) {
      if (intervalsOverlap(startMin, endMin, b.start_min, b.end_min)) {
        conflicts.push({ type: "photographer", existingId: b.id });
      }
    }

    const blocks = await db.many(
      "SELECT start_min, end_min FROM photographer_blocks WHERE photographer_id = $1 AND date = $2",
      [photographerId, date]
    );
    for (const b of blocks) {
      if (intervalsOverlap(startMin, endMin, b.start_min, b.end_min)) {
        conflicts.push({ type: "block" });
      }
    }
  }

  if (studioId) {
    const bookings = await db.many(
      `SELECT id, start_min, end_min FROM bookings
       WHERE studio_id = $1 AND date = $2 AND status != 'cancelled'
       ${excludeId ? "AND id != $3" : ""}`,
      excludeId ? [studioId, date, excludeId] : [studioId, date]
    );
    for (const b of bookings) {
      if (intervalsOverlap(startMin, endMin, b.start_min, b.end_min)) {
        conflicts.push({ type: "studio", existingId: b.id });
      }
    }
  }

  return conflicts;
}

router.get("/ping", (req, res) => res.json({ ok: true }));

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      date, time, photographerId, studioId, serviceId,
      serviceLabel, servicePrice, additional, notes, total, paymentMethod,
    } = req.body;

    if (!date || !time) return res.status(400).json({ message: "Потрібно вказати дату та час" });
    if (!isValidDate(date) || !isFutureOrToday(date)) return res.status(400).json({ message: "Невірна дата" });
    if (!TIME_RE.test(time)) return res.status(400).json({ message: "Невірний час" });
    if (!serviceId) return res.status(400).json({ message: "Потрібно вказати сервіс" });

    const photId = photographerId ? String(photographerId) : null;
    const stuId = studioId ? String(studioId) : null;

    const svc = await db.one("SELECT duration FROM services WHERE id = $1", [serviceId]);
    const durationText = svc?.duration || "";
    const durationMin = parseDurationToMinutes(durationText);
    const startMin = timeToMin(time);
    const endMin = startMin + durationMin;
    const studioHours = Math.max(1, Math.ceil(durationMin / 60));

    let photographerLabel = null;
    if (photId) {
      const ph = await db.one("SELECT name FROM photographers WHERE id = $1", [photId]);
      if (!ph) return res.status(400).json({ message: "Фотограф не знайдений" });
      photographerLabel = ph.name;
    }

    let studioLabel = null;
    let studioPrice = 0;
    if (stuId) {
      const st = await db.one("SELECT name, hourly_price FROM studios WHERE id = $1", [stuId]);
      if (!st) return res.status(400).json({ message: "Зал не знайдено" });
      studioLabel = st.name;
      studioPrice = Number(st.hourly_price || 0) * studioHours;
    }

    const additionalArray = Array.isArray(additional) ? additional : [];
    const additionalSum = additionalArray.reduce(
      (sum, a) => sum + (Number(a?.price) || 0),
      0
    );
    const computedTotal = Number(servicePrice || 0) + studioPrice + additionalSum;

    const conflicts = await checkConflicts({ photographerId: photId, studioId: stuId, date, startMin, endMin });
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return res.status(409).json({
        message: c.type === "block" ? "Цей час заблокований фотографом"
          : c.type === "studio" ? "Зал у цей час вже зайнятий"
          : "Цей час вже зайнятий для обраного фотографа",
        code: "SLOT_TAKEN",
        conflicts,
      });
    }

    const status = photId ? "Підтверджено" : "pending_assignment";
    const slotKey = photId ? `${photId}_${date}_${time}` : null;
    const id = randomUUID();

    await db.query(
      `INSERT INTO bookings (
        id, user_id, date, time, service_id, service_label, service_price,
        photographer_id, photographer_label, studio_id, studio_label, studio_price,
        duration_text, duration_min, start_min, end_min,
        additional, notes, slot_key, status,
        payment_method, payment_status, total, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'pending',$22,NOW()
      )`,
      [
        id, req.user.uid, date, time, serviceId,
        serviceLabel || svc?.title || serviceId, Number(servicePrice || 0),
        photId, photographerLabel, stuId, studioLabel, studioPrice,
        durationText || null, durationMin, startMin, endMin,
        JSON.stringify(additionalArray),
        String(notes || ""), slotKey, status,
        paymentMethod === "online" ? "online" : "onsite",
        computedTotal,
      ]
    );

    await db.query(
      `INSERT INTO albums (id, user_id, booking_id, title, status, message, photos, created_at)
       VALUES ($1, $2, $3, $4, 'processing', $5, '{}', NOW())`,
      [
        id,
        req.user.uid,
        id,
        `Альбом • ${serviceLabel || serviceId}`,
        "Очікуйте, фотограф обробляє ваші фото.",
      ]
    );

    const created = await db.one("SELECT * FROM bookings WHERE id = $1", [id]);
    return res.status(201).json(bookingRow(created));
  } catch (e) {
    console.error("Помилка створення бронювання:", e);
    return res.status(500).json({ message: "Помилка створення бронювання", error: String(e) });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const rows = await db.many(
      "SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.uid]
    );
    res.json(rows.map(bookingRow));
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання бронювань", error: String(e) });
  }
});

router.patch("/:id/reschedule", authMiddleware, async (req, res) => {
  try {
    const { date, time } = req.body;
    if (!isValidDate(date) || !isFutureOrToday(date)) return res.status(400).json({ message: "Невірна дата" });
    if (!TIME_RE.test(time)) return res.status(400).json({ message: "Невірний час" });

    const b = await db.one("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    if (!b) return res.status(404).json({ message: "Бронювання не знайдено" });

    const isOwner = b.user_id === req.user.uid;
    const isPhotog = req.user.role === "photographer" && b.photographer_id === req.user.photographerId;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isPhotog && !isAdmin) return res.status(403).json({ message: "Нема доступу" });

    const startTs = new Date(`${b.date}T${b.time}:00`).getTime();
    if (!Number.isNaN(startTs) && startTs > Date.now() && startTs - Date.now() < 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: "Перенесення доступне не пізніше ніж за 24 години до сесії" });
    }

    const startMin = timeToMin(time);
    const durationMin = b.duration_min || parseDurationToMinutes(b.duration_text || "");
    const endMin = startMin + (durationMin || 60);

    const conflicts = await checkConflicts({
      photographerId: b.photographer_id,
      studioId: b.studio_id,
      date, startMin, endMin,
      excludeId: b.id,
    });
    if (conflicts.length > 0) {
      return res.status(409).json({ message: "Новий час перетинається з іншим бронюванням", code: "SLOT_TAKEN" });
    }

    const updated = await db.one(
      `UPDATE bookings
       SET date=$1, time=$2, start_min=$3, end_min=$4, duration_min=$5,
           slot_key=$6, rescheduled_at=NOW()
       WHERE id=$7 RETURNING *`,
      [
        date, time, startMin, endMin, durationMin || 60,
        b.photographer_id ? `${b.photographer_id}_${date}_${time}` : null,
        b.id,
      ]
    );
    res.json(bookingRow(updated));
  } catch (e) {
    console.error("Помилка перенесення:", e);
    res.status(500).json({ message: "Помилка перенесення", error: String(e) });
  }
});

router.post("/:id/pay", authMiddleware, async (req, res) => {
  try {
    const b = await db.one("SELECT user_id FROM bookings WHERE id = $1", [req.params.id]);
    if (!b) return res.status(404).json({ message: "Не знайдено" });
    if (b.user_id !== req.user.uid) return res.status(403).json({ message: "Нема доступу" });

    const paymentMethod = req.body.method === "online" ? "online" : "onsite";
    const paymentStatus = paymentMethod === "online" ? "paid" : "pending";

    await db.query(
      "UPDATE bookings SET payment_method=$1, payment_status=$2, paid_at=$3 WHERE id=$4",
      [paymentMethod, paymentStatus, paymentStatus === "paid" ? new Date() : null, req.params.id]
    );
    res.json({ ok: true, paymentMethod, paymentStatus });
  } catch (e) {
    res.status(500).json({ message: "Помилка оплати", error: String(e) });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const b = await db.one("SELECT user_id FROM bookings WHERE id = $1", [req.params.id]);
    if (!b) return res.status(404).json({ message: "Немає бронювання" });
    if (b.user_id !== req.user.uid) return res.status(403).json({ message: "Немає доступу" });

    await db.query("DELETE FROM bookings WHERE id = $1", [req.params.id]);
    await db.query("DELETE FROM albums WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Помилка скасування", error: String(e) });
  }
});

module.exports = router;
