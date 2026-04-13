// ─── Admin Routes ─────────────────────────────────────────────────────────────
// All routes prefixed with /admin (mounted in app.js).

import { Router } from "express";
import { adminController } from "../controllers/admin.controller.js";

const router = Router();

router.post("/login", adminController.login);

export default router;
