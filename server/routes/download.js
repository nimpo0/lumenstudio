const express = require("express");
const https = require("https");
const http = require("http");
const { authMiddleware } = require("../middleware/middleware");

const router = express.Router();

function fetchAsBuffer(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects < 0) return reject(new Error("Too many redirects"));

    const client = url.startsWith("https") ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "uk,en-US;q=0.9,en;q=0.8",
          Referer: url,
        },
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchAsBuffer(res.headers.location, redirects - 1)
            .then(resolve)
            .catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "image/jpeg",
          })
        );
        res.on("error", reject);
      }
    );

    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.on("error", reject);
  });
}

router.get("/", authMiddleware, async (req, res) => {
  const { url, filename = "photo.jpg" } = req.query;

  if (!url) return res.status(400).json({ message: "url є обов'язковим" });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ message: "Невалідний URL" });
  }

  if (parsed.protocol !== "https:") {
    return res.status(403).json({ message: "Тільки HTTPS" });
  }

  try {
    const { buffer, contentType } = await fetchAsBuffer(url);
    const safe = filename.replace(/[/\\:*?"<>|]/g, "_");
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(safe)}`
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ message: "Не вдалося отримати фото" });
  }
});

module.exports = router;
