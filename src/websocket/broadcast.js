// ─── WebSocket Broadcaster ────────────────────────────────────────────────────
// Initialised once from server.js; exposes a broadcast() helper that any
// controller can call to push a structured event to every connected client.
//
// Event shape: { event: string, payload: any }

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
    if (client.readyState === 1) client.send(message); // 1 = OPEN
  }
};
