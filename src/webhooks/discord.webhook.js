// ─── Discord Webhook Notifier ─────────────────────────────────────────────────
// Webhooks are "reverse APIs": we POST to Discord's URL and a message appears
// in a channel — Discord notifies us, not the other way around.
//
// Triggered by: "urgent" keyword in a confession, or 5+ reports.

import { env } from "../config/env.js";

export const notifyDiscord = async (confession) => {
  if (!env.DISCORD_WEBHOOK_URL || env.DISCORD_WEBHOOK_URL.includes("YOUR_ID")) {
    console.log("[Webhook] DISCORD_WEBHOOK_URL not configured — skipping.");
    return;
  }

  const payload = {
    username: "WhisperNet Bot",
    embeds: [
      {
        title: "🚨 Urgent Confession Flagged",
        description: confession.text,
        color: 0xff4444,
        fields: [
          { name: "ID",      value: String(confession.id),      inline: true },
          { name: "Upvotes", value: String(confession.upvotes), inline: true },
          { name: "Reports", value: String(confession.reports), inline: true },
        ],
        footer: { text: "WhisperNet Moderation System" },
        timestamp: confession.createdAt,
      },
    ],
  };

  try {
    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    res.ok
      ? console.log("[Webhook] Discord notification sent →", confession.id)
      : console.error("[Webhook] Discord error:", res.status, res.statusText);
  } catch (err) {
    console.error("[Webhook] Failed to reach Discord:", err.message);
  }
};
