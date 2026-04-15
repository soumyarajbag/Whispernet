# Phase 4 — First Full API (GET + POST /confessions)
**Speaker 1 · 0:23 – 0:48**

> Write every file from scratch. This is the core teaching moment.
> Work through each step in order — model → service → controller → routes → wire up.

---

## Step 1 — Create `src/models/confession.model.js`

> Write this live, step by step. Explain each part as you go.

```js
import mongoose from "mongoose";

const confessionSchema = new mongoose.Schema(
  {
    text: {
      type:      String,
      required:  [true, "Confession text is required"],
      trim:      true,
      maxlength: [500, "Must be 500 characters or fewer"],
    },
    upvotes: { type: Number, default: 0 },
    reports: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

confessionSchema.index({ createdAt: -1 });
confessionSchema.index({ upvotes:   -1 });

const Confession = mongoose.model("Confession", confessionSchema);
export default Confession;
```

> *"Schema = the contract for every document in the collection.
> required, trim, maxlength = DB-level constraints — the second safety net after validation.
> timestamps: true = createdAt + updatedAt on every document for free.
> toJSON transform = rename _id to id and strip __v before sending to the client.
> index() = pre-sorts the data so queries stay fast as the collection grows."*

---

## Step 2 — Create `src/services/confession.service.js`

> Write this live. Explain the data logic as you go.

```js
import Confession   from "../models/confession.model.js";
import { AppError } from "../utils/AppError.js";

const SORT_MAP = {
  newest: { createdAt: -1 },
  top:    { upvotes:   -1 },
};

export const confessionService = {

  async getAll({ sort = "newest", page = 1, limit = 10 }) {
    const sortQuery = SORT_MAP[sort] ?? SORT_MAP.newest;
    const skip      = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Confession.find({}).sort(sortQuery).skip(skip).limit(limit),
      Confession.countDocuments({}),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async create(text) {
    return Confession.create({ text });
  },

};
```

> *"Service = pure data logic. No req, no res, no HTTP — just arguments in, data out.
> This is what makes services independently testable.
> Promise.all runs both DB queries at the same time — one round-trip instead of two."*

---

## Step 3 — Create `src/controllers/confession.controller.js`

> Write this live. Explain the HTTP layer as you go.

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
> No DB calls here — that's the service's job.
> Status 201 = Created. 200 is the default for everything else."*

---

## Step 4 — Create `src/routes/confession.routes.js`

> Write this live.

```js
import { Router } from "express";
import { confessionController } from "../controllers/confession.controller.js";

const router = Router();

router.get("/",  confessionController.getAll);
router.post("/", confessionController.create);

export default router;
```

> *"Router = a mini-app scoped to one URL prefix.
> We mount it in app.js with app.use('/confessions', router) —
> every route here automatically gets /confessions in front of it."*

---

## Step 5 — Update `src/app.js`

> Add 3 lines to the existing file. Replace the entire file with this:

```js
import express          from "express";
import cors             from "cors";
import confessionRoutes from "./routes/confession.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/confessions", confessionRoutes);

export default app;
```

> *"cors() is the one line that stops 90% of beginner headaches.
> Without it the browser silently blocks your frontend from talking to your backend."*

---

## ✅ Test

```
GET  /confessions
→ { "data": [], "meta": { "total": 0, ... } }

POST /confessions
Body: { "text": "this is my first confession" }
→ { "data": { "id": "...", "text": "...", "upvotes": 0, ... } }

GET  /confessions
→ { "data": [ { "id": "...", ... } ], "meta": { "total": 1, ... } }
```
