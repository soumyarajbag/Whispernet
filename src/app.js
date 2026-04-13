// ─── Express Application ──────────────────────────────────────────────────────
// app.js assembles the middleware stack and mounts routers.
// It exports the express app — server.js handles the actual HTTP listen.

import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import confessionRoutes from "./routes/confession.routes.js";
import adminRoutes      from "./routes/admin.routes.js";
import webhookRoutes    from "./routes/webhook.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the frontend from /public
app.use(express.static(join(__dirname, "../public")));

// ── Route Mounting ────────────────────────────────────────────────────────────
app.use("/confessions", confessionRoutes);
app.use("/admin",       adminRoutes);
app.use("/webhooks",    webhookRoutes);

// ── 404 Catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: true, message: "Route not found." });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// MUST come last — Express identifies it by the 4-argument signature.
app.use(errorHandler);

export default app;
