import test from "node:test";
import assert from "node:assert/strict";
import { openDB } from "../server/local.mjs";
import { handle } from "../server/api.mjs";
import {
  extract,
  feeds,
  ingest,
  review,
  summarize,
} from "../server/ingest.mjs";
import { initialize, first, rows } from "../server/catalog.mjs";
import seed from "../data/catalog.json" with { type: "json" };
const request = (db, path, method = "GET", body, headers = {}, env = {}) =>
  handle(
    new Request("https://seekr.test/api/" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { DB: db, ...env },
  );
const get = async (db, path) => {
  const r = await request(db, path);
  assert.equal(r.status, 200);
  return r.json();
};
test("migrations, idempotent seed, required fields and source integrity", async () => {
  const db = openDB();
  await initialize(db);
  await initialize(db);
  assert.equal(
    (await first(db, "SELECT count(*) AS n FROM technologies")).n,
    seed.technologies.length,
  );
  for (const t of seed.technologies) {
    assert.ok(t.sources.length && t.verified && t.limitations);
    assert.ok(t.score >= 1 && t.score <= 10);
    assert.ok(t.sources.every((s) => s.url.startsWith("https://")));
    assert.ok(t.features.length);
  }
  assert.equal((await rows(db, "PRAGMA foreign_key_check")).length, 0);
  assert.equal(
    (await first(db, "PRAGMA integrity_check")).integrity_check,
    "ok",
  );
  db.close();
});
test("dashboard, pagination, category, release status, pricing, dates and detail routes", async () => {
  const db = openDB();
  const dash = await get(db, "dashboard");
  assert.ok(
    dash.launches.length >= 3 && dash.collections.length && dash.news.length,
  );
  const a = await get(db, "launches?limit=2&page=1"),
    b = await get(db, "launches?limit=2&page=2");
  assert.ok(!a.items.map((t) => t.id).includes(b.items[0].id));
  for (const path of [
    "technologies?category=Coding%20Agents&pricing=Completely%20Free",
    "launches?status=Released&from=2026-11-01&to=2026-11-21",
  ]) {
    const page = await get(db, path);
    assert.ok(page.total > 0);
    if (path.startsWith("technologies"))
      assert.ok(
        page.items.every(
          (t) =>
            t.category === "Coding Agents" &&
            t.priceClass === "Completely Free",
        ),
      );
    else
      assert.ok(
        page.items.every(
          (t) => t.released >= "2026-11-01" && t.released <= "2026-11-21",
        ),
      );
  }
  const a1 = await get(db, "technologies/" + a.items[0].id);
  assert.equal(a1.item.id, a.items[0].id);
  assert.ok(
    (await get(db, "upcoming")).items.every((t) =>
      ["Announced", "Research Preview", "Beta"].includes(t.status),
    ),
  );
  for (const [path, status] of [
    ["launches?from=2026-02-31", 422],
    ["launches?page=0", 422],
    ["compare?ids=codex,codex", 422],
    ["technologies/missing", 404],
  ])
    assert.equal((await request(db, path)).status, status);
  assert.equal(
    (await get(db, "compare?ids=codex,gemini-cli,aider")).items.length,
    3,
  );
  db.close();
});
test("global search covers companies, capabilities and briefings", async () => {
  const db = openDB();
  for (const q of ["Hugging Face", "coding", "audio"]) {
    const o = await get(db, "search?q=" + encodeURIComponent(q));
    assert.ok(o.technologies.total > 0);
  }
  assert.ok((await get(db, "search?q=Transformers")).news.total > 0);
  assert.equal(
    (await get(db, "search?q=xyz-impossible-xx")).technologies.total,
    0,
  );
  db.close();
});
test("six task queries work without AI, respect constraints and reject irrelevant tasks", async () => {
  const db = openDB();
  const cases = [
    ["generate professional AI images for free", "flux-schnell"],
    ["I need an AI coding assistant", "codex"],
    ["convert handwritten notes into editable documents", "trocr"],
    ["free tool for video generation", "wan"],
    ["I want to build an AI chatbot", "gpt-oss"],
    ["open-source LLM that I can run locally", "gpt-oss"],
  ];
  for (const [q, id] of cases) {
    const { items } = await get(
      db,
      "recommendations?q=" + encodeURIComponent(q),
    );
    assert.ok(
      items.some((t) => t.id === id),
      q,
    );
    assert.ok(items.every((t) => t.matchReason));
    if (q.includes("free")) assert.ok(items.every((t) => t.free === true));
  }
  assert.equal(
    (await get(db, "recommendations?q=free%20diamond%20cutting")).items.length,
    0,
  );
  db.close();
});
test("library authorization, owner isolation, idempotent saves, collections and follows", async () => {
  const db = openDB(),
    a = { "oai-authenticated-user-id": "account-a" },
    b = { "oai-authenticated-user-id": "account-b" };
  const mutate = async (p, m, body, h = a) => {
    const r = await request(db, p, m, body, h);
    assert.equal(r.status, 200);
    return r.json();
  };
  assert.equal((await request(db, "library")).status, 401);
  await mutate("bookmarks", "POST", { key: "tech:codex" });
  const l = await mutate("bookmarks", "POST", { key: "tech:codex" });
  assert.equal(l.saved.length, 1);
  const id = (await mutate("collections", "POST", { name: "Research" }))
    .collections[0].id;
  assert.equal(
    (await request(db, "collections", "PATCH", { id, name: "Other" }, b))
      .status,
    404,
  );
  await mutate("collections", "PATCH", { id, key: "tech:codex", add: true });
  await mutate("collections", "PATCH", { id, name: "Project" });
  await mutate("follows", "POST", { topic: "Company: OpenAI" });
  await mutate("preferences", "PUT", { pricing: "Paid" });
  const only = await (await request(db, "library", "GET", undefined, b)).json();
  assert.equal(only.saved.length, 0);
  assert.equal(only.collections.length, 0);
  const lib = await (await request(db, "library", "GET", undefined, a)).json();
  assert.deepEqual(lib.collections[0].keys, ["tech:codex"]);
  assert.equal(lib.preferences.pricing, "Paid");
  assert.equal(lib.collections[0].name, "Project");
  assert.equal(
    (await mutate("bookmarks", "DELETE", { key: "tech:codex" })).collections[0]
      .keys.length,
    0,
  );
  assert.equal(
    (await mutate("collections", "DELETE", { id })).collections.length,
    0,
  );
  assert.equal(
    (await request(db, "bookmarks", "POST", { key: "tech:missing" }, a)).status,
    404,
  );
  assert.equal(
    (
      await request(
        db,
        "preferences",
        "PUT",
        { pricing: "Paid" },
        { ...a, origin: "https://elsewhere.test" },
      )
    ).status,
    403,
  );
  db.close();
});
test("trends use views and news has a published source", async () => {
  const db = openDB();
  assert.equal((await get(db, "dashboard")).trending.length, 0);
  await request(db, "views", "POST", { id: "codex" });
  assert.equal((await get(db, "dashboard")).trending[0].id, "codex");
  const n = (await get(db, "news")).items[0];
  assert.equal((await get(db, "news/" + n.id)).url, n.url);
  db.close();
});
test("ingestion normalizes, deduplicates, stages review and keeps catalog available on failure", async () => {
  const db = openDB();
  await initialize(db);
  const feed = [
    {
      name: "Release example",
      tag_name: "v1",
      html_url: "https://github.com/pytorch/pytorch/releases/tag/test",
      published_at: "2025-01-01T12:00:00Z",
      body: "Added a tested operator.",
      draft: false,
    },
  ];
  const mock = async () => Response.json(feed);
  assert.equal((await ingest(db, "pytorch", {}, mock)).added, 1);
  assert.equal((await ingest(db, "pytorch", {}, mock)).skipped, 1);
  assert.equal(
    (
      await first(
        db,
        "SELECT count(*) AS n FROM news WHERE url=?",
        feed[0].html_url,
      )
    ).n,
    0,
  );
  const item = await first(db, "SELECT id FROM review_queue");
  assert.ok(
    await review(db, item.id, "approved", {
      why: "An operator became available.",
    }),
  );
  assert.equal(
    (
      await first(
        db,
        "SELECT count(*) AS n FROM news WHERE url=?",
        feed[0].html_url,
      )
    ).n,
    1,
  );
  assert.equal(
    (
      await ingest(
        db,
        "pytorch",
        {},
        async () => new Response(null, { status: 503 }),
      )
    ).status,
    "failed",
  );
  assert.ok((await get(db, "dashboard")).news.length > 0);
  assert.equal(
    extract(
      feeds.huggingface,
      "<rss><channel><item><title>Test</title><link>https://huggingface.co/blog/sample</link><pubDate>2025-01-01</pubDate></item></channel></rss>",
    )[0].title,
    "Test",
  );
  assert.throws(() => extract(feeds.huggingface, "<!DOCTYPE rss>"));
  db.close();
});
test("optional provider falls back for absent keys, timeouts and rate limits", async () => {
  const t = "New capability.",
    env = { AI_MODEL: "test", AI_SUMMARY_URL: "http://local.test" };
  assert.equal(await summarize(t, {}), t);
  assert.equal(
    await summarize(t, env, async () => {
      throw Error("timeout");
    }),
    t,
  );
  assert.equal(
    await summarize(t, env, async () => new Response(null, { status: 429 })),
    t,
  );
  assert.equal(
    await summarize(t, env, async () =>
      Response.json({
        choices: [{ message: { content: "Verified summary." } }],
      }),
    ),
    "Verified summary.",
  );
});
test("curator operations require authorization, evidence and valid dates", async () => {
  const db = openDB(),
    env = { INGEST_TOKEN: "test-admin" },
    h = { authorization: "Bearer test-admin" };
  assert.equal((await request(db, "admin/ingestion")).status, 403);
  const update = (b) => request(db, "admin/technology", "PATCH", b, h, env);
  assert.equal(
    (await update({ id: "codex", sourceUrl: "data:test" })).status,
    422,
  );
  assert.equal(
    (
      await update({
        id: "codex",
        sourceUrl: "https://openai.com",
        released: "2026-02-31",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await update({
        id: "codex",
        sourceUrl: "https://openai.com",
        summary: "Curated correction.",
      })
    ).status,
    200,
  );
  assert.equal(
    (await get(db, "technologies/codex")).item.summary,
    "Curated correction.",
  );
  db.close();
});

test("daily refresh takes one shared lease and keeps the catalog online", async () => {
  const { refreshDue } = await import("../server/refresh.mjs");
  const db = openDB();
  const remote = async (url) =>
    url.includes("api.github.com")
      ? Response.json([])
      : new Response("<rss><channel></channel></rss>");
  const result = await Promise.all([
    refreshDue(db, {}, remote, 1000),
    refreshDue(db, {}, remote, 1000),
  ]);
  assert.equal(result.filter((r) => r.started).length, 1);
  assert.equal((await rows(db, "SELECT id FROM ingestion_logs")).length, 3);
  assert.equal((await refreshDue(db, {}, remote, 9999)).started, false);
  assert.equal(
    (await refreshDue(db, { SEEKR_AUTO_INGEST: "0" }, remote, 99999999))
      .started,
    false,
  );
  db.close();
});

test("hosted curator requires matching verified identity, local callers are denied", async () => {
  const db = openDB(),
    env = { HOSTED: true, CURATOR_EMAIL: "curator@seekr.test" };
  const owner = {
    "oai-authenticated-user-id": "example",
    "oai-authenticated-user-email": "curator@seekr.test",
  };
  assert.equal(
    (await request(db, "admin/ingestion", "GET", undefined, owner, env)).status,
    200,
  );
  assert.equal(
    (
      await request(
        db,
        "admin/ingestion",
        "GET",
        undefined,
        { "oai-authenticated-user-email": "curator@seekr.test" },
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(db, "admin/ingestion", "GET", undefined, owner, {
        ...env,
        HOSTED: false,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        db,
        "admin/ingestion",
        "GET",
        undefined,
        { ...owner, "oai-authenticated-user-email": "reader@seekr.test" },
        env,
      )
    ).status,
    403,
  );
  db.close();
});

test("trusted feed importer validates publisher, deduplicates and stages without publishing", async () => {
  const db = openDB(),
    env = { FEED_IMPORT_TOKEN: "test-import" },
    headers = { authorization: "Bearer test-import" };
  const batch = {
    source: "pytorch",
    items: [
      {
        title: "Official release",
        url: "https://github.com/pytorch/pytorch/releases/tag/editor-test",
        date: "2026-11-01",
        body: "Source summary.",
      },
    ],
  };
  const send = (b, h = headers) =>
    request(db, "ingestion/import", "POST", b, h, env);
  assert.equal((await send(batch, {})).status, 403);
  assert.equal(
    (
      await send({
        ...batch,
        items: [{ ...batch.items[0], url: "https://example.org/invalid" }],
      })
    ).status,
    422,
  );
  assert.equal((await (await send(batch)).json()).added, 1);
  assert.equal((await (await send(batch)).json()).skipped, 1);
  assert.equal(
    (
      await first(
        db,
        "SELECT count(*) AS n FROM news WHERE url=?",
        batch.items[0].url,
      )
    ).n,
    0,
  );
  db.close();
});
