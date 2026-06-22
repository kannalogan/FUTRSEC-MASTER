import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

// Generous global ceiling to blunt scraping / accidental floods without
// interfering with normal interactive usage. Keyed on the real client IP
// (Express `trust proxy` is enabled so X-Forwarded-For is honoured behind the
// Replit reverse proxy).
export const globalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 300 : 2000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

// Strict limiter for unauthenticated credential-handling endpoints
// (OTP issuance, password login, password reset, public registration) to
// mitigate brute-force and OTP-flooding abuse.
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 10 : 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { error: "Too many attempts. Please wait a few minutes before trying again." },
});
