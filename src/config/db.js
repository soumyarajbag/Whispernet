// ─── MongoDB Connection ───────────────────────────────────────────────────────
// Wraps the mongoose.connect call so server.js can await it before binding
// to a port. If we can't reach the database, there's no point listening.

import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`[DB] MongoDB connected → ${conn.connection.host}`);
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    process.exit(1); // Hard exit — unrecoverable without a DB
  }
};
