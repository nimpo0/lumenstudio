const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { db } = require("../firebaseConfig");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

router.get("/ping", (req, res) => res.json({ ok: true, route: "auth" }));

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Потрібно вказати email та пароль" });
    }

    const existing = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ message: "Користувач вже існує" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userRef = await db.collection("users").add({
      email,
      name: name || "",
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    const token = jwt.sign(
      { uid: userRef.id, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: { uid: userRef.id, email, name: name || "" },
    });
  } catch (e) {
    return res.status(500).json({ message: "Помилка реєстрації", error: String(e) });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Потрібно вказати email та пароль" });
    }

    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (snap.empty) {
      return res.status(401).json({ message: "Невірні облікові дані" });
    }

    const doc = snap.docs[0];
    const user = doc.data();

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Невірні облікові дані" });
    }

    const token = jwt.sign(
      { uid: doc.id, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { uid: doc.id, email: user.email, name: user.name || "" },
    });
  } catch (e) {
    return res.status(500).json({ message: "Помилка входу", error: String(e) });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Користувача не знайдено" });
    }

    const data = userDoc.data();
    return res.json({
      uid: req.user.uid,
      email: data.email,
      name: data.name || "",
    });
  } catch (e) {
    return res.status(500).json({ message: "Помилка отримання інформації про користувача", error: String(e) });
  }
});

module.exports = router;
