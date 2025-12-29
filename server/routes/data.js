const express = require("express");
const { db } = require("../firebaseConfig");

const router = express.Router();

function normalizeDoc(doc) {
  const data = doc.data() || {};
  return { ...data, id: data.id || doc.id };
}

function sortByIdUk(a, b) {
  return String(a.id).localeCompare(String(b.id), "uk", { numeric: true });
}

router.get("/services", async (req, res) => {
  try {
    const snap = await db.collection("services").get();
    const services = snap.docs.map(normalizeDoc).sort(sortByIdUk);
    res.json(services);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання сервісів", error: String(e) });
  }
});

router.get("/photographers", async (req, res) => {
  try {
    const snap = await db.collection("photographers").get();
    const photographers = snap.docs.map(normalizeDoc).sort(sortByIdUk);
    res.json(photographers);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання фотографів", error: String(e) });
  }
});

router.get("/portfolio", async (req, res) => {
  try {
    const snap = await db.collection("portfolio").get();
    const portfolio = snap.docs.map(normalizeDoc).sort(sortByIdUk);
    res.json(portfolio);
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання портфоліо", error: String(e) });
  }
});

module.exports = router;
