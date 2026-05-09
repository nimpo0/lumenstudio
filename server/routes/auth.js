const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { admin } = require("../firebaseConfig");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email) {
  return getAdminEmails().includes(String(email || "").toLowerCase());
}

function signToken(uid, email, role, photographerId) {
  return jwt.sign(
    { uid, email, role, photographerId: photographerId || null },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function userResponse(row) {
  return {
    uid: row.id,
    email: row.email,
    name: row.name || "",
    role: row.role || "client",
    photographerId: row.photographer_id || null,
  };
}

router.get("/ping", (req, res) => res.json({ ok: true, route: "auth" }));

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Потрібно вказати email та пароль" });
    }

    const existing = await db.one("SELECT id FROM users WHERE email = $1", [email]);
    if (existing) {
      return res.status(409).json({ message: "Користувач вже існує" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = isAdminEmail(email) ? "admin" : "client";
    const id = randomUUID();

    await db.query(
      `INSERT INTO users (id, email, name, password_hash, role, provider, created_at)
       VALUES ($1, $2, $3, $4, $5, 'password', NOW())`,
      [id, email, name || "", passwordHash, role]
    );

    const token = signToken(id, email, role, null);
    return res.status(201).json({
      token,
      user: { uid: id, email, name: name || "", role, photographerId: null },
    });
  } catch (e) {
    console.error("Помилка реєстрації:", e);
    return res.status(500).json({ message: "Помилка реєстрації", error: String(e) });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Потрібно вказати email та пароль" });
    }

    const user = await db.one("SELECT * FROM users WHERE email = $1", [email]);
    if (!user) {
      return res.status(401).json({ message: "Невірні облікові дані" });
    }
    if (!user.password_hash) {
      return res.status(401).json({ message: "Цей акаунт використовує інший спосіб входу" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Невірні облікові дані" });
    }

    let role = user.role || (isAdminEmail(email) ? "admin" : "client");
    if (role !== user.role) {
      await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, user.id]);
    }

    const token = signToken(user.id, user.email, role, user.photographer_id);
    return res.json({ token, user: userResponse({ ...user, role }) });
  } catch (e) {
    console.error("Помилка входу:", e);
    return res.status(500).json({ message: "Помилка входу", error: String(e) });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Потрібен idToken" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = (decoded.email || "").toLowerCase();
    const name = decoded.name || "";
    if (!email) return res.status(400).json({ message: "Google акаунт без email" });

    let user = await db.one("SELECT * FROM users WHERE email = $1", [email]);

    if (!user) {
      const role = isAdminEmail(email) ? "admin" : "client";
      const id = randomUUID();
      await db.query(
        `INSERT INTO users (id, email, name, role, provider, google_uid, created_at)
         VALUES ($1, $2, $3, $4, 'google', $5, NOW())`,
        [id, email, name, role, decoded.uid]
      );
      user = await db.one("SELECT * FROM users WHERE id = $1", [id]);
    } else if (!user.google_uid) {
      await db.query("UPDATE users SET google_uid = $1 WHERE id = $2", [decoded.uid, user.id]);
    }

    const role = user.role || (isAdminEmail(email) ? "admin" : "client");
    const token = signToken(user.id, email, role, user.photographer_id);
    return res.json({ token, user: userResponse({ ...user, role }) });
  } catch (e) {
    console.error("Помилка Google входу:", e);
    return res.status(401).json({ message: "Невалідний Google токен" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await db.one("SELECT * FROM users WHERE id = $1", [req.user.uid]);
    if (!user) return res.status(404).json({ message: "Користувача не знайдено" });

    const role = user.role || (isAdminEmail(user.email) ? "admin" : "client");
    return res.json(userResponse({ ...user, role }));
  } catch (e) {
    return res.status(500).json({ message: "Помилка отримання профілю", error: String(e) });
  }
});

router.post("/supabase-google", async (req, res) => {
  try {
    const { email, name, accessToken } = req.body;
    if (!email) return res.status(400).json({ message: "Потрібен email" });
    if (!accessToken) return res.status(400).json({ message: "Потрібен accessToken" });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const checkRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseKey,
        },
      });
      if (!checkRes.ok) {
        return res.status(401).json({ message: "Невалідний Supabase токен" });
      }
    }

    let user = await db.one("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);

    if (!user) {
      const role = isAdminEmail(email) ? "admin" : "client";
      const id = randomUUID();
      await db.query(
        `INSERT INTO users (id, email, name, role, provider, created_at)
         VALUES ($1,$2,$3,$4,'google',NOW())`,
        [id, email.toLowerCase(), name || "", role]
      );
      user = await db.one("SELECT * FROM users WHERE id = $1", [id]);
    }

    const role = user.role || (isAdminEmail(email) ? "admin" : "client");
    const token = signToken(user.id, user.email, role, user.photographer_id);
    return res.json({ token, user: userResponse({ ...user, role }) });
  } catch (e) {
    console.error("Помилка Supabase Google входу:", e);
    return res.status(500).json({ message: "Помилка входу", error: String(e) });
  }
});

router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const newName = String(req.body.name || "").trim();
    if (newName.length < 2) {
      return res.status(400).json({ message: "Ім'я має бути мінімум 2 символи" });
    }
    const user = await db.one(
      "UPDATE users SET name = $1 WHERE id = $2 RETURNING *",
      [newName, req.user.uid]
    );
    return res.json(userResponse(user));
  } catch (e) {
    return res.status(500).json({ message: "Помилка оновлення профілю", error: String(e) });
  }
});

module.exports = router;
