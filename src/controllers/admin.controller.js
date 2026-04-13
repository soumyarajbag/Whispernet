// ─── Admin Controller ─────────────────────────────────────────────────────────
// Handles admin HTTP requests and delegates to the auth service.

import { authService } from "../services/auth.service.js";
import { catchAsync } from "../utils/catchAsync.js";

export const adminController = {
  // POST /admin/login
  login: catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const token = authService.login(username, password);

    res.json({
      message: "Login successful.",
      token,
      hint: "Decode your token live at https://jwt.io to inspect the payload.",
    });
  }),
};
