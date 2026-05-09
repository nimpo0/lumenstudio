/**
 * Міграція Firestore → PostgreSQL (Supabase)
 * Запускай ОДИН РАЗ локально:
 *
 *   node migrate-from-firebase.js
 *
 * Потрібні env-змінні в .env:
 *   FIREBASE_ADMIN_SDK=...  (той самий JSON що і на Render)
 *   DATABASE_URL=postgresql://...  (connection string з Supabase)
 */

require("dotenv").config();
const { randomUUID } = require("crypto");
const admin = require("firebase-admin");
const { Pool } = require("pg");

// ── Firebase init ──────────────────────────────────────────────────────────
const raw = process.env.FIREBASE_ADMIN_SDK;
if (!raw) { console.error("❌ Нема FIREBASE_ADMIN_SDK в .env"); process.exit(1); }
const sa = JSON.parse(raw);
if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
admin.initializeApp({ credential: admin.credential.cert(sa) });
const fdb = admin.firestore();

// ── PostgreSQL init ────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const pg = {
  query: (t, p) => pool.query(t, p),
  one: async (t, p) => { const r = await pool.query(t, p); return r.rows[0] || null; },
};

function toArr(v) { return Array.isArray(v) ? v : []; }
function toNum(v) { return Number(v) || 0; }
function toStr(v) { return String(v || ""); }
function toDate(v) { try { return v ? new Date(v) : null; } catch { return null; } }

async function getDocs(col) {
  const snap = await fdb.collection(col).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function migrateUsers(docs) {
  console.log(`  users: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO users (id, email, name, password_hash, role, photographer_id, provider, google_uid, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id, toStr(d.email), toStr(d.name), d.passwordHash || null,
        d.role || "client", d.photographerId || null,
        d.provider || "password", d.googleUid || null,
        toDate(d.createdAt) || new Date(),
      ]
    );
  }
}

async function migratePhotographers(docs) {
  console.log(`  photographers: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO photographers (id, name, email, specialty, experience_years, experience_label, bio, image, personal_portfolio, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id, toStr(d.name || d.fullName), toStr(d.email),
        toStr(d.specialty), toNum(d.experienceYears),
        toStr(d.experienceLabel), toStr(d.bio), toStr(d.image),
        toArr(d.personalPortfolio), toDate(d.createdAt) || new Date(),
      ]
    );
  }
}

async function migrateServices(docs) {
  console.log(`  services: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO services (id, title, label, short_description, description, price_from, currency, duration, image, category, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id, toStr(d.title), toStr(d.label || d.title),
        toStr(d.shortDescription), toStr(d.description),
        toNum(d.priceFrom || d.price), toStr(d.currency || "UAH"),
        toStr(d.duration || d.time), toStr(d.image), toStr(d.category),
        toDate(d.createdAt) || new Date(),
      ]
    );
  }
}

async function migratePortfolio(docs) {
  console.log(`  portfolio: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO portfolio (id, title, image, category, created_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [d.id, toStr(d.title), toStr(d.image), toStr(d.category), toDate(d.createdAt) || new Date()]
    );
  }
}

async function migrateStudios(docs) {
  console.log(`  studios: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO studios (id, name, description, hourly_price, area, equipment, image, gallery, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id, toStr(d.name), toStr(d.description),
        toNum(d.hourlyPrice), toStr(d.area),
        toArr(d.equipment), toStr(d.image), toArr(d.gallery),
        toDate(d.createdAt) || new Date(),
      ]
    );
  }
}

async function migrateBookings(docs) {
  console.log(`  bookings: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO bookings (
        id, user_id, date, time,
        service_id, service_label, service_price,
        photographer_id, photographer_label,
        studio_id, studio_label, studio_price,
        duration_text, duration_min, start_min, end_min,
        additional, notes, slot_key, status,
        payment_method, payment_status, paid_at, total, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id, toStr(d.userId), toStr(d.date), toStr(d.time),
        toStr(d.serviceId), toStr(d.serviceLabel), toNum(d.servicePrice),
        d.photographerId || null, d.photographerLabel || null,
        d.studioId || null, d.studioLabel || null, toNum(d.studioPrice),
        d.durationText || null, toNum(d.durationMin) || 60,
        toNum(d.startMin), toNum(d.endMin),
        JSON.stringify(toArr(d.additional)), toStr(d.notes),
        d.slotKey || null, toStr(d.status || "pending_assignment"),
        d.paymentMethod === "online" ? "online" : "onsite",
        d.paymentStatus || "pending",
        toDate(d.paidAt),
        toNum(d.total), toDate(d.createdAt) || new Date(),
      ]
    );
  }
}

async function migrateAlbums(docs) {
  console.log(`  albums: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO albums (id, user_id, booking_id, title, status, message, cover, photos, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id, toStr(d.userId), d.bookingId || null,
        toStr(d.title), toStr(d.status || "processing"), toStr(d.message),
        d.cover || null, toArr(d.photos), toDate(d.createdAt) || new Date(),
      ]
    );
  }
}

async function migrateReviews(docs) {
  console.log(`  reviews: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO reviews (id, album_id, user_id, rating, comment, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (album_id, user_id) DO NOTHING`,
      [
        d.id || randomUUID(), toStr(d.albumId), toStr(d.userId),
        Math.min(5, Math.max(1, toNum(d.rating) || 5)),
        toStr(d.comment), toDate(d.createdAt) || new Date(),
        toDate(d.updatedAt) || new Date(),
      ]
    );
  }
}

async function migratePhotographerReviews(docs) {
  console.log(`  photographer_reviews: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO photographer_reviews (id, photographer_id, user_id, user_email, rating, comment, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id || randomUUID(), toStr(d.photographerId), toStr(d.userId),
        d.userEmail || null,
        Math.min(5, Math.max(1, toNum(d.rating) || 5)),
        toStr(d.comment), toDate(d.createdAt) || new Date(),
        toDate(d.updatedAt || d.createdAt) || new Date(),
      ]
    );
  }
}

async function migrateServiceReviews(docs) {
  console.log(`  service_reviews: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO service_reviews (id, service_id, user_id, user_email, rating, comment, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id || randomUUID(), toStr(d.serviceId), toStr(d.userId),
        d.userEmail || null,
        Math.min(5, Math.max(1, toNum(d.rating) || 5)),
        toStr(d.comment), toDate(d.createdAt) || new Date(),
      ]
    );
  }
}

async function migrateBlocks(docs) {
  console.log(`  photographer_blocks: ${docs.length} документів`);
  for (const d of docs) {
    await pg.query(
      `INSERT INTO photographer_blocks (id, photographer_id, date, start_time, end_time, start_min, end_min, reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id || randomUUID(), toStr(d.photographerId), toStr(d.date),
        toStr(d.startTime), toStr(d.endTime),
        toNum(d.startMin), toNum(d.endMin),
        toStr(d.reason), toDate(d.createdAt) || new Date(),
      ]
    );
  }
}

async function main() {
  console.log("🚀 Міграція Firestore → PostgreSQL\n");

  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL підключено\n");
  } catch (e) {
    console.error("❌ Не вдалося підключитися до PostgreSQL:", e.message);
    process.exit(1);
  }

  const collections = [
    ["users", migrateUsers],
    ["photographers", migratePhotographers],
    ["services", migrateServices],
    ["portfolio", migratePortfolio],
    ["studios", migrateStudios],
    ["bookings", migrateBookings],
    ["albums", migrateAlbums],
    ["reviews", migrateReviews],
    ["photographer_reviews", migratePhotographerReviews],
    ["service_reviews", migrateServiceReviews],
    ["photographerBlocks", migrateBlocks],
  ];

  for (const [col, fn] of collections) {
    try {
      const docs = await getDocs(col);
      await fn(docs);
      console.log(`  ✓ ${col}\n`);
    } catch (e) {
      console.error(`  ✗ ${col}: ${e.message}\n`);
    }
  }

  console.log("✅ Міграція завершена!");
  await pool.end();
  process.exit(0);
}

main().catch((e) => { console.error("❌ Fatal:", e); process.exit(1); });
