// ─── Global Error Handler ─────────────────────────────────────────────────────
// The four-parameter signature (err, req, res, next) is how Express identifies
// an error handler. Register this LAST in app.js, after all routes.
//
// Handles three categories of errors:
//   1. AppError — our own thrown errors (safe message, known status)
//   2. Mongoose errors — DB-layer failures (CastError, ValidationError)
//   3. Everything else — unexpected crashes (generic 500, message hidden)

import { env } from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);

  // ── Mongoose: invalid ObjectId ────────────────────────────────────────────
  if (err.name === "CastError") {
    return res.status(400).json({
      error: true,
      message: `Invalid ID format: '${err.value}'`,
    });
  }

  // ── Mongoose: schema-level validation failure ─────────────────────────────
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      error: true,
      message: messages.join(" "),
    });
  }

  // ── MongoDB: duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      error: true,
      message: `Duplicate value for '${field}'.`,
    });
  }

  // ── Our own AppError ──────────────────────────────────────────────────────
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational === true;

  res.status(statusCode).json({
    error: true,
    message: isOperational
      ? err.message
      : "Something went wrong. Please try again.",
    // Only expose stack traces during local development
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
