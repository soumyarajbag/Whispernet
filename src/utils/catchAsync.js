// ─── Async Error Wrapper ──────────────────────────────────────────────────────
// Eliminates try/catch boilerplate from every async controller method.
// Any rejected promise is forwarded to Express's next(err) pipeline,
// which lands in the global error handler automatically.
//
// Usage: router.get("/", catchAsync(async (req, res) => { ... }))

export const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
