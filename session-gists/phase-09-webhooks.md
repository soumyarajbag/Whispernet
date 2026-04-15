# Phase 9 — Webhooks
**Speaker 2 · 1:43 – 1:53**

> No new packages needed.

---

## Concept first (2 min)

> *"A normal API is YOU knocking on someone's door to ask for data.
> A webhook is the opposite — you give someone your address and they knock on YOUR door when something happens.
> Real examples: Stripe knocks on your server when a payment succeeds.
> GitHub knocks on your CI when you push code.
> Today we build a self-contained version — the app fires events to itself."*

---

## Step 1 — Update `src/models/confession.model.js`

Add three status fields to the schema (inside the schema definition, after `reports`):

```js
flagged:  { type: Boolean, default: false },
hidden:   { type: Boolean, default: false },
featured: { type: Boolean, default: false },
```

Full schema fields section:

```js
{
  text: {
    type:      String,
    required:  [true, "Confession text is required"],
    trim:      true,
    maxlength: [500, "Must be 500 characters or fewer"],
  },
  upvotes:  { type: Number,  default: 0 },
  reports:  { type: Number,  default: 0 },
  flagged:  { type: Boolean, default: false },
  hidden:   { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
}
```

---

## Step 2 — Update `src/services/confession.service.js`

In `getAll()`, change both `{}` filters to `{ hidden: false }` so hidden confessions don't appear in the feed:

```js
const [data, total] = await Promise.all([
  Confession.find({ hidden: false }).sort(sortQuery).skip(skip).limit(limit),
  Confession.countDocuments({ hidden: false }),
]);
```

---

## Step 3 — Create `src/webhooks/internal.webhook.js`

> Paste this complete.

```js
import { env } from "../config/env.js";

const WEBHOOK_URL = `http://localhost:${env.PORT}/webhooks/receive`;

export const fireWebhook = async (event, payload) => {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method:  "POST",
      headers: {
        "Content-Type":     "application/json",
        "X-Webhook-Secret": env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({ event, payload, firedAt: new Date().toISOString() }),
    });
    console.log(`[Webhook] ✓ Fired: ${event} → ${res.status}`);
  } catch (err) {
    console.error(`[Webhook] ✗ Failed to fire "${event}":`, err.message);
  }
};
```

> *"fireWebhook sends an HTTP POST to our own /webhooks/receive endpoint.
> Fire-and-forget — we don't await it so the original response goes back immediately.
> X-Webhook-Secret proves the request came from us, not a random caller."*

---

## Step 4 — Create `src/controllers/webhook.controller.js`

> Paste this complete.

```js
import Confession from "../models/confession.model.js";
import { env }    from "../config/env.js";

const eventLog = [];

export const receiveWebhook = async (req, res) => {
  if (req.headers["x-webhook-secret"] !== env.WEBHOOK_SECRET) {
    console.warn("[Webhook] ⚠ Rejected — invalid secret");
    return res.status(401).json({ error: true, message: "Invalid webhook secret." });
  }

  const { event, payload, firedAt } = req.body;

  eventLog.unshift({ event, payload, firedAt, receivedAt: new Date().toISOString() });
  if (eventLog.length > 100) eventLog.pop();

  if (event === "confession.flagged")  await Confession.findByIdAndUpdate(payload.id, { flagged:  true });
  if (event === "confession.reported") await Confession.findByIdAndUpdate(payload.id, { hidden:   true });
  if (event === "confession.trending") await Confession.findByIdAndUpdate(payload.id, { featured: true });

  res.json({ received: true, event });
};

export const getEvents = (req, res) => {
  res.json({ data: eventLog, total: eventLog.length });
};
```

> *"The receiver validates the secret header first — reject unknown callers before doing any work.
> Stripe, GitHub, Shopify all use this exact pattern."*

---

## Step 5 — Create `src/routes/webhook.routes.js`

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

## Step 6 — Update `src/app.js`

Add the import and mount the router. Replace the entire file:

```js
import express          from "express";
import cors             from "cors";
import cookieParser     from "cookie-parser";
import confessionRoutes from "./routes/confession.routes.js";
import adminRoutes      from "./routes/admin.routes.js";
import webhookRoutes    from "./routes/webhook.routes.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/confessions", confessionRoutes);
app.use("/admin",       adminRoutes);
app.use("/webhooks",    webhookRoutes);

export default app;
```

---

## Step 7 — Update `src/controllers/confession.controller.js`

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
const match = FLAGGED_KEYWORDS.find((w) => confession.text.toLowerCase().includes(w));
if (match) fireWebhook("confession.flagged", { id: confession.id, keyword: match, text: confession.text });
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
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const result = await confessionService.getAll({ sort: req.query.sort, page, limit });
    res.json(result);
  }),

  create: catchAsync(async (req, res) => {
    const confession = await confessionService.create(req.body.text);
    broadcast("new_confession", confession);
    const match = FLAGGED_KEYWORDS.find((w) => confession.text.toLowerCase().includes(w));
    if (match) fireWebhook("confession.flagged", { id: confession.id, keyword: match, text: confession.text });
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
