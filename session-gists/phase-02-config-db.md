# Phase 2 — Config + DB
**Speaker 1 · 0:08 – 0:18**

---

## Step 1 — Install packages

```bash
npm install dotenv mongoose
```

---

## Step 2 — Create `src/config/env.js`

> Paste this complete. Explain each variable while typing.

```js
const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`"${key}" is missing from .env`);
  return value;
};

export const env = {
  PORT:           process.env.PORT     || "3000",
  NODE_ENV:       process.env.NODE_ENV || "development",

  MONGODB_URI:    required("MONGODB_URI"),

  JWT_SECRET:     required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "2h",

  ADMIN_USERNAME: required("ADMIN_USERNAME"),
  ADMIN_PASSWORD: required("ADMIN_PASSWORD"),

  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "whispernet-secret",
};
```

> *"Every process.env read in the whole app goes through here.
> required() crashes the server immediately at boot if a variable is missing —
> fast failure beats a mysterious crash 10 minutes into a live request."*

---

## Step 3 — Create `src/config/db.js`

> Paste this complete.

```js
import mongoose from "mongoose";
import { env }  from "./env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`[DB] Connected → ${conn.connection.host}`);
  } catch (err) {
    console.error("[DB] Failed to connect:", err.message);
    process.exit(1);
  }
};
```

> *"process.exit(1) if DB is unreachable — no point accepting traffic without a database."*

---

## Step 4 — MongoDB Atlas setup (walkthrough)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster
2. **Database Access** → Add user with password
3. **Network Access** → Allow access from anywhere (`0.0.0.0/0`)
4. **Connect** → Drivers → Copy the connection string
5. Paste into `.env` as `MONGODB_URI=mongodb+srv://...`

---

## Step 5 — Update `server.js`

> Replace the entire file with this.

```js
import "dotenv/config";
import { env }       from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import app           from "./src/app.js";

const bootstrap = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`WhisperNet → http://localhost:${env.PORT}`);
  });
};

bootstrap();
```

> *"We await connectDB() before listening — the server only accepts traffic once the DB is ready.
> The async bootstrap() pattern is the clean way to do this."*

---

## ✅ Test

```bash
node server.js
```

Expected output:
```
[DB] Connected → ac-xxxxxx.mongodb.net
WhisperNet → http://localhost:3000
```
