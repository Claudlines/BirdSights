const rateLimit = require("express-rate-limit");

// Per-IP limiter shared by the data endpoints (/api/search and /api/explore).
// Both spend the project's shared eBird quota, so a scripted client hitting
// them in a tight loop could exhaust it. Limits are intentionally generous so
// normal classroom/demo clicking is never blocked. The paid /api/ask endpoint
// keeps its own separate, stricter limiter.
const WINDOW_MINUTES =
  parseInt(process.env.DATA_RATE_LIMIT_WINDOW_MINUTES, 10) || 15;
const MAX = parseInt(process.env.DATA_RATE_LIMIT_MAX, 10) || 100;

const dataRateLimiter = rateLimit({
  windowMs: WINDOW_MINUTES * 60 * 1000,
  limit: MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this device. Please wait a moment and try again.",
  },
});

module.exports = { dataRateLimiter };
