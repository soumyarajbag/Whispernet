# Phase 5 — Remaining APIs (upvote, report, delete)
**Speaker 1 · 0:48 – 1:05**

> For each endpoint: the key DB line is shown first for you to type live,
> then the complete method is shown so you can verify and fill in the rest.

---

## Part A — Add to `src/services/confession.service.js`

Add these three methods inside the `confessionService` object, after `create`.

---

### upvote

> ✍️ **Type this line yourself first:**
> ```js
> const confession = await Confession.findByIdAndUpdate(id, { $inc: { upvotes: 1 } }, { new: true });
> ```

Complete method:

```js
async upvote(id) {
  const confession = await Confession.findByIdAndUpdate(
    id,
    { $inc: { upvotes: 1 } },
    { new: true }
  );
  if (!confession) throw new AppError(`Confession '${id}' not found.`, 404);
  return confession;
},
```

> *"$inc = atomic increment. Safe if 1000 users upvote the same post at the same time — no lost updates.
> { new: true } = return the updated document, not the old one."*

---

### report

> ✍️ **Type this line yourself first:**
> ```js
> const confession = await Confession.findByIdAndUpdate(id, { $inc: { reports: 1 } }, { new: true });
> ```

Complete method:

```js
async report(id) {
  const confession = await Confession.findByIdAndUpdate(
    id,
    { $inc: { reports: 1 } },
    { new: true }
  );
  if (!confession) throw new AppError(`Confession '${id}' not found.`, 404);
  return confession;
},
```

---

### remove

> ✍️ **Type this line yourself first:**
> ```js
> const confession = await Confession.findByIdAndDelete(id);
> ```

Complete method:

```js
async remove(id) {
  const confession = await Confession.findByIdAndDelete(id);
  if (!confession) throw new AppError(`Confession '${id}' not found.`, 404);
  return confession;
},
```

---

## Part B — Add to `src/controllers/confession.controller.js`

Add these three handlers inside the `confessionController` object, after `create`.

---

### upvote

> ✍️ **Type this line yourself first:**
> ```js
> const confession = await confessionService.upvote(req.params.id);
> ```

Complete handler:

```js
upvote: catchAsync(async (req, res) => {
  const confession = await confessionService.upvote(req.params.id);
  res.json({ data: confession });
}),
```

---

### report

> ✍️ **Type this line yourself first:**
> ```js
> const confession = await confessionService.report(req.params.id);
> ```

Complete handler:

```js
report: catchAsync(async (req, res) => {
  const confession = await confessionService.report(req.params.id);
  res.json({ data: confession });
}),
```

---

### remove

> ✍️ **Type this line yourself first:**
> ```js
> await confessionService.remove(req.params.id);
> ```

Complete handler:

```js
remove: catchAsync(async (req, res) => {
  await confessionService.remove(req.params.id);
  res.status(204).send();
}),
```

> *"204 No Content = success, nothing to return. Used for deletes."*

---

## Part C — Update `src/routes/confession.routes.js`

> Add these three lines to the router. No auth on delete yet — Speaker 2 adds that in Phase 7.

```js
router.put("/:id/upvote", confessionController.upvote);
router.put("/:id/report", confessionController.report);
router.delete("/:id",     confessionController.remove);
```

Full file now looks like this:

```js
import { Router } from "express";
import { confessionController } from "../controllers/confession.controller.js";

const router = Router();

router.get("/",           confessionController.getAll);
router.post("/",          confessionController.create);
router.put("/:id/upvote", confessionController.upvote);
router.put("/:id/report", confessionController.report);
router.delete("/:id",     confessionController.remove);

export default router;
```

---

## ✅ Test

```
PUT  /confessions/:id/upvote   →  { "data": { "upvotes": 1, ... } }
PUT  /confessions/:id/report   →  { "data": { "reports": 1, ... } }
DELETE /confessions/:id        →  204 No Content
```
