// ─── Confession Controller ────────────────────────────────────────────────────
// Controllers are the bridge between HTTP and the service layer.
// They have exactly one job: extract data from req, call the service,
// format the response. No business logic, no DB calls live here.

import { confessionService } from "../services/confession.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { broadcast } from "../websocket/broadcast.js";
import { fireWebhook } from "../webhooks/internal.webhook.js";

// Words that trigger a "confession.flagged" webhook event
const FLAGGED_KEYWORDS = ["urgent", "help", "danger", "emergency", "serious"];

export const confessionController = {
  // GET /confessions
  getAll: catchAsync(async (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const { sort } = req.query;

    const result = await confessionService.getAll({ sort, page, limit });
    res.json(result);
  }),

  // POST /confessions
  create: catchAsync(async (req, res) => {
    const confession = await confessionService.create(req.body.text);

    // Real-time push to all connected WebSocket clients
    broadcast("new_confession", confession);

    // ── Webhook triggers ──────────────────────────────────────────────────
    // Fire-and-forget: we don't await these — the response goes back immediately
    // and the webhook handler processes asynchronously in the background.

    const lowerText = confession.text.toLowerCase();
    const matchedKeyword = FLAGGED_KEYWORDS.find((w) => lowerText.includes(w));

    if (matchedKeyword) {
      // Event: confession.flagged → receiver marks it flagged in DB
      fireWebhook("confession.flagged", {
        id:      confession.id,
        keyword: matchedKeyword,
        text:    confession.text,
      });
    }

    res.status(201).json({ data: confession });
  }),

  // PUT /confessions/:id/upvote
  upvote: catchAsync(async (req, res) => {
    const confession = await confessionService.upvote(req.params.id);

    broadcast("upvote_updated", { id: confession.id, upvotes: confession.upvotes });

    // Event: confession.trending → receiver marks it featured in DB
    if (confession.upvotes === 10) {
      fireWebhook("confession.trending", {
        id:      confession.id,
        upvotes: confession.upvotes,
      });
    }

    res.json({ data: confession });
  }),

  // PUT /confessions/:id/report
  report: catchAsync(async (req, res) => {
    const confession = await confessionService.report(req.params.id);

    // Event: confession.reported → receiver auto-hides from the feed
    if (confession.reports >= 3) {
      fireWebhook("confession.reported", {
        id:      confession.id,
        reports: confession.reports,
      });
    }

    res.json({ data: confession });
  }),

  // DELETE /confessions/:id  (admin only — enforced by verifyAdmin middleware)
  remove: catchAsync(async (req, res) => {
    await confessionService.remove(req.params.id);
    broadcast("confession_deleted", { id: req.params.id });
    res.status(204).send();
  }),
};
