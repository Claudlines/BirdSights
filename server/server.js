require("dotenv").config();
const express = require("express");
const cors = require("cors");
const searchRoutes = require("./routes/searchRoutes");
const speciesRoutes = require("./routes/speciesRoutes");
const askRoutes = require("./routes/askRoutes");
const exploreRoutes = require("./routes/exploreRoutes");

const app = express();

// Render (and similar hosts) sit one proxy hop in front of the app. Trusting
// that single hop lets Express read the real client IP from X-Forwarded-For,
// which the /api/ask rate limiter needs for accurate per-IP limits.
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", searchRoutes);
app.use("/api", speciesRoutes);
app.use("/api", askRoutes);
app.use("/api", exploreRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use((err, _req, res, _next) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(PORT, () => {
  console.log(`BirdSights backend running on port ${PORT}`);
  console.log(`Accepting requests from: ${CLIENT_ORIGIN}`);
});
