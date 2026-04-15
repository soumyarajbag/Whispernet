# 👻 WhisperNet — Session Guide

> Each phase is a separate file. Read it top to bottom, do exactly what it says.

---

## 👥 Speaker Split

| | Speaker 1 | Speaker 2 |
|---|---|---|
| **Phases** | 1 → 6 | 7 → 10 |
| **Covers** | Init, Config, DB, First API, All endpoints, Validation | Auth, AuthZ, WebSocket, Webhooks, Error handling |

---

## ⏱ Timeline

```
── SPEAKER 1 ──────────────────────────────────────
0:00 – 0:08   Phase 1   Project Init
0:08 – 0:18   Phase 2   Config + DB
0:18 – 0:23   Phase 3   Utils
0:23 – 0:48   Phase 4   First Full API  (GET + POST)
0:48 – 1:05   Phase 5   Remaining APIs (upvote/report/delete)
1:05 – 1:10   Phase 6   Validation

── SPEAKER 2 ──────────────────────────────────────
1:10 – 1:28   Phase 7   Auth + AuthZ
1:33 – 1:43   Phase 8   WebSocket
1:43 – 1:53   Phase 9   Webhooks
1:53 – 2:00   Phase 10  Error Handling
```

---

## 📁 Phase Files

| File | Phase | Speaker |
|------|-------|---------|
| [phase-01-init.md](#file-phase-01-init-md) | Project Init | S1 |
| [phase-02-config-db.md](#file-phase-02-config-db-md) | Config + DB | S1 |
| [phase-03-utils.md](#file-phase-03-utils-md) | Utils | S1 |
| [phase-04-first-api.md](#file-phase-04-first-api-md) | First Full API | S1 |
| [phase-05-remaining-apis.md](#file-phase-05-remaining-apis-md) | Remaining APIs | S1 |
| [phase-06-validation.md](#file-phase-06-validation-md) | Validation | S1 |
| [phase-07-auth.md](#file-phase-07-auth-md) | Auth + AuthZ | S2 |
| [phase-08-websocket.md](#file-phase-08-websocket-md) | WebSocket | S2 |
| [phase-09-webhooks.md](#file-phase-09-webhooks-md) | Webhooks | S2 |
| [phase-10-error.md](#file-phase-10-error-md) | Error Handling | S2 |

> **Ctrl+click** or **middle-click** any link above to open it in a new tab.

---

## 🏗 What We're Building

```
Browser
  │
  ├─ REST   Routes → [Validate?] → [Auth?] → Controller → Service → MongoDB
  │                                               │
  │                                        fireWebhook()
  │                                               │
  │                                   POST /webhooks/receive
  │                                               │
  │                                     receiver updates DB
  │
  └─ WS    broadcast() → all connected tabs in real time
```
