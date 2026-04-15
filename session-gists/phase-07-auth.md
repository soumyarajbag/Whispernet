# Phase 7 — Auth + AuthZ
**Speaker 2 · 1:10 – 1:33**

---

## Step 1 — Install packages

```bash
npm install jsonwebtoken cookie-parser
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
> if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD)
>   throw new AppError("Invalid credentials.", 401);
> return jwt.sign({ username, role: "admin" }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
> ```

### verifyToken() — write this live:

> ✍️ **Type these lines inside verifyToken():**
> ```js
> try   { return jwt.verify(token, env.JWT_SECRET); }
> catch { throw new AppError("Invalid or expired token.", 401); }
> ```

Complete file for reference:

```js
import jwt      from "jsonwebtoken";
import { env }  from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const authService = {

  login(username, password) {
    if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD)
      throw new AppError("Invalid credentials.", 401);
    return jwt.sign({ username, role: "admin" }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  },

  verifyToken(token) {
    try   { return jwt.verify(token, env.JWT_SECRET); }
    catch { throw new AppError("Invalid or expired token.", 401); }
  },

};
```

> *"Authentication = proving WHO you are.
> jwt.sign() stamps a token. jwt.verify() validates it.
> The payload is just base64 — paste the token at jwt.io and anyone can read it.
> Never put passwords or secrets inside a JWT."*

**Live demo:** `POST /admin/login` → copy the token → paste at jwt.io → show students the payload is readable.

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
> const token = req.cookies?.token;
> if (!token)
>   return res.status(401).json({ error: true, message: "Access denied. No token provided." });
> try {
>   const decoded = authService.verifyToken(token);
>   if (decoded.role !== "admin")
>     return res.status(403).json({ error: true, message: "Forbidden. Admin only." });
>   req.user = decoded;
>   next();
> } catch (err) {
>   return res.status(err.statusCode || 401).json({ error: true, message: err.message });
> }
> ```

Complete file for reference:

```js
import { authService } from "../services/auth.service.js";

export const verifyAdmin = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token)
    return res.status(401).json({ error: true, message: "Access denied. No token provided." });

  try {
    const decoded = authService.verifyToken(token);

    if (decoded.role !== "admin")
      return res.status(403).json({ error: true, message: "Forbidden. Admin only." });

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: true, message: err.message });
  }
};
```

> *"Why cookies instead of localStorage?
> localStorage = any JavaScript on the page can read it. If there's an XSS attack, the token is stolen.
> httpOnly cookie = even malicious injected scripts cannot read it. The browser stores and sends it automatically.
> SameSite=Strict = the browser won't send it on cross-site requests — CSRF-proof."*

---

## Step 4 — Create `src/controllers/admin.controller.js`

> Paste this complete.

```js
import { authService } from "../services/auth.service.js";
import { env }         from "../config/env.js";
import { catchAsync }  from "../utils/catchAsync.js";

function expiryMs(str) {
  const m = String(str).match(/^(\d+)([smhd])$/);
  if (!m) return 7200000;
  const units = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 };
  return parseInt(m[1]) * units[m[2]];
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "strict",
  secure:   env.NODE_ENV === "production",
  maxAge:   expiryMs(env.JWT_EXPIRES_IN),
};

export const adminController = {

  login: catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const token = authService.login(username, password);
    res.cookie("token", token, COOKIE_OPTS).json({ message: "Login successful." });
  }),

  logout: catchAsync(async (_req, res) => {
    res
      .clearCookie("token", { httpOnly: true, sameSite: "strict", secure: env.NODE_ENV === "production" })
      .json({ message: "Logged out." });
  }),

  verify: catchAsync(async (req, res) => {
    res.json({ username: req.user.username, role: req.user.role });
  }),

};
```

> *"res.cookie() tells the browser to store the token.
> The browser sends it back automatically on every future request — the frontend JS never sees the value.
> clearCookie() in logout deletes it from the browser."*

---

## Step 5 — Create `src/routes/admin.routes.js`

> Paste this complete.

```js
import { Router }          from "express";
import { adminController } from "../controllers/admin.controller.js";
import { verifyAdmin }     from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login",  adminController.login);
router.post("/logout", adminController.logout);
router.get("/verify",  verifyAdmin, adminController.verify);

export default router;
```

---

## Step 6 — Update `src/app.js`

Replace the entire file with this:

```js
import express          from "express";
import cors             from "cors";
import cookieParser     from "cookie-parser";
import confessionRoutes from "./routes/confession.routes.js";
import adminRoutes      from "./routes/admin.routes.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

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
→ 200 { "message": "Login successful." }
→ Cookie "token" appears in browser DevTools → Application → Cookies

GET  /admin/verify
→ 200 { "username": "admin", "role": "admin" }

POST /admin/login    { "username": "admin", "password": "wrong" }
→ 401 { "error": true, "message": "Invalid credentials." }

DELETE /confessions/:id   (without logging in first)
→ 401 { "error": true, "message": "Access denied." }

DELETE /confessions/:id   (while logged in)
→ 204 No Content

POST /admin/logout
→ 200 { "message": "Logged out." }
→ Cookie is cleared from browser
```
