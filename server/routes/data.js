const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.get("/services", async (req, res) => {
  try {
    const rows = await db.many(
      "SELECT id, title, label, short_description, description, price_from, currency, duration, image, category FROM services ORDER BY id"
    );
    const services = rows.map((r) => ({
      id: r.id,
      title: r.title,
      label: r.label || r.title,
      shortDescription: r.short_description,
      description: r.description,
      priceFrom: Number(r.price_from),
      currency: r.currency,
      duration: r.duration,
      image: r.image,
      category: r.category,
    }));
    res.json(services);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання послуг", error: String(e) });
  }
});

router.get("/photographers", async (req, res) => {
  try {
    const rows = await db.many(
      "SELECT id, name, email, specialty, experience_years, experience_label, bio, image, personal_portfolio FROM photographers ORDER BY id"
    );
    const photographers = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      specialty: r.specialty,
      experienceYears: r.experience_years,
      experienceLabel: r.experience_label,
      bio: r.bio,
      image: r.image,
      personalPortfolio: r.personal_portfolio || [],
    }));
    res.json(photographers);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання фотографів", error: String(e) });
  }
});

router.get("/portfolio", async (req, res) => {
  try {
    const rows = await db.many("SELECT id, title, image, category FROM portfolio ORDER BY id");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання портфоліо", error: String(e) });
  }
});

router.get("/studios", async (req, res) => {
  try {
    const rows = await db.many(
      "SELECT id, name, description, hourly_price, area, equipment, image, gallery FROM studios ORDER BY id"
    );
    const studios = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      hourlyPrice: Number(r.hourly_price),
      area: r.area,
      equipment: r.equipment || [],
      image: r.image,
      gallery: r.gallery || [],
    }));
    res.json(studios);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання залів", error: String(e) });
  }
});

module.exports = router;
