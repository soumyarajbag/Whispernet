# Phase 3 — Utils
**Speaker 1 · 0:18 – 0:23**

---

## Step 1 — Create `src/utils/AppError.js`

> Paste this complete.

```js
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode    = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

> *"AppError is a custom error class that carries an HTTP status code with it.
> Services throw it when something goes wrong — the global error handler catches it and
> sends the right status code back to the client. isOperational = we threw it on purpose,
> so it's safe to show the message to the user."*

---

## Step 2 — Create `src/utils/catchAsync.js`

> Paste this complete.

```js
export const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

> *"Every controller method is async. Without catchAsync we'd need a try/catch in every single one.
> This wrapper catches any rejected promise and forwards it to next(err) automatically —
> which routes it to our global error handler. Zero boilerplate in controllers."*
