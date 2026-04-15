# Phase 8 — WebSocket
**Speaker 2 · 1:33 – 1:43**

---

## Step 1 — Install package

```bash
npm install ws
```

---

## Step 2 — Create `src/websocket/broadcast.js`

> Paste this complete.

```js
import { WebSocketServer } from "ws";

let wss = null;

export const initWebSocket = (httpServer) => {
  wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (socket) => {
    console.log("[WS] Client connected  — total:", wss.clients.size);
    socket.on("close", () =>
      console.log("[WS] Client disconnected — total:", wss.clients.size)
    );
  });

  console.log("[WS] WebSocket server ready");
};

export const broadcast = (event, payload) => {
  if (!wss) return;
  const message = JSON.stringify({ event, payload });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
};
```

> *"REST = walkie-talkie. You speak, the line closes.
> WebSocket = phone call. The connection stays open — both sides can talk any time.
> broadcast() pushes one JSON message to every connected client at once.
> readyState === 1 means the connection is open."*

---

## Step 3 — Update `server.js`

> Replace the entire file with this.

```js
import "dotenv/config";
import http              from "http";
import { env }           from "./src/config/env.js";
import { connectDB }     from "./src/config/db.js";
import app               from "./src/app.js";
import { initWebSocket } from "./src/websocket/broadcast.js";

const bootstrap = async () => {
  await connectDB();

  const server = http.createServer(app);
  initWebSocket(server);

  server.listen(env.PORT, () => {
    console.log(`WhisperNet → http://localhost:${env.PORT}`);
    console.log(`WebSocket  → ws://localhost:${env.PORT}`);
  });
};

bootstrap();
```

> *"We wrap Express in http.createServer() so the WebSocket server can share the same port.
> initWebSocket(server) attaches ws to that HTTP server."*

---

## Step 4 — Update `src/controllers/confession.controller.js`

Add the import at the top of the file:

```js
import { broadcast } from "../websocket/broadcast.js";
```

Inside `create` — add this line after the confession is saved:

```js
broadcast("new_confession", confession);
```

Inside `upvote` — add this line after the service call:

```js
broadcast("upvote_updated", { id: confession.id, upvotes: confession.upvotes });
```

Inside `remove` — add this line after the service call:

```js
broadcast("confession_deleted", { id: req.params.id });
```

Complete controller for reference:

```js
import { confessionService } from "../services/confession.service.js";
import { catchAsync }        from "../utils/catchAsync.js";
import { broadcast }         from "../websocket/broadcast.js";

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
    res.status(201).json({ data: confession });
  }),

  upvote: catchAsync(async (req, res) => {
    const confession = await confessionService.upvote(req.params.id);
    broadcast("upvote_updated", { id: confession.id, upvotes: confession.upvotes });
    res.json({ data: confession });
  }),

  report: catchAsync(async (req, res) => {
    const confession = await confessionService.report(req.params.id);
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

## ✅ Demo

Open the frontend in **two browser tabs side by side**.

```
Tab 1: POST /confessions { "text": "hello from tab 1" }
→ Card appears in Tab 2 instantly — no refresh needed

Tab 1: PUT /confessions/:id/upvote
→ Upvote count updates in Tab 2 in real time
```
