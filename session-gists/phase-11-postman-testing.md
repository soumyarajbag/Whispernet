# Phase 11 — Postman Testing Guide (Session Demo)

> Complete test cases for every REST endpoint, WebSocket connection, and webhook flow.
> Run these in order during the demo for a clean, end-to-end story.

---

## Setup — Environment Variables

Create a Postman **Environment** called `WhisperNet` with these variables:

| Variable        | Initial Value                    |
|-----------------|----------------------------------|
| `base_url`      | `http://localhost:3000`          |
| `ws_url`        | `ws://localhost:3000`            |
| `webhook_secret`| `whispernet-internal-secret`     |
| `admin_token`   | *(leave blank — filled by test)* |
| `confession_id` | *(leave blank — filled by test)* |

Set the environment as **active** before running any request.

---

## Part 1 — REST API Tests

---

### TC-01 · Admin Login

**Purpose:** Authenticate as admin and capture the JWT.

```
POST  {{base_url}}/admin/login
Content-Type: application/json
```

**Body (raw → JSON):**
```json
{
  "username": "moderator",
  "password": "supersecret"
}
```

**Expected response — 200 OK:**
```json
{
  "message": "Login successful.",
  "token": "<jwt_string>",
  "hint": "Decode your token live at https://jwt.io to inspect the payload."
}
```

**After the request — save the token:**
In the **Tests** tab, paste:
```js
const token = pm.response.json().token;
pm.environment.set("admin_token", token);
```

> Demo talking point: paste the token into jwt.io to show the payload live.

---

### TC-02 · Admin Login — Wrong Password

**Purpose:** Show that invalid credentials are rejected.

```
POST  {{base_url}}/admin/login
Content-Type: application/json
```

**Body:**
```json
{
  "username": "moderator",
  "password": "wrongpassword"
}
```

**Expected response — 401 Unauthorized:**
```json
{
  "error": true,
  "message": "Invalid credentials."
}
```

---

### TC-03 · Create a Confession (normal)

**Purpose:** POST a plain confession — triggers only the WebSocket broadcast.

```
POST  {{base_url}}/confessions
Content-Type: application/json
```

**Body:**
```json
{
  "text": "I still use Comic Sans unironically."
}
```

**Expected response — 201 Created:**
```json
{
  "data": {
    "id": "<mongo_id>",
    "text": "I still use Comic Sans unironically.",
    "upvotes": 0,
    "reports": 0,
    "flagged": false,
    "hidden": false,
    "featured": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**After the request — save the ID:**
```js
const id = pm.response.json().data.id;
pm.environment.set("confession_id", id);
```

> WebSocket clients will receive: `{ "event": "new_confession", "payload": { ... } }`

---

### TC-04 · Create a Confession — Triggers `confession.flagged` Webhook

**Purpose:** Show the automatic webhook fire when a flagged keyword is detected.

```
POST  {{base_url}}/confessions
Content-Type: application/json
```

**Body:**
```json
{
  "text": "This is urgent, I need help immediately."
}
```

**Expected response — 201 Created** (same shape as TC-03)

**What happens in the background (check server logs):**
```
[Webhook] ✓ Fired: confession.flagged → 200
[Webhook] Confession <id> flagged ← keyword: "urgent"
```

Verify by hitting `GET /webhooks/events` (TC-10) — the event will be at index 0.

> Flagged keywords: `urgent`, `help`, `danger`, `emergency`, `serious`

---

### TC-05 · Create a Confession — Validation Failure (empty text)

**Purpose:** Show express-validator rejecting a bad request before it reaches the DB.

```
POST  {{base_url}}/confessions
Content-Type: application/json
```

**Body:**
```json
{
  "text": ""
}
```

**Expected response — 422 Unprocessable Entity:**
```json
{
  "error": true,
  "message": "Validation failed.",
  "details": [
    { "field": "text", "message": "Confession text cannot be empty." }
  ]
}
```

---

### TC-06 · Create a Confession — Validation Failure (too long)

**Purpose:** Show the 500-character limit being enforced.

```
POST  {{base_url}}/confessions
Content-Type: application/json
```

**Body:**
```json
{
  "text": "A very long confession that is more than 500 characters long. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. EXTRA TEXT TO EXCEED LIMIT."
}
```

**Expected response — 422 Unprocessable Entity:**
```json
{
  "error": true,
  "message": "Validation failed.",
  "details": [
    { "field": "text", "message": "Confession must be 500 characters or fewer." }
  ]
}
```

---

### TC-07 · Get All Confessions (default)

**Purpose:** Fetch the feed with default sorting (newest first).

```
GET  {{base_url}}/confessions
```

**Expected response — 200 OK:**
```json
{
  "data": [ { ... }, { ... } ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### TC-08 · Get All Confessions — Sorted by Top, Paginated

**Purpose:** Show query param handling — sorted by upvotes, page 1, 5 per page.

```
GET  {{base_url}}/confessions?sort=top&page=1&limit=5
```

**Expected response — 200 OK:**
Same shape as TC-07, but `data` is ordered by `upvotes` descending.

---

### TC-09 · Upvote a Confession

**Purpose:** Increment upvotes and see the WebSocket broadcast.

```
PUT  {{base_url}}/confessions/{{confession_id}}/upvote
```

*(No body needed)*

**Expected response — 200 OK:**
```json
{
  "data": {
    "id": "{{confession_id}}",
    "upvotes": 1,
    ...
  }
}
```

> WebSocket clients will receive: `{ "event": "upvote_updated", "payload": { "id": "...", "upvotes": 1 } }`

Repeat this request **10 times** to trigger the `confession.trending` webhook (fires exactly at upvotes === 10).

---

### TC-10 · Report a Confession

**Purpose:** Increment report count; at 3 reports the `confession.reported` webhook fires and the confession is auto-hidden.

```
PUT  {{base_url}}/confessions/{{confession_id}}/report
```

*(No body needed)*

**Expected response — 200 OK:**
```json
{
  "data": {
    "id": "{{confession_id}}",
    "reports": 1,
    ...
  }
}
```

Run **3 times** — on the third hit, check server logs:
```
[Webhook] ✓ Fired: confession.reported → 200
[Webhook] Confession <id> hidden ← 3 reports
```

After 3 reports the confession disappears from `GET /confessions` (hidden=true).

---

### TC-11 · Delete a Confession — No Token (should fail)

**Purpose:** Show that the protected route rejects unauthenticated requests.

```
DELETE  {{base_url}}/confessions/{{confession_id}}
```

*(No Authorization header)*

**Expected response — 401 Unauthorized:**
```json
{
  "error": true,
  "message": "No token provided."
}
```

---

### TC-12 · Delete a Confession — With JWT

**Purpose:** Admin successfully removes a confession.

```
DELETE  {{base_url}}/confessions/{{confession_id}}
Authorization: Bearer {{admin_token}}
```

*(No body)*

**Expected response — 204 No Content** (empty body)

> WebSocket clients will receive: `{ "event": "confession_deleted", "payload": { "id": "..." } }`

Verify it's gone by hitting `GET /confessions` — the ID should no longer appear.

---

### TC-13 · Delete a Non-existent Confession

**Purpose:** Show proper 404 handling.

```
DELETE  {{base_url}}/confessions/000000000000000000000000
Authorization: Bearer {{admin_token}}
```

**Expected response — 404 Not Found:**
```json
{
  "error": true,
  "message": "Confession '000000000000000000000000' not found."
}
```

---

## Part 2 — Webhook Tests

---

### TC-14 · View Webhook Event Log

**Purpose:** See every webhook event the receiver has processed.

```
GET  {{base_url}}/webhooks/events
```

**Expected response — 200 OK:**
```json
{
  "data": [
    {
      "event": "confession.flagged",
      "payload": { "id": "...", "keyword": "urgent", "text": "..." },
      "firedAt": "...",
      "receivedAt": "..."
    }
  ],
  "total": 1
}
```

---

### TC-15 · Send a `confession.flagged` Webhook Manually

**Purpose:** Demonstrate the webhook receiver directly — simulates what the server fires automatically.

```
POST  {{base_url}}/webhooks/receive
Content-Type: application/json
x-webhook-secret: {{webhook_secret}}
```

**Body:**
```json
{
  "event": "confession.flagged",
  "payload": {
    "id": "{{confession_id}}",
    "keyword": "danger",
    "text": "This is a dangerous confession."
  },
  "firedAt": "2026-04-16T10:00:00.000Z"
}
```

**Expected response — 200 OK:**
```json
{
  "received": true,
  "event": "confession.flagged"
}
```

Verify in `GET /webhooks/events` — this event should appear at index 0.

---

### TC-16 · Send a `confession.trending` Webhook Manually

**Purpose:** Manually trigger the "featured" state on a confession.

```
POST  {{base_url}}/webhooks/receive
Content-Type: application/json
x-webhook-secret: {{webhook_secret}}
```

**Body:**
```json
{
  "event": "confession.trending",
  "payload": {
    "id": "{{confession_id}}",
    "upvotes": 10
  },
  "firedAt": "2026-04-16T10:00:00.000Z"
}
```

**Expected response — 200 OK:**
```json
{
  "received": true,
  "event": "confession.trending"
}
```

---

### TC-17 · Send a `confession.reported` Webhook Manually

**Purpose:** Manually trigger the "hidden" state on a confession.

```
POST  {{base_url}}/webhooks/receive
Content-Type: application/json
x-webhook-secret: {{webhook_secret}}
```

**Body:**
```json
{
  "event": "confession.reported",
  "payload": {
    "id": "{{confession_id}}",
    "reports": 3
  },
  "firedAt": "2026-04-16T10:00:00.000Z"
}
```

**Expected response — 200 OK:**
```json
{
  "received": true,
  "event": "confession.reported"
}
```

---

### TC-18 · Send Webhook — Wrong Secret (should fail)

**Purpose:** Show the secret header validation rejecting unauthorized callers.

```
POST  {{base_url}}/webhooks/receive
Content-Type: application/json
x-webhook-secret: wrong-secret
```

**Body:**
```json
{
  "event": "confession.flagged",
  "payload": { "id": "fake" },
  "firedAt": "2026-04-16T10:00:00.000Z"
}
```

**Expected response — 401 Unauthorized:**
```json
{
  "error": true,
  "message": "Invalid webhook secret."
}
```

---

## Part 3 — WebSocket Test

---

### TC-19 · Connect and Listen for Live Events

**Purpose:** Stay connected and watch real-time broadcasts triggered by REST actions.

1. In Postman, click **New** → **WebSocket Request**
2. URL: `ws://localhost:3000`
3. Click **Connect** — server logs will show `[WS] Client connected — total: 1`

**Keep the WS tab open**, then trigger events by sending REST requests in parallel tabs:

| REST Action | WS Message Received |
|---|---|
| `POST /confessions` | `{ "event": "new_confession", "payload": { ... } }` |
| `PUT /confessions/:id/upvote` | `{ "event": "upvote_updated", "payload": { "id": "...", "upvotes": N } }` |
| `DELETE /confessions/:id` | `{ "event": "confession_deleted", "payload": { "id": "..." } }` |
| Upvote reaches 10 | `confession.trending` webhook fires + `featured: true` in DB |
| Report count hits 3 | `confession.reported` webhook fires + `hidden: true` in DB |

**To disconnect:** click **Disconnect** — server logs will show `[WS] Client disconnected — total: 0`

---

## Demo Flow — Recommended Order

Run these in sequence for a clean end-to-end story in the session:

```
1.  TC-01  Admin Login                      → save token
2.  TC-03  Create normal confession          → save ID, watch WS (new_confession)
3.  TC-07  Get All Confessions               → show it in the feed
4.  TC-08  Get All sorted by top + paginated → show query params
5.  TC-05  Create empty confession           → show 422 validation error
6.  TC-09  Upvote ×1                        → watch WS (upvote_updated)
7.  TC-10  Report ×3                        → webhook fires, hidden from feed
8.  TC-04  Create confession with "urgent"   → auto webhook, check events log
9.  TC-14  GET /webhooks/events              → show the log
10. TC-15  Send webhook manually (flagged)   → show direct receiver call
11. TC-18  Send webhook wrong secret         → show 401 rejection
12. TC-11  DELETE without token              → show 401
13. TC-12  DELETE with token                 → 204, watch WS (confession_deleted)
14. TC-13  DELETE non-existent ID            → show 404
```

> Open the WebSocket tab (TC-19) **before step 2** and keep it open throughout —
> every broadcast will appear live in the Messages panel as you run the REST tests.
