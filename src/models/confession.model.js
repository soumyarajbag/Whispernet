// ─── Confession Model ─────────────────────────────────────────────────────────
// Mongoose schema = the shape of a document in the "confessions" collection.
// Constraints declared here are enforced at the DB layer — a second safety net
// after the express-validator rules in the request pipeline.

import mongoose from "mongoose";

const confessionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Confession text is required"],
      trim: true,
      maxlength: [500, "Confession must be 500 characters or fewer"],
    },
    upvotes: {
      type: Number,
      default: 0,
      min: [0, "Upvotes cannot be negative"],
    },
    reports: {
      type: Number,
      default: 0,
      min: [0, "Reports cannot be negative"],
    },
    // Set automatically by the internal webhook receiver — never by the client
    flagged:  { type: Boolean, default: false }, // contains sensitive keywords
    hidden:   { type: Boolean, default: false }, // auto-hidden after 3 reports
    featured: { type: Boolean, default: false }, // trending (10+ upvotes)
  },
  {
    // Automatically adds `createdAt` and `updatedAt` timestamps
    timestamps: true,

    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        // Rename _id → id and strip internal Mongoose fields from responses
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for efficient sorting — essential once you have thousands of docs
confessionSchema.index({ createdAt: -1 });
confessionSchema.index({ upvotes: -1 });

const Confession = mongoose.model("Confession", confessionSchema);
export default Confession;
