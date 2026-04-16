# Phase 10 — Error Handling + Wrap-up
**Speaker 2 · 1:53 – 2:00**

---

## Step 1 — Create `src/middleware/error.middleware.js`

> Paste this complete.

```js
import { env } from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);

  // ── Mongoose: invalid ObjectId ────────────────────────────────────────────
  if (err.name === "CastError") {
    return res.status(400).json({
      error: true,
      message: `Invalid ID format: '${err.value}'`,
    });
  }

  // ── Mongoose: schema-level validation failure ─────────────────────────────
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      error: true,
      message: messages.join(" "),
    });
  }

  // ── MongoDB: duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      error: true,
      message: `Duplicate value for '${field}'.`,
    });
  }

  // ── Our own AppError ──────────────────────────────────────────────────────
  const statusCode    = err.statusCode || err.status || 500;
  const isOperational = err.isOperational === true;

  res.status(statusCode).json({
    error:   true,
    message: isOperational ? err.message : "Something went wrong. Please try again.",
    // Only expose stack traces during local development
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
```

> *"The 4-parameter signature (err, req, res, next) is how Express knows this is an error handler.
> Register it last — after all routes — or it won't catch their errors.
> isOperational = we threw AppError on purpose → safe to show the message to the user.
> In production we hide the stack trace. In development we show it."*

---

## Step 2 — Update `src/app.js`

Add the `errorHandler` import and register it **last** — after all routes and the 404 catch-all.

Final complete `app.js`:

```js
import express           from "express";
import cors              from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import confessionRoutes from "./routes/confession.routes.js";
import adminRoutes      from "./routes/admin.routes.js";
import webhookRoutes    from "./routes/webhook.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(join(__dirname, "../public")));

app.use("/confessions", confessionRoutes);
app.use("/admin",       adminRoutes);
app.use("/webhooks",    webhookRoutes);

// 404 catch-all — must come after all routes
app.use((req, res) => {
  res.status(404).json({ error: true, message: "Route not found." });
});

// Global error handler — MUST be last (4-parameter signature)
app.use(errorHandler);

export default app;
```

---

## ✅ Trigger each error type live

```
GET  /confessions/not-a-valid-id
→ 400 { "error": true, "message": "Invalid ID format: 'not-a-valid-id'" }

POST /confessions  {}
→ 422 { "error": true, "message": "Validation failed.", "details": [...] }

GET  /no-such-route
→ 404 { "error": true, "message": "Route not found." }
```

---

## Architecture recap

Draw this on the board:

```
Browser
  │
  ├─ REST   Routes → [Validate?] → [Auth?] → Controller → Service → MongoDB
  │                                               │
  │                                        fireWebhook()
  │                                               │
  │                                   POST /webhooks/receive
  │                                               │
  │                                     receiver updates DB
  │
  └─ WS    broadcast() → all connected tabs in real time
```

---

## What we built today

| Concept | Where |
|---------|-------|
| Express server | `server.js` + `src/app.js` |
| Environment config | `src/config/env.js` |
| MongoDB connection | `src/config/db.js` |
| Schema + model | `src/models/confession.model.js` |
| Data logic | `src/services/confession.service.js` |
| HTTP layer | `src/controllers/confession.controller.js` |
| Routing | `src/routes/confession.routes.js` |
| Input validation | `src/validators/` + `src/middleware/validate.middleware.js` |
| JWT auth (Bearer) | `src/services/auth.service.js` + `src/middleware/auth.middleware.js` |
| Admin API | `src/controllers/admin.controller.js` + `src/routes/admin.routes.js` |
| Real-time push | `src/websocket/broadcast.js` |
| Event system | `src/webhooks/internal.webhook.js` + `src/controllers/webhook.controller.js` |
| Error handling | `src/middleware/error.middleware.js` |
