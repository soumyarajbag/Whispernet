// Quick smoke-test — run with: node test.js
// (server must already be running on port 3000)

const BASE = "http://localhost:3000";

const json = (res) => res.json();
const post = (url, body, headers = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const put = (url, headers = {}) =>
  fetch(url, { method: "PUT", headers });

const del = (url, headers = {}) =>
  fetch(url, { method: "DELETE", headers });

const log = (label, data) =>
  console.log(`\n✓ ${label}\n`, JSON.stringify(data, null, 2));

(async () => {
  // 1. GET /confessions (newest)
  const feed = await fetch(`${BASE}/confessions`).then(json);
  log("GET /confessions (newest)", { total: feed.meta.total, firstText: feed.data[0]?.text?.slice(0, 60) });

  // 2. GET /confessions?sort=top&limit=2
  const top = await fetch(`${BASE}/confessions?sort=top&limit=2`).then(json);
  log("GET ?sort=top&limit=2", top.data.map((c) => ({ upvotes: c.upvotes, text: c.text.slice(0, 40) })));

  // 3. POST /confessions
  const created = await post(`${BASE}/confessions`, {
    text: "I have been writing tests after the code passes, not before.",
  }).then(json);
  log("POST /confessions", created.data);

  // 4. PUT /confessions/:id/upvote
  const upvoted = await put(`${BASE}/confessions/${created.data.id}/upvote`).then(json);
  log("PUT /upvote", { id: upvoted.data.id, upvotes: upvoted.data.upvotes });

  // 5. POST /admin/login
  const auth = await post(`${BASE}/admin/login`, {
    username: "moderator",
    password: "supersecret",
  }).then(json);
  const token = auth.token;
  log("POST /admin/login", { tokenStart: token?.slice(0, 40) + "..." });

  // 6. DELETE without token — expect 401
  const unauth = await del(`${BASE}/confessions/1`).then(json);
  log("DELETE (no token) → 401?", { error: unauth.error, message: unauth.message });

  // 7. DELETE with admin token — expect 204
  const authDel = await del(`${BASE}/confessions/${created.data.id}`, {
    Authorization: `Bearer ${token}`,
  });
  log(`DELETE /confessions/${created.data.id} (admin) → status`, { status: authDel.status });

  // 8. Invalid credentials
  const badLogin = await post(`${BASE}/admin/login`, {
    username: "hacker",
    password: "wrongpass",
  }).then(json);
  log("POST /admin/login (bad creds) → 401?", badLogin);

  console.log("\nAll tests passed ✔");
})();
