# Phase 9 — Webhooks
**Speaker 2 · 1:43 – 1:53**

> No new packages needed. Node 18+ includes `fetch` globally.

---

## Concept first (2 min)

> *"A normal API is YOU knocking on someone's door to ask for data.
> A webhook is the opposite — you give someone your address and they knock on YOUR door when something happens.
> Real examples: Stripe knocks on your server when a payment succeeds.
> GitHub knocks on your CI when you push code.
> Today we build a self-contained version — the app fires events to itself."*

---

## Step 1 — Create `src/webhooks/internal.webhook.js`

> Paste this complete.

```js
import { env } from "../config/env.js";

const WEBHOOK_URL    = `http://localhost:${env.PORT}/webhooks/receive`;
const WEBHOOK_SECRET = env.WEBHOOK_SECRET;

export const fireWebhook = async (event, payload) => {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method:  "POST",
      headers: {
        "Content-Type":     "application/json",
        // X-Webhook-Secret proves the request came from us, not a random caller
        "X-Webhook-Secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify({ event, payload, firedAt: new Date().toISOString() }),
    });
    console.log(`[Webhook] ✓ Fired: ${event} → ${res.status}`);
  } catch (err) {
    // Fire-and-forget: webhook failure should never crash the main request
    console.error(`[Webhook] ✗ Failed to fire "${event}":`, err.message);
  }
};
```

> *"fireWebhook sends an HTTP POST to our own /webhooks/receive endpoint.
> Fire-and-forget — we don't await it in the controller, so the response goes back immediately.
> X-Webhook-Secret proves the request came from us, not a random caller.
> In a real system, WEBHOOK_URL could be any external service (Slack, Zapier, another microservice)."*

---

## Step 2 — Create `src/controllers/webhook.controller.js`

> Paste this complete.

```js
import Confession from "../models/confession.model.js";
import { env }    from "../config/env.js";

// In-memory log — in production you'd persist this in a DB or a log service
const eventLog = [];

const handleFlagged = async (payload) => {
  await Confession.findByIdAndUpdate(payload.id, { flagged: true });
  console.log(`[Webhook] Confession ${payload.id} flagged ← keyword: "${payload.keyword}"`);
};

const handleReported = async (payload) => {
  await Confession.findByIdAndUpdate(payload.id, { hidden: true });
  console.log(`[Webhook] Confession ${payload.id} hidden ← ${payload.reports} reports`);
};

const handleTrending = async (payload) => {
  await Confession.findByIdAndUpdate(payload.id, { featured: true });
  console.log(`[Webhook] Confession ${payload.id} featured ← ${payload.upvotes} upvotes`);
};

const HANDLERS = {
  "confession.flagged":  handleFlagged,
  "confession.reported": handleReported,
  "confession.trending": handleTrending,
};

export const receiveWebhook = async (req, res) => {
  // Step 1 — Verify the secret header (reject if it doesn't match)
  const incoming = req.headers["x-webhook-secret"];
  if (incoming !== env.WEBHOOK_SECRET) {
    console.warn("[Webhook] ⚠ Rejected — invalid secret");
    return res.status(401).json({ error: true, message: "Invalid webhook secret." });
  }

  const { event, payload, firedAt } = req.body;

  // Step 2 — Log the event
  eventLog.unshift({ event, payload, firedAt, receivedAt: new Date().toISOString() });
  if (eventLog.length > 100) eventLog.pop(); // keep log bounded

  // Step 3 — Route to the right handler
  const handler = HANDLERS[event];
  if (handler) {
    await handler(payload).catch((err) =>
      console.error(`[Webhook] Handler error for "${event}":`, err.message)
    );
  }

  // Always respond 200 quickly — the sender shouldn't wait on us
  res.json({ received: true, event });
};

export const getEvents = (req, res) => {
  res.json({ data: eventLog, total: eventLog.length });
};
```

> *"The receiver validates the secret header first — reject unknown callers before doing any work.
> Stripe, GitHub, Shopify all use this exact pattern.
> Separate handler functions per event type keep it clean and easy to extend."*

---

## Step 3 — Create `src/routes/webhook.routes.js`

> Paste this complete.

```js
import { Router }                    from "express";
import { receiveWebhook, getEvents } from "../controllers/webhook.controller.js";

const router = Router();

router.get("/events",   getEvents);
router.post("/receive", receiveWebhook);

export default router;
```

---

## Step 4 — Update `src/app.js`

Add the webhook router and serve the frontend. Replace the entire file:

```js
import express           from "express";
import cors              from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import confessionRoutes from "./routes/confession.routes.js";
import adminRoutes      from "./routes/admin.routes.js";
import webhookRoutes    from "./routes/webhook.routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend from /public (needed for the WebSocket + webhook demo)
app.use(express.static(join(__dirname, "../public")));

app.use("/confessions", confessionRoutes);
app.use("/admin",       adminRoutes);
app.use("/webhooks",    webhookRoutes);

export default app;
```

> *"express.static() serves the HTML/CSS/JS frontend from the /public folder.
> In ES modules __dirname isn't built-in — fileURLToPath + dirname(import.meta.url) gives us the same thing.
> Now one server handles REST, WebSocket, webhooks, and the static frontend — all on one port."*

---

## Step 5 — Update `src/controllers/confession.controller.js`

Add the import at the top:

```js
import { fireWebhook } from "../webhooks/internal.webhook.js";
```

Add this constant above the controller object:

```js
const FLAGGED_KEYWORDS = ["urgent", "help", "danger", "emergency", "serious"];
```

Inside `create` — add after `broadcast(...)`:

```js
const lowerText = confession.text.toLowerCase();
const matchedKeyword = FLAGGED_KEYWORDS.find((w) => lowerText.includes(w));
if (matchedKeyword) {
  fireWebhook("confession.flagged", { id: confession.id, keyword: matchedKeyword, text: confession.text });
}
```

Inside `upvote` — add after `broadcast(...)`:

```js
if (confession.upvotes === 10)
  fireWebhook("confession.trending", { id: confession.id, upvotes: confession.upvotes });
```

Inside `report` — add after the service call:

```js
if (confession.reports >= 3)
  fireWebhook("confession.reported", { id: confession.id, reports: confession.reports });
```

Complete controller for reference:

```js
import { confessionService } from "../services/confession.service.js";
import { catchAsync }        from "../utils/catchAsync.js";
import { broadcast }         from "../websocket/broadcast.js";
import { fireWebhook }       from "../webhooks/internal.webhook.js";

const FLAGGED_KEYWORDS = ["urgent", "help", "danger", "emergency", "serious"];

export const confessionController = {

  getAll: catchAsync(async (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const { sort } = req.query;

    const result = await confessionService.getAll({ sort, page, limit });
    res.json(result);
  }),

  create: catchAsync(async (req, res) => {
    const confession = await confessionService.create(req.body.text);

    broadcast("new_confession", confession);

    const lowerText = confession.text.toLowerCase();
    const matchedKeyword = FLAGGED_KEYWORDS.find((w) => lowerText.includes(w));
    if (matchedKeyword) {
      fireWebhook("confession.flagged", { id: confession.id, keyword: matchedKeyword, text: confession.text });
    }

    res.status(201).json({ data: confession });
  }),

  upvote: catchAsync(async (req, res) => {
    const confession = await confessionService.upvote(req.params.id);

    broadcast("upvote_updated", { id: confession.id, upvotes: confession.upvotes });

    if (confession.upvotes === 10)
      fireWebhook("confession.trending", { id: confession.id, upvotes: confession.upvotes });

    res.json({ data: confession });
  }),

  report: catchAsync(async (req, res) => {
    const confession = await confessionService.report(req.params.id);

    if (confession.reports >= 3)
      fireWebhook("confession.reported", { id: confession.id, reports: confession.reports });

    res.json({ data: confession });
  }),

  remove: catchAsync(async (req, res) => {
    await confessionService.remove(req.params.id);
    broadcast("confession_deleted", { id: req.params.id });
    res.status(204).send();
  }),

};
```

---

## ✅ Demo sequence

```
1. POST /confessions  { "text": "urgent help needed" }
   Terminal: [Webhook] ✓ Fired: confession.flagged → 200
   Terminal: [Webhook] Confession xxx flagged ← keyword: "urgent"

2. GET /webhooks/events
   → Full event log with timestamps

3. PUT /confessions/:id/report  (do this 3 times)
   → 3rd report fires confession.reported
   → GET /confessions → confession is gone from the feed (hidden: true)

4. PUT /confessions/:id/upvote  (do this 10 times)
   → 10th upvote fires confession.trending → featured: true in DB
```
