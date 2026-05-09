-- Lumen Studio — PostgreSQL schema
-- Run once in Supabase SQL Editor (or psql)

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'client',
  photographer_id TEXT,
  provider      TEXT NOT NULL DEFAULT 'password',
  google_uid    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photographers (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  email              TEXT,
  specialty          TEXT NOT NULL DEFAULT '',
  experience_years   INTEGER NOT NULL DEFAULT 0,
  experience_label   TEXT NOT NULL DEFAULT '',
  bio                TEXT NOT NULL DEFAULT '',
  image              TEXT NOT NULL DEFAULT '',
  personal_portfolio TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  label             TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  price_from        NUMERIC NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'UAH',
  duration          TEXT NOT NULL DEFAULT '',
  image             TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT '',
  image      TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studios (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  hourly_price NUMERIC NOT NULL DEFAULT 0,
  area        TEXT NOT NULL DEFAULT '',
  equipment   TEXT[] NOT NULL DEFAULT '{}',
  image       TEXT NOT NULL DEFAULT '',
  gallery     TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  date              TEXT NOT NULL,
  time              TEXT NOT NULL,
  service_id        TEXT,
  service_label     TEXT NOT NULL DEFAULT '',
  service_price     NUMERIC NOT NULL DEFAULT 0,
  photographer_id   TEXT,
  photographer_label TEXT,
  studio_id         TEXT,
  studio_label      TEXT,
  studio_price      NUMERIC NOT NULL DEFAULT 0,
  duration_text     TEXT,
  duration_min      INTEGER NOT NULL DEFAULT 60,
  start_min         INTEGER NOT NULL DEFAULT 0,
  end_min           INTEGER NOT NULL DEFAULT 60,
  additional        JSONB NOT NULL DEFAULT '[]',
  notes             TEXT NOT NULL DEFAULT '',
  slot_key          TEXT,
  status            TEXT NOT NULL DEFAULT 'pending_assignment',
  payment_method    TEXT NOT NULL DEFAULT 'onsite',
  payment_status    TEXT NOT NULL DEFAULT 'pending',
  paid_at           TIMESTAMPTZ,
  total             NUMERIC NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rescheduled_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS albums (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  booking_id TEXT,
  title      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'processing',
  message    TEXT NOT NULL DEFAULT '',
  cover      TEXT,
  photos     TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  album_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (album_id, user_id)
);

CREATE TABLE IF NOT EXISTS photographer_reviews (
  id              TEXT PRIMARY KEY,
  photographer_id TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  user_email      TEXT,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_reviews (
  id         TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  user_email TEXT,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photographer_blocks (
  id              TEXT PRIMARY KEY,
  photographer_id TEXT NOT NULL,
  date            TEXT NOT NULL,
  start_time      TEXT NOT NULL,
  end_time        TEXT NOT NULL,
  start_min       INTEGER NOT NULL DEFAULT 0,
  end_min         INTEGER NOT NULL DEFAULT 0,
  reason          TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id      ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_photographer ON bookings(photographer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_studio       ON bookings(studio_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date         ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_albums_user_id        ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_booking_id     ON albums(booking_id);
CREATE INDEX IF NOT EXISTS idx_phblocks_photographer ON photographer_blocks(photographer_id);
CREATE INDEX IF NOT EXISTS idx_phblocks_date         ON photographer_blocks(date);
