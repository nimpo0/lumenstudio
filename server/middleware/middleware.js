const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Нема токена" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { uid, email }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Невірний токен" });
  }
}

module.exports = { authMiddleware };
