const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Помилка підключення до PostgreSQL:", err.message);
});

const db = {
  query(text, params) {
    return pool.query(text, params);
  },

  async one(text, params) {
    const { rows } = await pool.query(text, params);
    return rows[0] || null;
  },

  async many(text, params) {
    const { rows } = await pool.query(text, params);
    return rows;
  },
};

module.exports = { db, pool };
