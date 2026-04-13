// ─── Confession Routes ────────────────────────────────────────────────────────
// Route definitions are intentionally thin: method + path + middleware chain.
// The order of the middleware array is the order they execute:
//   [validationRules] → [validate] → [auth?] → [controller]

import { Router } from "express";
import { confessionController } from "../controllers/confession.controller.js";
import { verifyAdmin } from "../middleware/auth.middleware.js";
import { createConfessionRules } from "../validators/confession.validator.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

// Public routes
router.get("/",              confessionController.getAll);
router.post("/",             createConfessionRules, validate, confessionController.create);
router.put("/:id/upvote",   confessionController.upvote);
router.put("/:id/report",   confessionController.report);

// Protected route — verifyAdmin runs before the controller
router.delete("/:id",       verifyAdmin, confessionController.remove);

export default router;
