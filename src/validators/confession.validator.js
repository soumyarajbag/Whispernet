// ─── Confession Validators ────────────────────────────────────────────────────
// express-validator rules are arrays that get spread into route definitions.
// The validate.middleware.js runs after these rules and short-circuits the
// request with a 422 if any rule fails.

import { body } from "express-validator";

export const createConfessionRules = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Confession text cannot be empty.")
    .isLength({ max: 500 })
    .withMessage("Confession must be 500 characters or fewer."),
];
