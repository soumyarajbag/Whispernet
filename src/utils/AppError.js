// ─── Custom Application Error ─────────────────────────────────────────────────
// Services and middleware throw AppError instead of the built-in Error.
// The global error handler checks `isOperational` to decide whether to expose
// the message to the client (safe) or swallow it (unexpected crash).

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Our error — safe to send to client
    Error.captureStackTrace(this, this.constructor);
  }
}
