// ─── Entry Point ──────────────────────────────────────────────────────────────
// Responsibilities (one each):
//   1. Load environment variables (.env)
//   2. Connect to MongoDB — if this fails, abort
//   3. Create the HTTP server and attach WebSocket
//   4. Start listening on the configured port

import "dotenv/config";           // Must be first — populates process.env
import http from "http";
import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import app from "./src/app.js";
import { initWebSocket } from "./src/websocket/broadcast.js";

const bootstrap = async () => {
  // Block until the DB is up — no point accepting traffic without a DB
  await connectDB();

  const server = http.createServer(app);
  initWebSocket(server);

  server.listen(env.PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║          WhisperNet API is live          ║
╠══════════════════════════════════════════╣
║  REST  →  http://localhost:${env.PORT}         ║
║  WS    →  ws://localhost:${env.PORT}           ║
╚══════════════════════════════════════════╝

Endpoints:
  GET    /confessions              — fetch feed (+ ?sort=top&page=1&limit=10)
  POST   /confessions              — post a confession
  PUT    /confessions/:id/upvote   — hype it up
  PUT    /confessions/:id/report   — flag it
  DELETE /confessions/:id          — admin: remove it
  POST   /admin/login              — get your JWT
`);
  });
};

bootstrap();
