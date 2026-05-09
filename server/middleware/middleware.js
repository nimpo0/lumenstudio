const jwt = require("jsonwebtoken");
const { db } = require("../db");

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Нема токена" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    let role = payload.role || null;
    let photographerId = payload.photographerId || null;

    if (!role) {
      const row = await db.one(
        "SELECT role, photographer_id FROM users WHERE id = $1",
        [payload.uid]
      );
      role = row?.role || "client";
      photographerId = row?.photographer_id || null;
    }

    req.user = { ...payload, role, photographerId };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Невірний токен" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Нема токена" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Недостатньо прав" });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
