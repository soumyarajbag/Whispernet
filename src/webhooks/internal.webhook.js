// ─── Internal Webhook Fire Function ──────────────────────────────────────────
// Webhooks are "reverse APIs" — instead of the client asking for data,
// the SERVER proactively notifies a listener when something happens.
//
// Here the app fires HTTP POST requests to ITS OWN /webhooks/receive endpoint.
// This makes the lifecycle fully visible without any external setup:
//
//   POST /confessions           → text contains "urgent"
//       │
//       └─ fireWebhook("confession.flagged", payload)
//               │
//               └─ HTTP POST → /webhooks/receive
//                       │
//                       └─ receiver marks confession as flagged in DB
//
// In a real system, WEBHOOK_URL could be any external service
// (Slack, Zapier, another microservice). Swapping the URL is the only change.

import { env } from "../config/env.js";

const WEBHOOK_URL    = `http://localhost:${env.PORT}/webhooks/receive`;
const WEBHOOK_SECRET = env.WEBHOOK_SECRET;

export const fireWebhook = async (event, payload) => {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        // X-Webhook-Secret proves the request came from us, not a random caller
        "X-Webhook-Secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        event,
        payload,
        firedAt: new Date().toISOString(),
      }),
    });

    console.log(`[Webhook] ✓ Fired: ${event} → ${res.status}`);
  } catch (err) {
    // Fire-and-forget: webhook failure should never crash the main request
    console.error(`[Webhook] ✗ Failed to fire "${event}":`, err.message);
  }
};
