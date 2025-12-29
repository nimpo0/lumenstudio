require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const bookingsRoutes = require("./routes/bookings.js");
const dataRoutes = require("./routes/data.js");
const albumsRoutes = require("./routes/albums.js");
const albumsReviews = require("./routes/reviews.js");
const photographerReviews = require("./routes/photographerReviews.js");
const servicesReviews = require("./routes/servicesReviews.js");
const availability = require("./routes/availability.js");

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);

app.use("/api/bookings", bookingsRoutes);

app.use("/api/data", dataRoutes);

app.use("/api/albums", albumsRoutes);

app.use("/api/reviews", albumsReviews);

app.use("/api/photographer-reviews", photographerReviews);

app.use("/api/services-reviews", servicesReviews);

app.use("/api/availability", availability);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Сервер запущено на http://localhost:${PORT}`));
