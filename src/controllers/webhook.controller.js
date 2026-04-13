// ─── Webhook Controller ───────────────────────────────────────────────────────
// This is the RECEIVER side of the webhook system.
//
// POST /webhooks/receive  — accepts incoming webhook events, processes them
// GET  /webhooks/events   — returns the in-memory event log (great for demo)
//
// Teaching point: the receiver validates the secret header before processing.
// This is how real webhook providers protect their endpoints too
// (Stripe, GitHub, Shopify all use the same pattern).

import Confession from "../models/confession.model.js";
import { env } from "../config/env.js";

// In-memory log — in production you'd persist this in a DB or a log service
const eventLog = [];

// Triggered when a confession text contains flagged keywords
const handleFlagged = async (payload) => {
  await Confession.findByIdAndUpdate(payload.id, { flagged: true });
  console.log(`[Webhook] Confession ${payload.id} flagged ← keyword: "${payload.keyword}"`);
};

// Triggered when reports reach the threshold — auto-hides from the feed
const handleReported = async (payload) => {
  await Confession.findByIdAndUpdate(payload.id, { hidden: true });
  console.log(`[Webhook] Confession ${payload.id} hidden ← ${payload.reports} reports`);
};

// Triggered when upvotes hit 10 — marks as featured
const handleTrending = async (payload) => {
  await Confession.findByIdAndUpdate(payload.id, { featured: true });
  console.log(`[Webhook] Confession ${payload.id} featured ← ${payload.upvotes} upvotes`);
};

const HANDLERS = {
  "confession.flagged":  handleFlagged,
  "confession.reported": handleReported,
  "confession.trending": handleTrending,
};

// ── POST /webhooks/receive ────────────────────────────────────────────────────
export const receiveWebhook = async (req, res) => {
  // Step 1 — Verify the secret header (reject if it doesn't match)
  const incoming = req.headers["x-webhook-secret"];
  if (incoming !== env.WEBHOOK_SECRET) {
    console.warn("[Webhook] ⚠ Rejected — invalid secret");
    return res.status(401).json({ error: true, message: "Invalid webhook secret." });
  }

  const { event, payload, firedAt } = req.body;

  // Step 2 — Log the event
  eventLog.unshift({ event, payload, firedAt, receivedAt: new Date().toISOString() });
  if (eventLog.length > 100) eventLog.pop(); // keep log bounded

  // Step 3 — Route to the right handler
  const handler = HANDLERS[event];
  if (handler) {
    await handler(payload).catch((err) =>
      console.error(`[Webhook] Handler error for "${event}":`, err.message)
    );
  }

  // Always respond 200 quickly — the sender shouldn't wait on us
  res.json({ received: true, event });
};

// ── GET /webhooks/events ──────────────────────────────────────────────────────
export const getEvents = (req, res) => {
  res.json({
    data:  eventLog,
    total: eventLog.length,
  });
};
