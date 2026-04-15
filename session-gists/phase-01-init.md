# Phase 1 — Project Init
**Speaker 1 · 0:00 – 0:08**

---

## Step 1 — Create the project

```bash
mkdir whispernet
cd whispernet
npm init -y
npm install express
```

---

## Step 2 — Create `src/app.js`

> Write this from scratch, line by line.

```js
import express from "express";

const app = express();

app.use(express.json());

export default app;
```

> *"app.js assembles the server. express.json() lets us read JSON request bodies.
> We export app so server.js can use it."*

---

## Step 3 — Create `server.js`

> Write this from scratch, line by line.

```js
import app from "./src/app.js";

app.listen(3000, () => {
  console.log("WhisperNet → http://localhost:3000");
});
```

> *"server.js is the entry point. It imports app and tells it to start listening on port 3000.
> A server is just a program waiting for requests on a port."*

---

## Step 4 — Create `.env.example`

> This documents every environment variable the project needs.

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

Then copy it to a real `.env` file and fill in the values:

```bash
cp .env.example .env
```

> *"JWT and WEBHOOK vars are for later phases. Declare them all now so we never touch this file again."*

---

## Step 5 — Add `"type": "module"` to `package.json`

Open `package.json` and add this line so we can use `import/export`:

```json
{
  "type": "module"
}
```

---

## ✅ Test

```bash
node server.js
```

Expected output:
```
WhisperNet → http://localhost:3000
```
