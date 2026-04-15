# WhisperNet — 120-Minute Backend Masterclass
## Speaker Notes

> Rule 1 — First time for a pattern → write from scratch
> Rule 2 — Same pattern again → paste gist, write only the ✍️ line(s) live
> Rule 3 — Pure boilerplate → paste complete, talk while typing

---

## ── SPEAKER 1 ──────────────────────────────────────────────

### Phase 1 · 0:00 – 0:08 · Project Init

```bash
mkdir whispernet && cd whispernet
npm init -y
npm install express
```

**Write `server.js` live** (from scratch, line by line):
```js
import app from "./src/app.js";
app.listen(3000, () => console.log("WhisperNet → http://localhost:3000"));
```

**Write `src/app.js` live** (from scratch):
```js
import express from "express";
const app = express();
app.use(express.json());
export default app;
```

**Write `.env.example` live**:
```
PORT=3000
NODE_ENV=development
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=2h
ADMIN_USERNAME=
ADMIN_PASSWORD=
WEBHOOK_SECRET=
```
Copy `.env.example` → `.env`, fill in values.

✅ `node server.js` → `WhisperNet → http://localhost:3000`

> *"A server is just a program listening on a port waiting for requests.
> Request in → process → response out."*

---

### Phase 2 · 0:08 – 0:18 · Config + DB

```bash
npm install dotenv mongoose
```

**`src/config/env.js`** → PASTE COMPLETE from `01-env.js`
> *"Every process.env access in the whole app goes through here.
> If a required var is missing the server crashes at boot — fast failure
> beats a mysterious crash 10 minutes into a live request."*

**`src/config/db.js`** → PASTE COMPLETE from `01-db.js`
> *"We await connectDB() before listening. No DB = no point accepting traffic."*

**Update `server.js` → Stage 2** (from `00-server.js` — paste and replace):
- Add `dotenv/config` import
- Wrap listen in async `bootstrap()` with `await connectDB()`

Walk through MongoDB Atlas: cluster → Connect → Drivers → copy URI → paste in `.env`

✅ `node server.js` → `[DB] Connected → ...atlas...`

---

### Phase 3 · 0:18 – 0:23 · Utils

**Two files** → PASTE COMPLETE from `01-utils.js`:
- `src/utils/AppError.js`
- `src/utils/catchAsync.js`

> *"AppError bundles a message with a status code. Services throw it, the
> error handler catches it. catchAsync = zero try/catch in every controller —
> rejected promises auto-forward to next(err)."*

---

### Phase 4 · 0:23 – 0:48 · First Full API — GET + POST /confessions

**Write every file from scratch. This is the core teaching moment.**
Reference `02-model.js` in a second tab — glance only, don't copy.

#### Step 1 · Model

**Write `src/models/confession.model.js` live:**
```js
import mongoose from "mongoose";

const confessionSchema = new mongoose.Schema(
  {
    text:    { type: String, required: true, trim: true, maxlength: 500 },
    upvotes: { type: Number, default: 0 },
    reports: { type: Number, default: 0 },
    // flagged / hidden / featured  ← add in Phase 9 (Webhooks)
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; },
    },
  }
);

confessionSchema.index({ createdAt: -1 });
confessionSchema.index({ upvotes:   -1 });

const Confession = mongoose.model("Confession", confessionSchema);
export default Confession;
```
> *"Schema = the contract for every document in the collection.
> Constraints here are a second safety net — the validator catches bad input first."*

#### Step 2 · Service

**Write `src/services/confession.service.js` live** — `getAll()` then `create()`:
```js
import Confession  from "../models/confession.model.js";
import { AppError } from "../utils/AppError.js";

const SORT_MAP = { newest: { createdAt: -1 }, top: { upvotes: -1 } };

export const confessionService = {
  async getAll({ sort = "newest", page = 1, limit = 10 }) {
    const sortQuery = SORT_MAP[sort] ?? SORT_MAP.newest;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Confession.find({}).sort(sortQuery).skip(skip).limit(limit),
      Confession.countDocuments({}),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  async create(text) {
    return Confession.create({ text });
  },
};
```
> *"Service = pure data logic. No req, no res. Arguments in, data out.
> Testable without spinning up an HTTP server."*

#### Step 3 · Controller

**Write `src/controllers/confession.controller.js` live:**
```js
import { confessionService } from "../services/confession.service.js";
import { catchAsync }        from "../utils/catchAsync.js";

export const confessionController = {
  getAll: catchAsync(async (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const result = await confessionService.getAll({ sort: req.query.sort, page, limit });
    res.json(result);
  }),

  create: catchAsync(async (req, res) => {
    const confession = await confessionService.create(req.body.text);
    res.status(201).json({ data: confession });
  }),
};
```
> *"Controller's only job: speak HTTP. Extract from req, call service, send response.
> No DB calls here — that's the service's territory."*

#### Step 4 · Routes

**Paste `05-routes.js`** → then write the two lines live:
```js
router.get("/",  confessionController.getAll);
router.post("/", confessionController.create);
```

#### Step 5 · Wire into app.js (Stage 2 — add 3 lines)
```js
import cors             from "cors";
import confessionRoutes from "./routes/confession.routes.js";
// ...
app.use(cors());
app.use("/confessions", confessionRoutes);
```

✅ `GET /confessions` → `{ data: [], meta: ... }`
✅ `POST /confessions { "text": "first one" }` → `{ data: { id, text, ... } }`

> *"Promise.all runs both DB queries at the same time — one round-trip instead of two."*

---

### Phase 5 · 0:48 – 1:05 · Remaining Endpoints (upvote, report, delete)

**Service** → PASTE from `03-service-additions.js` (below getAll + create)
For each of the 3 methods, type the ✍️ line live, then move on.

**Controller** → PASTE from `04-controller-additions.js` (below getAll + create)
For each of the 3 handlers, type the ✍️ line live, then move on.

**Routes** → add to `confession.routes.js` (write live):
```js
router.put("/:id/upvote", confessionController.upvote);
router.put("/:id/report", confessionController.report);
router.delete("/:id",     confessionController.remove);  // no auth yet
```

✅ `PUT /confessions/:id/upvote` → upvotes increments
✅ `PUT /confessions/:id/report` → reports increments
✅ `DELETE /confessions/:id` → 204 (no auth needed yet)

> *"$inc is atomic. If 1000 users upvote the same confession simultaneously,
> every single increment lands. No lost updates."*

---

### Phase 6 · 1:05 – 1:10 · Validation

```bash
npm install express-validator
```

**Paste COMPLETE from `06-validation.js`** → creates:
- `src/middleware/validate.middleware.js`
- `src/validators/confession.validator.js`

**Update POST route (1 line)**:
```js
router.post("/", createConfessionRules, validate, confessionController.create);
```
Add the two imports at the top of confession.routes.js.

✅ `POST /confessions {}` → 422 `{ error: true, details: [...] }`

> *"Two layers: validator catches bad input at the HTTP boundary,
> Mongoose schema catches anything that slips through at the DB boundary."*

---

## ── SPEAKER 2 ──────────────────────────────────────────────

### Phase 7 · 1:10 – 1:28 · Auth — JWT + Cookie

```bash
npm install jsonwebtoken cookie-parser
```

**From `07-auth.js` paste Parts A, B, C in order:**

**Part A** → `src/services/auth.service.js` (skeleton)
Write `login()` and `verifyToken()` bodies live. Then:
1. `POST /admin/login` with valid creds → copy the token
2. Paste token at **jwt.io** live on projector → show payload is readable
> *"The payload is just base64 — anyone can decode it. Never put passwords in a JWT."*

**Part B** → `src/middleware/auth.middleware.js` (skeleton)
Write `verifyAdmin` body live. Concept: reads from cookie, not header.
> *"localStorage = any injected JS can steal the token. httpOnly cookie = even
> malicious scripts can't read it. The browser stores and sends it automatically."*

**Part C** → `admin.controller.js` + `admin.routes.js` (paste complete)
Write the `res.cookie(...)` line live in `login()`.

**Update app.js → Stage 3** (from `00-app.js` — add 4 changes).

✅ `POST /admin/login` → cookie appears in DevTools → Application → Cookies
✅ `GET /admin/verify` → `{ username, role }` while logged in
✅ `POST /admin/logout` → cookie cleared

---

### Phase 7b · 1:28 – 1:33 · AuthZ — protect delete

From `07-auth.js` Part D — 2 changes to `confession.routes.js`:

```js
// Add import:
import { verifyAdmin } from "../middleware/auth.middleware.js";

// Update delete:
router.delete("/:id", verifyAdmin, confessionController.remove);
```

✅ `DELETE /confessions/:id` (no cookie) → 401
✅ `DELETE /confessions/:id` (logged in) → 204

> *"Authentication = WHO you are. Authorization = WHAT you're allowed to do.
> The middleware chain is a checkpoint: if verifyAdmin rejects, controller never runs."*

---

### Phase 8 · 1:33 – 1:43 · WebSocket

```bash
npm install ws
```

**`src/websocket/broadcast.js`** → PASTE COMPLETE from `08-websocket.js`

**Update server.js → Stage 3** (from `00-server.js` — replace file).

**Add 3 lines to `confession.controller.js`**:
```js
import { broadcast } from "../websocket/broadcast.js";
// inside create:   broadcast("new_confession", confession);
// inside upvote:   broadcast("upvote_updated", { id: confession.id, upvotes: confession.upvotes });
// inside remove:   broadcast("confession_deleted", { id: req.params.id });
```

✅ Open two browser tabs → POST in one → card appears in the other instantly

> *"REST = walkie-talkie. Speak, line closes. Done.
> WebSocket = phone call. Line stays open, both sides talk any time."*

---

### Phase 9 · 1:43 – 1:53 · Webhooks

No new packages.

**Paste COMPLETE from `09-webhooks.js`** → creates 3 files + 4 updates to existing files (all listed at the top of the gist).

✅ Demo sequence:
```
POST /confessions { "text": "urgent help needed" }
  terminal: [Webhook] ✓ Fired: confession.flagged → 200
  terminal: [Webhook] Confession xxx flagged ← keyword: "urgent"

GET /webhooks/events  →  full event log with timestamps

PUT /confessions/:id/report  × 3
  → 3rd report fires confession.reported → confession hidden from feed

PUT /confessions/:id/upvote  × 10
  → 10th upvote fires confession.trending → featured: true in DB
```

> *"Webhook = reverse API. Normal API: you knock on their door.
> Webhook: you give them your address and they knock on yours when something happens.
> Stripe, GitHub, Shopify all use this exact pattern."*

---

### Phase 10 · 1:53 – 2:00 · Error Handling + Wrap-up

**`src/middleware/error.middleware.js`** → PASTE COMPLETE from `10-error.js`

**Update app.js → Stage 5** (add 2 lines last):
```js
import { errorHandler } from "./middleware/error.middleware.js";
app.use(errorHandler); // must be the last middleware
```

✅ Trigger each error type live:
```
GET /confessions/not-a-valid-id  → 400 CastError (clean message)
POST /confessions {}             → 422 validator
GET /no-such-route               → 404 catch-all
```

**Architecture diagram on the board:**
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

## ⏱ Timing Buffer

| Behind by | Do this |
|-----------|---------|
| 5 min | For remaining APIs, skip writing service lines live — just uncomment the ✍️ hints |
| 10 min | Skip writing auth middleware from scratch — paste Part B complete as-is |
| 15 min | Skip report endpoint entirely — still demo upvote webhook trigger |
| 20 min | Paste full controller reference, explain what's inside without live coding |
