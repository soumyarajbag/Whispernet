// ─── Confession Service ───────────────────────────────────────────────────────
// All database operations and business logic live here.
// Controllers call service methods and hand the result to res.json().
// This separation means you can test business logic without HTTP overhead.

import Confession from "../models/confession.model.js";
import { AppError } from "../utils/AppError.js";

// Maps ?sort= query values to Mongoose sort objects
const SORT_MAP = {
  newest: { createdAt: -1 },
  top:    { upvotes: -1 },
};

export const confessionService = {
  // Fetch paginated + sorted confessions (hidden ones never reach the client)
  async getAll({ sort = "newest", page = 1, limit = 10 }) {
    const sortQuery = SORT_MAP[sort] ?? SORT_MAP.newest;
    const skip = (page - 1) * limit;
    const filter = { hidden: false }; // webhook receiver sets this to true on 3+ reports

    // Run count and find in parallel — one round-trip instead of two
    const [data, total] = await Promise.all([
      Confession.find(filter).sort(sortQuery).skip(skip).limit(limit),
      Confession.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Insert a new confession
  async create(text) {
    return Confession.create({ text });
  },

  // Atomically increment upvotes — $inc is safe under concurrent requests
  async upvote(id) {
    const confession = await Confession.findByIdAndUpdate(
      id,
      { $inc: { upvotes: 1 } },
      { new: true } // Return the updated document
    );
    if (!confession) throw new AppError(`Confession '${id}' not found.`, 404);
    return confession;
  },

  // Atomically increment reports
  async report(id) {
    const confession = await Confession.findByIdAndUpdate(
      id,
      { $inc: { reports: 1 } },
      { new: true }
    );
    if (!confession) throw new AppError(`Confession '${id}' not found.`, 404);
    return confession;
  },

  // Hard delete — returns the deleted document so the controller can log/broadcast it
  async remove(id) {
    const confession = await Confession.findByIdAndDelete(id);
    if (!confession) throw new AppError(`Confession '${id}' not found.`, 404);
    return confession;
  },
};
