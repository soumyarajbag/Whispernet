// ─── Validation Runner Middleware ─────────────────────────────────────────────
// Reads the result of express-validator rule chains and rejects the request
// with structured error details if anything failed.
// Always place this AFTER your rules array, BEFORE the controller.

import { validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: true,
      message: "Validation failed.",
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};
