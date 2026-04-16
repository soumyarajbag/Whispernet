# Phase 6 — Validation
**Speaker 1 · 1:05 – 1:10**

---

## Step 1 — Install package

```bash
npm install express-validator
```

---

## Step 2 — Create `src/validators/confession.validator.js`

> Paste this complete.

```js
import { body } from "express-validator";

export const createConfessionRules = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Confession text cannot be empty.")
    .isLength({ max: 500 })
    .withMessage("Confession must be 500 characters or fewer."),
];
```

> *"These rules describe what a valid request body looks like.
> They don't reject anything yet — that's validate()'s job."*

---

## Step 3 — Create `src/middleware/validate.middleware.js`

> Paste this complete.

```js
import { validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      error:   true,
      message: "Validation failed.",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  next();
};
```

> *"Middleware = a checkpoint between the request and the route handler.
> createConfessionRules runs the checks, validate() reads the results.
> If anything failed → 422, controller never runs.
> 422 Unprocessable Entity = the request was understood but the data was invalid."*

---

## Step 4 — Update `src/routes/confession.routes.js`

Add the two imports at the top, then update the POST route.

Full file:

```js
import { Router } from "express";
import { confessionController }  from "../controllers/confession.controller.js";
import { createConfessionRules } from "../validators/confession.validator.js";
import { validate }              from "../middleware/validate.middleware.js";

const router = Router();

router.get("/",           confessionController.getAll);
router.post("/",          createConfessionRules, validate, confessionController.create);
router.put("/:id/upvote", confessionController.upvote);
router.put("/:id/report", confessionController.report);
router.delete("/:id",     confessionController.remove);

export default router;
```

> *"Middleware chain order: createConfessionRules runs the checks → validate reads results → controller gets the clean data.
> If validate() rejects, the controller never runs."*

---

## ✅ Test

```
POST /confessions
Body: {}
→ 422 { "error": true, "message": "Validation failed.", "details": [...] }

POST /confessions
Body: { "text": "valid confession" }
→ 201 { "data": { ... } }
```
