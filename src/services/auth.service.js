// ─── Auth Service ─────────────────────────────────────────────────────────────
// JWT signing and verification isolated from HTTP concerns.
// The middleware and controller both call into here — no JWT logic leaks out.

import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const authService = {
  // Validate credentials and return a signed JWT
  login(username, password) {
    const isValid =
      username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD;

    if (!isValid) throw new AppError("Invalid credentials.", 401);

    // Payload is publicly readable inside the token — never put secrets here
    const token = jwt.sign(
      { username, role: "admin" },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return token;
  },

  // Verify a JWT string; throws AppError on failure
  verifyToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw new AppError("Invalid or expired token.", 401);
    }
  },
};
