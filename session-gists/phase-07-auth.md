# Phase 7 — Auth + AuthZ
**Speaker 2 · 1:10 – 1:33**

---

## Step 1 — Install packages

```bash
npm install jsonwebtoken
```

---

## Step 2 — Create `src/services/auth.service.js`

> Paste the skeleton below, then write the two method bodies live.

Paste this first (the structure):

```js
import jwt      from "jsonwebtoken";
import { env }  from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const authService = {

  login(username, password) {

  },

  verifyToken(token) {

  },

};
```

### login() — write this live:

> ✍️ **Type these lines inside login():**
> ```js
> const isValid = username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD;
> if (!isValid) throw new AppError("Invalid credentials.", 401);
> const token = jwt.sign({ username, role: "admin" }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
> return token;
> ```

### verifyToken() — write this live:

> ✍️ **Type these lines inside verifyToken():**
> ```js
> try {
>   return jwt.verify(token, env.JWT_SECRET);
> } catch {
>   throw new AppError("Invalid or expired token.", 401);
> }
> ```

Complete file for reference:

```js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const authService = {

  login(username, password) {
    const isValid = username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD;
    if (!isValid) throw new AppError("Invalid credentials.", 401);

    const token = jwt.sign(
      { username, role: "admin" },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
    return token;
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw new AppError("Invalid or expired token.", 401);
    }
  },

};
```

> *"Authentication = proving WHO you are.
> jwt.sign() stamps a token. jwt.verify() validates it.
> The payload is just base64 — paste the token at jwt.io and anyone can read it.
> Never put passwords or secrets inside a JWT."*

---

## Step 3 — Create `src/middleware/auth.middleware.js`

> Paste the skeleton, then write the body live.

Paste this first:

```js
import { authService } from "../services/auth.service.js";

export const verifyAdmin = (req, res, next) => {

};
```

### verifyAdmin body — write this live:

> ✍️ **Type these lines inside verifyAdmin():**
> ```js
> const authHeader = req.headers["authorization"];
> if (!authHeader?.startsWith("Bearer "))
>   return res.status(401).json({ error: true, message: "Access denied. No token provided." });
> const token = authHeader.split(" ")[1];
> try {
>   const decoded = authService.verifyToken(token);
>   if (decoded.role !== "admin")
>     return res.status(403).json({ error: true, message: "Forbidden. Admin role required." });
>   req.user = decoded;
>   next();
> } catch (err) {
>   return res.status(err.statusCode || 401).json({ error: true, message: err.message });
> }
> ```

Complete file for reference:

```js
import { authService } from "../services/auth.service.js";

// Expects: Authorization: Bearer <jwt>
export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: true,
      message: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = authService.verifyToken(token);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        error: true,
        message: "Forbidden. Admin role required.",
      });
    }

    req.user = decoded; // Available in any downstream handler
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      error: true,
      message: err.message,
    });
  }
};
```

> *"The Authorization header is the standard REST way to pass tokens: `Authorization: Bearer <token>`.
> We split on ' ' to strip the 'Bearer ' prefix and extract the raw JWT.
> The payload inside the token is just base64 — paste it at jwt.io and anyone can read it.
> Never put passwords or secrets inside a JWT payload."*

---

## Step 4 — Create `src/controllers/admin.controller.js`

> Paste this complete.

```js
import { authService } from "../services/auth.service.js";
import { catchAsync }  from "../utils/catchAsync.js";

export const adminController = {

  login: catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const token = authService.login(username, password);

    res.json({
      message: "Login successful.",
      token,
      hint: "Decode your token live at https://jwt.io to inspect the payload.",
    });
  }),

};
```

> *"We return the token directly in the JSON response body.
> The client stores it (e.g. in memory or localStorage) and sends it back as `Authorization: Bearer <token>` on protected requests.
> We include a hint to jwt.io — paste the token there live and show the class that the payload is readable: never put secrets in a JWT."*

**Live demo:** `POST /admin/login` → copy the token from the response → paste at jwt.io → show students the `{ username, role, iat, exp }` payload is fully readable.

---

## Step 5 — Create `src/routes/admin.routes.js`

> Paste this complete.

```js
import { Router }          from "express";
import { adminController } from "../controllers/admin.controller.js";

const router = Router();

router.post("/login", adminController.login);

export default router;
```

---

## Step 6 — Update `src/app.js`

Add the admin router import and mount it. Replace the entire file:

```js
import express          from "express";
import cors             from "cors";
import confessionRoutes from "./routes/confession.routes.js";
import adminRoutes      from "./routes/admin.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/confessions", confessionRoutes);
app.use("/admin",       adminRoutes);

export default app;
```

---

## Step 7 — Protect the delete route (AuthZ)

> Authorization = proving WHAT you're allowed to do.
> One line change in `src/routes/confession.routes.js`.

Add the import at the top:

```js
import { verifyAdmin } from "../middleware/auth.middleware.js";
```

Update the delete route:

```js
router.delete("/:id", verifyAdmin, confessionController.remove);
```

Full routes file now:

```js
import { Router } from "express";
import { confessionController }  from "../controllers/confession.controller.js";
import { createConfessionRules } from "../validators/confession.validator.js";
import { validate }              from "../middleware/validate.middleware.js";
import { verifyAdmin }           from "../middleware/auth.middleware.js";

const router = Router();

router.get("/",           confessionController.getAll);
router.post("/",          createConfessionRules, validate, confessionController.create);
router.put("/:id/upvote", confessionController.upvote);
router.put("/:id/report", confessionController.report);
router.delete("/:id",     verifyAdmin, confessionController.remove);

export default router;
```

> *"verifyAdmin sits between the route and the controller.
> If the token is missing or invalid, the controller never runs — request stops at the checkpoint."*

---

## ✅ Test

```
POST /admin/login    { "username": "admin", "password": "secret123" }
→ 200 { "message": "Login successful.", "token": "<jwt>", "hint": "..." }
→ Copy the token value → paste at jwt.io → show the decoded payload

POST /admin/login    { "username": "admin", "password": "wrong" }
→ 401 { "error": true, "message": "Invalid credentials." }

DELETE /confessions/:id   (no Authorization header)
→ 401 { "error": true, "message": "Access denied. No token provided." }

DELETE /confessions/:id   (with header: Authorization: Bearer <token>)
→ 204 No Content
```
