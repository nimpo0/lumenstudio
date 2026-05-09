const express = require("express");
const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");
const { db } = require("../db");
const { authMiddleware, requireRole } = require("../middleware/middleware");

const router = express.Router();
router.use(authMiddleware, requireRole("admin"));

const slug = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9а-яіїєґ\s-]/giu, "")
    .trim().replace(/\s+/g, "-").slice(0, 60);

async function uniqueId(table, base) {
  let id = base || `item-${Date.now()}`;
  let counter = 2;
  while (true) {
    const exists = await db.one(`SELECT id FROM ${table} WHERE id = $1`, [id]);
    if (!exists) return id;
    id = `${base}-${counter++}`;
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [bookingStats, phCount, svcCount, studioCount] = await Promise.all([
      db.one(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN date = $1 AND status != 'cancelled' THEN 1 ELSE 0 END) AS today,
                COALESCE(SUM(total),0) AS revenue
         FROM bookings`,
        [today]
      ),
      db.one("SELECT COUNT(*) AS c FROM photographers"),
      db.one("SELECT COUNT(*) AS c FROM services"),
      db.one("SELECT COUNT(*) AS c FROM studios"),
    ]);
    res.json({
      bookings: {
        total: Number(bookingStats.total),
        today: Number(bookingStats.today),
        revenue: Number(bookingStats.revenue),
      },
      photographers: Number(phCount.c),
      services: Number(svcCount.c),
      studios: Number(studioCount.c),
    });
  } catch (e) {
    res.status(500).json({ message: "Помилка статистики", error: String(e) });
  }
});

// ── Photographers ──────────────────────────────────────────────────────────
router.get("/photographers", async (req, res) => {
  try {
    const rows = await db.many("SELECT * FROM photographers ORDER BY name");
    res.json(rows.map((r) => ({
      id: r.id, name: r.name, email: r.email,
      specialty: r.specialty, experienceYears: r.experience_years,
      experienceLabel: r.experience_label, bio: r.bio, image: r.image,
    })));
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.post("/photographers", async (req, res) => {
  try {
    const { name, email, password, specialty, experienceYears, experienceLabel, bio, image } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Потрібні ім'я, email і пароль" });
    if (String(password).length < 6) return res.status(400).json({ message: "Пароль мінімум 6 символів" });

    const existingUser = await db.one("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser) return res.status(409).json({ message: "Користувач з таким email вже існує" });

    const id = await uniqueId("photographers", slug(name));

    await db.query(
      `INSERT INTO photographers (id, name, email, specialty, experience_years, experience_label, bio, image, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [id, name, email, specialty || "", Number(experienceYears) || 0, experienceLabel || "", bio || "", image || ""]
    );

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    await db.query(
      `INSERT INTO users (id, email, name, password_hash, role, photographer_id, provider, created_at)
       VALUES ($1,$2,$3,$4,'photographer',$5,'password',NOW())`,
      [userId, email, name, passwordHash, id]
    );

    res.status(201).json({ id, userId, name, email, specialty, experienceYears, experienceLabel, bio, image });
  } catch (e) {
    res.status(500).json({ message: "Помилка створення фотографа", error: String(e) });
  }
});

router.patch("/photographers/:id", async (req, res) => {
  try {
    const { name, specialty, experienceYears, experienceLabel, bio, image } = req.body;
    const updated = await db.one(
      `UPDATE photographers SET
        name = COALESCE($1, name),
        specialty = COALESCE($2, specialty),
        experience_years = COALESCE($3, experience_years),
        experience_label = COALESCE($4, experience_label),
        bio = COALESCE($5, bio),
        image = COALESCE($6, image)
       WHERE id = $7 RETURNING *`,
      [name, specialty, experienceYears != null ? Number(experienceYears) : null, experienceLabel, bio, image, req.params.id]
    );
    if (!updated) return res.status(404).json({ message: "Не знайдено" });

    if (name) await db.query("UPDATE users SET name=$1 WHERE photographer_id=$2", [name, req.params.id]);
    res.json({ id: updated.id, name: updated.name });
  } catch (e) {
    res.status(500).json({ message: "Помилка оновлення", error: String(e) });
  }
});

router.delete("/photographers/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM photographers WHERE id = $1", [req.params.id]);
    await db.query("DELETE FROM users WHERE photographer_id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Помилка видалення", error: String(e) });
  }
});

// ── Services ───────────────────────────────────────────────────────────────
router.get("/services", async (req, res) => {
  try {
    const rows = await db.many("SELECT * FROM services ORDER BY id");
    res.json(rows.map((r) => ({
      id: r.id, title: r.title, label: r.label,
      shortDescription: r.short_description, description: r.description,
      priceFrom: Number(r.price_from), currency: r.currency,
      duration: r.duration, image: r.image, category: r.category,
    })));
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.post("/services", async (req, res) => {
  try {
    const { title, label, shortDescription, description, priceFrom, currency, duration, image, category } = req.body;
    if (!title) return res.status(400).json({ message: "Потрібна назва" });
    const id = await uniqueId("services", slug(title));

    const row = await db.one(
      `INSERT INTO services (id, title, label, short_description, description, price_from, currency, duration, image, category, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
      [id, title, label || title, shortDescription || "", description || "", Number(priceFrom) || 0, currency || "UAH", duration || "", image || "", category || ""]
    );
    res.status(201).json({ ...row, priceFrom: Number(row.price_from) });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.patch("/services/:id", async (req, res) => {
  try {
    const { title, label, shortDescription, description, priceFrom, currency, duration, image, category } = req.body;
    const row = await db.one(
      `UPDATE services SET
        title = COALESCE($1, title), label = COALESCE($2, label),
        short_description = COALESCE($3, short_description),
        description = COALESCE($4, description),
        price_from = COALESCE($5, price_from), currency = COALESCE($6, currency),
        duration = COALESCE($7, duration), image = COALESCE($8, image),
        category = COALESCE($9, category)
       WHERE id = $10 RETURNING *`,
      [title, label, shortDescription, description, priceFrom != null ? Number(priceFrom) : null, currency, duration, image, category, req.params.id]
    );
    if (!row) return res.status(404).json({ message: "Не знайдено" });
    res.json({ ...row, priceFrom: Number(row.price_from) });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.delete("/services/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM services WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

// ── Studios ────────────────────────────────────────────────────────────────
router.get("/studios", async (req, res) => {
  try {
    const rows = await db.many("SELECT * FROM studios ORDER BY name");
    res.json(rows.map((r) => ({
      id: r.id, name: r.name, description: r.description,
      hourlyPrice: Number(r.hourly_price), area: r.area,
      equipment: r.equipment || [], image: r.image, gallery: r.gallery || [],
    })));
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.post("/studios", async (req, res) => {
  try {
    const { name, description, hourlyPrice, area, equipment, image, gallery } = req.body;
    if (!name) return res.status(400).json({ message: "Потрібна назва" });
    const id = await uniqueId("studios", slug(name));

    const row = await db.one(
      `INSERT INTO studios (id, name, description, hourly_price, area, equipment, image, gallery, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
      [id, name, description || "", Number(hourlyPrice) || 0, area || "",
       Array.isArray(equipment) ? equipment : [], image || "",
       Array.isArray(gallery) ? gallery : []]
    );
    res.status(201).json({ ...row, hourlyPrice: Number(row.hourly_price) });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.patch("/studios/:id", async (req, res) => {
  try {
    const { name, description, hourlyPrice, area, equipment, image, gallery } = req.body;
    const row = await db.one(
      `UPDATE studios SET
        name = COALESCE($1, name), description = COALESCE($2, description),
        hourly_price = COALESCE($3, hourly_price), area = COALESCE($4, area),
        equipment = COALESCE($5, equipment), image = COALESCE($6, image),
        gallery = COALESCE($7, gallery)
       WHERE id = $8 RETURNING *`,
      [name, description, hourlyPrice != null ? Number(hourlyPrice) : null, area,
       equipment, image, gallery, req.params.id]
    );
    if (!row) return res.status(404).json({ message: "Не знайдено" });
    res.json({ ...row, hourlyPrice: Number(row.hourly_price) });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

router.delete("/studios/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM studios WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Помилка", error: String(e) });
  }
});

module.exports = router;
