# WhisperNet — 120-Minute Backend Masterclass

## The Gist Rule
> **First time for any pattern → write from scratch (teaches the concept)**
> **Same pattern, second time → paste skeleton, write only the logic**
> **Pure boilerplate / utilities → paste complete, explain while pasting, move on**

---

## Pre-Session Checklist
- [ ] Deploy full WhisperNet on Render / Railway (the "hook" server)
- [ ] Generate QR code pointing to the deployed frontend URL
- [ ] Open your Gist URL in a pinned browser tab
- [ ] MongoDB Atlas cluster ready (or local `mongod` running)
- [ ] Clone `whispernet-starter` locally as your starting point
- [ ] Test `npm run dev` on the starter — confirm health check works

---

## Session Flow

### ⏱ 0:00 – 0:05 | The Hook (5 min)
- Project the QR code. Let students scan and start posting confessions.
- Confessions appear on the projector screen in real time via WebSocket.
- **"Right now you are using the magic. In two hours, you will know exactly how to build it."**

---

### ⏱ 0:05 – 0:15 | Core Theory (10 min)
No code yet — just talk.

**What is a server?**
> A computer listening on a port, waiting for a knock.
> Request arrives → server processes → response goes back.

**API Types:**
| Type | Analogy | Use case |
|------|---------|----------|
| **REST** | Restaurant menu — fixed dishes | Industry standard · what we build today |
| **GraphQL** | Custom order — ask only for what you need | Avoid over-fetching on complex UIs |
| **gRPC** | Internal walkie-talkie — binary, fast | Microservice-to-microservice |

**HTTP Verbs → CRUD:**
`GET` = Read · `POST` = Create · `PUT/PATCH` = Update · `DELETE` = Delete

---

### ⏱ 0:15 – 0:20 | Setup (5 min)
```bash
git clone <starter-repo-url>
cd whispernet-starter
npm install
cp .env.example .env
# Edit .env: fill in MONGODB_URI, JWT_SECRET, WEBHOOK_SECRET
npm run dev
# ✅  WhisperNet running → http://localhost:3000
```
Hit `GET /health` in Postman → `{ status: "ok" }` ✅

---

### ⏱ 0:20 – 0:30 | Config Layer (10 min)
**Strategy → PASTE COMPLETE, explain line by line while pasting**

**`src/config/env.js`** — paste `01-config-env.js`
> *"Every `process.env` read in the whole app goes through here.
> If a required variable is missing, the server crashes at boot — not 10 minutes later during a live request."*

**`src/config/db.js`** — paste `01-config-db.js`
> *"We `await connectDB()` before calling `server.listen()`.
> No database = no point accepting traffic."*

**`src/utils/AppError.js` + `catchAsync.js`** — paste `01-utils.js`
> *"AppError bundles a message with an HTTP status code.
> catchAsync means zero try/catch boilerplate in every controller — rejected promises auto-forward to our error handler."*

**Update `server.js`** → paste **Stage 2** block from `00-server-FINAL.js`

Test: `npm run dev` → `[DB] Connected → …` ✅

---

### ⏱ 0:30 – 0:45 | The Model (15 min)
**Strategy → WRITE FROM SCRATCH**

Create `src/models/confession.model.js`. Write each part live:

```javascript
// Step 1 — import
import mongoose from "mongoose";

// Step 2 — define the schema (shape of a document)
const confessionSchema = new mongoose.Schema(
  {
    text:    { type: String, required: true, trim: true, maxlength: 500 },
    upvotes: { type: Number, default: 0 },
    reports: { type: Number, default: 0 },
    // flagged / hidden / featured  ← leave these out now, add in Webhook phase
  },
  {
    timestamps: true,          // free createdAt + updatedAt
    toJSON: {
      virtuals: true,
      transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; }
    },
  }
);

// Step 3 — indexes (pre-sort for fast queries at scale)
confessionSchema.index({ createdAt: -1 });
confessionSchema.index({ upvotes:   -1 });

// Step 4 — compile + export
const Confession = mongoose.model("Confession", confessionSchema);
export default Confession;
```

> *"This schema is the contract for every document in the confessions collection.
> Constraints here are a second safety net — the validator catches bad input first,
> Mongoose catches anything that slips through."*

📎 Reference: `02-confession.model.js` if running behind.

---

### ⏱ 0:45 – 1:00 | Service + Controller + Routes — First Time (15 min)
**Strategy → WRITE FROM SCRATCH (first iteration of each layer)**

**`src/services/confession.service.js`**
Write `getAll()` and `create()` live:
```javascript
import Confession from "../models/confession.model.js";
import { AppError } from "../utils/AppError.js";

export const confessionService = {
  async getAll({ sort = "newest", page = 1, limit = 10 }) {
    // write: SORT_MAP, skip calc, Promise.all([find, count])
  },
  async create(text) {
    return Confession.create({ text });
  },
};
```
> *"Service = pure data logic. No req, no res. Just arguments in, data out.
> This is what makes services independently testable."*

**`src/controllers/confession.controller.js`**
Paste `04-CONTROLLER.skeleton.js`, write `getAll` and `create` bodies live:
```javascript
getAll: catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const result = await confessionService.getAll({ sort: req.query.sort, page, limit });
  res.json(result);
}),
create: catchAsync(async (req, res) => {
  const confession = await confessionService.create(req.body.text);
  res.status(201).json({ data: confession });
}),
```
> *"Controller's only job: speak HTTP. Pull from req, hand to service, wrap the response."*

**`src/routes/confession.routes.js`**
Paste `05-ROUTES.skeleton.js`, write the two route lines live:
```javascript
router.get("/",  confessionController.getAll);
router.post("/", confessionController.create);
```
Mount in `app.js`:
```javascript
import confessionRoutes from "./routes/confession.routes.js";
app.use("/confessions", confessionRoutes);
```

Test: `GET /confessions` → `[]` · `POST /confessions` → new document ✅

---

### ⏱ 1:00 – 1:07 | Pagination + Sorting (7 min)
**Strategy → ADD lines into the existing `getAll()` service method**

Show `req.query` live in Postman. Then fill in the body:
```javascript
const SORT_MAP = { newest: { createdAt: -1 }, top: { upvotes: -1 } };
const sortQuery = SORT_MAP[sort] ?? SORT_MAP.newest;
const skip      = (page - 1) * limit;
const filter    = { hidden: false };   // write this as a placeholder for now

const [data, total] = await Promise.all([
  Confession.find(filter).sort(sortQuery).skip(skip).limit(limit),
  Confession.countDocuments(filter),
]);
return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
```
> *"`Promise.all` runs both DB queries at the same time instead of waiting for each in turn.
> One round-trip instead of two."*

Test: `GET /confessions?sort=top&page=1&limit=2` ✅

---

### ⏱ 1:07 – 1:13 | Upvote + Delete Stub (6 min)
**Strategy → paste `03-SERVICE.skeleton.js` as reference, write bodies live**

Add `upvote()` and `remove()` to the existing service:
```javascript
async upvote(id) {
  const doc = await Confession.findByIdAndUpdate(id, { $inc: { upvotes: 1 } }, { new: true });
  if (!doc) throw new AppError(`Confession '${id}' not found.`, 404);
  return doc;
},
async remove(id) {
  const doc = await Confession.findByIdAndDelete(id);
  if (!doc) throw new AppError(`Confession '${id}' not found.`, 404);
  return doc;
},
```
> *"`$inc` is atomic — safe when 100 users upvote the same confession at the same time.
> `{ new: true }` returns the updated document, not the original."*

Add matching controller methods (fill skeletons) and routes:
```javascript
router.put("/:id/upvote", confessionController.upvote);
router.delete("/:id",     confessionController.remove);  // no auth guard yet
```

Test: `PUT /confessions/:id/upvote` → upvotes increments ✅

---

### ⏱ 1:13 – 1:18 | Validation (5 min)
**Strategy → PASTE COMPLETE from `06-validate.middleware.js`**

Create `src/validators/confession.validator.js` + `src/middleware/validate.middleware.js`.

Update POST route to use the validation chain:
```javascript
router.post("/", createConfessionRules, validate, confessionController.create);
```

> *"Middleware is a checkpoint assembly line.
> `createConfessionRules` runs the checks, `validate` reads the results.
> If anything failed, it short-circuits with 422 — the controller never runs."*

Demo: `POST /confessions` with empty body → `422 Validation failed` + field details ✅

---

### ⏱ 1:18 – 1:33 | Auth — JWT (15 min)
**Strategy → paste `07-auth.skeleton.js`, write all logic bodies live**

**Part A — `src/services/auth.service.js`**
Paste the skeleton, write both method bodies:
```javascript
login(username, password) {
  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD)
    throw new AppError("Invalid credentials.", 401);
  return jwt.sign({ username, role: "admin" }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
},
verifyToken(token) {
  try   { return jwt.verify(token, env.JWT_SECRET); }
  catch { throw new AppError("Invalid or expired token.", 401); }
},
```

**Part B — Admin controller + routes**
Paste complete from `07-auth.skeleton.js`. Mount:
```javascript
app.use("/admin", adminRoutes);
```

**Part C — `src/middleware/auth.middleware.js`**
Paste skeleton, write `verifyAdmin` body live:
```javascript
const authHeader = req.headers["authorization"];
if (!authHeader?.startsWith("Bearer "))
  return res.status(401).json({ error: true, message: "No token provided." });

const decoded = authService.verifyToken(authHeader.split(" ")[1]);
if (decoded.role !== "admin")
  return res.status(403).json({ error: true, message: "Admin role required." });

req.user = decoded;
next();
```
Apply to the DELETE route:
```javascript
router.delete("/:id", verifyAdmin, confessionController.remove);
```

**Live demo flow:**
1. `POST /admin/login` → copy the token
2. Paste token at **jwt.io** → decode on the projector — show the payload is visible
3. `DELETE /confessions/:id` with `Authorization: Bearer <token>` → 204 ✅
4. Same request without the header → 401 ✅

> *"Authentication = proving WHO you are (showing your ID at the door).
> Authorization = proving WHAT you're allowed to do (getting into the VIP room)."*

> *"Notice jwt.io decoded the payload without knowing our secret. The payload is NOT secret.
> Never put passwords or sensitive data inside a JWT."*

---

### ⏱ 1:33 – 1:43 | WebSockets (10 min)
**Strategy → PASTE COMPLETE from `08-websocket.broadcast.js`**

Create `src/websocket/broadcast.js` — paste the file.

**Update `server.js`** → paste **Stage 3** block from `00-server-FINAL.js`
*(wraps app in `http.createServer`, calls `initWebSocket`)*

Add `broadcast()` calls into the existing controller — just three lines:
```javascript
// inside create  (after confession is saved):
broadcast("new_confession", confession);

// inside upvote  (after DB update):
broadcast("upvote_updated", { id: confession.id, upvotes: confession.upvotes });

// inside remove  (after DB delete):
broadcast("confession_deleted", { id: req.params.id });
```

**Demo:** Open the frontend in two browser tabs side by side.
Post a confession in tab 1 → card appears in tab 2 instantly, no refresh.
Upvote in tab 1 → counter updates in tab 2 in real time.

> *"REST is a walkie-talkie — you press the button, you speak, you release, the line closes.
> WebSocket is a phone call — the connection stays open and both sides can talk any time."*

---

### ⏱ 1:43 – 1:53 | Webhooks (10 min)
**Strategy → PASTE COMPLETE from `09-internal.webhook.js`**

**Concept first (2 min):**
> *"A normal API is us knocking on someone's door to ask for data.
> A webhook is the opposite — we give someone our address and they knock on OUR door when something happens.
> Real examples: GitHub notifies your CI/CD when you push. Stripe notifies your server when a payment succeeds.
> Today we build a self-contained version — the app fires events to itself."*

**Create the three files (paste from `09-internal.webhook.js`):**
- `src/webhooks/internal.webhook.js` — the `fireWebhook()` fire function
- `src/controllers/webhook.controller.js` — the receiver + event log
- `src/routes/webhook.routes.js` — mounts GET /events and POST /receive

**Mount in `app.js`:**
```javascript
app.use("/webhooks", webhookRoutes);
```

**Add status fields to the model** (paste from `02-confession.model.js` bottom section):
```javascript
flagged:  { type: Boolean, default: false },
hidden:   { type: Boolean, default: false },
featured: { type: Boolean, default: false },
```

**Also add `filter: { hidden: false }` in the service `getAll()`.**

**Wire triggers into the controller** — add these after the service calls:
```javascript
// inside create — keyword detection:
const FLAGGED_KEYWORDS = ["urgent", "help", "danger", "emergency"];
const match = FLAGGED_KEYWORDS.find(w => confession.text.toLowerCase().includes(w));
if (match) fireWebhook("confession.flagged", { id: confession.id, keyword: match });

// inside upvote — trending threshold:
if (confession.upvotes === 10)
  fireWebhook("confession.trending", { id: confession.id, upvotes: confession.upvotes });

// inside report — auto-hide threshold:
if (confession.reports >= 3)
  fireWebhook("confession.reported", { id: confession.id, reports: confession.reports });
```

**Live demo sequence:**
```
1. POST /confessions  { "text": "urgent the server is on fire" }
   → terminal: [Webhook] ✓ Fired: confession.flagged → 200
   → terminal: [Webhook] Confession xxx flagged ← keyword: "urgent"

2. GET /webhooks/events
   → full event log with timestamps

3. PUT /confessions/:id/report  × 3
   → third report fires confession.reported
   → confession disappears from GET /confessions feed (hidden: true)

4. PUT /confessions/:id/upvote  × 10
   → tenth upvote fires confession.trending → featured: true in DB
```

> *"Notice the secret header `X-Webhook-Secret`.
> Stripe, GitHub, Shopify all use the same pattern — they sign webhook requests
> so your receiver can reject fakes before processing them."*

---

### ⏱ 1:53 – 2:00 | Final Polish + Wrap-up (7 min)
**Strategy → PASTE COMPLETE `10-error.middleware.js`, explain each section**

Create `src/middleware/error.middleware.js`. Register last in `app.js`:
```javascript
app.use(errorHandler);
```

Deliberately trigger each error type live:
```
GET /confessions/not-a-valid-id   → CastError → 400 (clean message, no stack trace)
POST /confessions (empty body)    → 422 from validator
DELETE /no-such-route             → 404 catch-all
```

**CORS** *(already in app.js — just point to it)*
> *"`app.use(cors())` is the one line that stops 90% of beginner headaches.
> Without it, the browser silently blocks your frontend from talking to your backend.
> In production, replace the wildcard with your actual domain."*

**Environment variables** *(show the .env file)*
> *"Why is `JWT_SECRET` not hardcoded? Because this file is in `.gitignore`.
> If you push a secret to a public GitHub repo it gets scraped by bots within minutes.
> `WEBHOOK_SECRET` works the same way — it's what stops random callers from hitting /webhooks/receive."*

**Architecture recap** — draw/show this diagram:
```
Browser
  │
  ├─ REST  → Routes → [Validator] → [Auth?] → Controller → Service → MongoDB
  │                                                │
  │                                         fireWebhook()
  │                                                │
  │                                         POST /webhooks/receive
  │                                                │
  │                                         receiver updates DB
  │
  └─ WS   → broadcast() pushes events to all connected tabs in real time
```

---

## Gist Files Quick Reference

| # | File | Type | When to use |
|---|------|------|-------------|
| 00 | `00-server-FINAL.js` | Staged reference | Update server.js at Stage 2 (DB) and Stage 3 (WS) |
| 01 | `01-config-env.js` | Paste complete | Config phase |
| 01 | `01-config-db.js` | Paste complete | Config phase |
| 01 | `01-utils.js` | Paste complete | Config phase |
| 02 | `02-confession.model.js` | Write scratch / reference | Model phase (add status fields in Webhook phase) |
| 03 | `03-SERVICE.skeleton.js` | Paste skeleton | Second+ service |
| 03 | `03-confession.service.js` | Reference | If running behind on service |
| 04 | `04-CONTROLLER.skeleton.js` | Paste skeleton | Controller phase (comments guide WS + webhook wiring) |
| 05 | `05-ROUTES.skeleton.js` | Paste skeleton | Routes phase |
| 06 | `06-validate.middleware.js` | Paste complete | Validation phase |
| 07 | `07-auth.skeleton.js` | Paste skeleton | Auth phase — write logic live |
| 08 | `08-websocket.broadcast.js` | Paste complete | WebSocket phase |
| 09 | `09-internal.webhook.js` | Paste complete | Webhook phase |
| 10 | `10-error.middleware.js` | Paste complete | Polish phase |

---

## Timing Buffer Guide

| If you're behind… | Skip / compress |
|---|---|
| 5 min | Compress pagination explanation — paste service from `03-confession.service.js` |
| 10 min | Skip writing auth middleware from scratch — paste complete from `07-auth.skeleton.js` |
| 15 min | Skip report route entirely — still demo upvote webhook trigger |
| 20 min | Paste full controller from gist reference, explain what's inside |
