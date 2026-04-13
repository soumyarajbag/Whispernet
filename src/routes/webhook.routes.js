// ─── Webhook Routes ───────────────────────────────────────────────────────────
// GET  /webhooks/events   — view the event log (public, great for live demo)
// POST /webhooks/receive  — internal receiver (validated by secret header)

import { Router } from "express";
import { receiveWebhook, getEvents } from "../controllers/webhook.controller.js";

const router = Router();

router.get("/events",   getEvents);
router.post("/receive", receiveWebhook);

export default router;
