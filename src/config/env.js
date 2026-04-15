// ─── Environment Configuration ────────────────────────────────────────────────
// Every process.env read in the app flows through here.
// If a required variable is missing, the server refuses to start — fast failure
// beats a mysterious runtime crash 10 minutes later.

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable "${key}" is required but not set. Check your .env file.`);
  }
  return value;
};

export const env = {
  PORT:                process.env.PORT || "3000",
  NODE_ENV:            process.env.NODE_ENV || "development",

  // MongoDB — e.g. mongodb://localhost:27017/whispernet
  MONGODB_URI:         required("MONGODB_URI"),

  // JWT — should be a 64-byte random hex string
  JWT_SECRET:          required("JWT_SECRET"),
  JWT_EXPIRES_IN:      process.env.JWT_EXPIRES_IN || "2h",

  // Admin credentials (demo only — use a hashed DB record in production)
  ADMIN_USERNAME:      required("ADMIN_USERNAME"),
  ADMIN_PASSWORD:      required("ADMIN_PASSWORD"),

  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "whispernet-internal-secret",
};
