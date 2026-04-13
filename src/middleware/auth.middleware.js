// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Acts as a checkpoint: if the request can't prove admin identity,
// it never reaches the route handler below it.
//
// Expects: Authorization: Bearer <jwt>

import { authService } from "../services/auth.service.js";

export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: true,
      message: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = authService.verifyToken(token);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        error: true,
        message: "Forbidden. Admin role required.",
      });
    }

    req.user = decoded; // Available in any downstream handler
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      error: true,
      message: err.message,
    });
  }
};
