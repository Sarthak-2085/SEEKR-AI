import {
  initialize,
  rows,
  first,
  stmt,
  decode,
  matchTask,
  useCases,
  enumPrices,
  statuses,
  techStatements,
} from "./catalog.mjs";
import { ApiError, fail, str, library, updateLibrary } from "./library.mjs";
import { createTechnology } from "./curation.mjs";
import { feeds, ingest, review, trustedSourceLink } from "./ingest.mjs";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const decodeRows = async (db, sql, ...args) =>
  (await rows(db, sql, ...args)).map(decode);
const num = (v, def, max) => {
  if (v === null) return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > max)
    fail(422, "Invalid pagination.");
  return n;
};
const validDate = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
const safeUrl = (s) => {
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
};
async function page(db, table, search) {
  const conditions = [],
    args = [];
  for (const [key, col] of Object.entries(
    table === "news"
      ? { category: "category" }
      : {
          category: "category",
          status: "status",
          pricing: "price_class",
          company: "company",
        },
  )) {
    const v = search.get(key);
    if (v) {
      conditions.push(col + "=?");
      args.push(str(v));
    }
  }
  const q = search.get("q")?.trim();
  if (q) {
    const words = str(q, 400)
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 12);
    for (const w of words) {
      conditions.push("instr(lower(record),?)>0");
      args.push(w);
    }
  }
  const dateCol = table === "news" ? "date" : "coalesce(released,announced)";
  for (const [key, op] of [
    ["from", ">="],
    ["to", "<="],
  ]) {
    const v = search.get(key);
    if (v) {
      if (!validDate(v)) fail(422, "Use a valid calendar date.");
      conditions.push(dateCol + op + "?");
      args.push(v);
    }
  }
  if (search.get("upcoming") === "yes")
    conditions.push("status IN ('Announced','Beta','Research Preview')");
  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
  const sort = search.get("sort") || "latest";
  if (!["latest", "oldest", "name"].includes(sort))
    fail(422, "Unknown sort order.");
  const order =
    sort === "name"
      ? (table === "news" ? "title" : "name") + " COLLATE NOCASE"
      : dateCol +
        " IS NULL, " +
        dateCol +
        (sort === "oldest" ? " ASC" : " DESC");
  const page = num(search.get("page"), 1, 100000),
    size = num(search.get("limit"), 12, 100);
  const count = await first(
    db,
    "SELECT count(*) AS total FROM " + table + where,
    ...args,
  );
  return {
    items: await decodeRows(
      db,
      "SELECT record FROM " +
        table +
        where +
        " ORDER BY " +
        order +
        ", id LIMIT ? OFFSET ?",
      ...args,
      size,
      (page - 1) * size,
    ),
    total: count.total,
    page,
    limit: size,
  };
}
async function body(req) {
  if (Number(req.headers.get("content-length") || 0) > 40000)
    fail(413, "Request too large.");
  let b;
  const t = await req.text();
  if (t.length > 40000) fail(413, "Request too large.");
  try {
    b = JSON.parse(t);
  } catch {
    fail(400, "Invalid JSON.");
  }
  if (!b || Array.isArray(b) || typeof b !== "object")
    fail(422, "Expected an object.");
  return b;
}
async function limited(db, key, max, window = 60) {
  const now = Math.floor(Date.now() / 1000),
    bucket = Math.floor(now / window),
    expires = (bucket + 1) * window;
  await stmt(db, "DELETE FROM rate_limits WHERE expires<=?", now).run();
  const r = await first(
    db,
    "INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    key + ":" + bucket,
    expires,
  );
  if (r.count > max) fail(429, "Too many requests. Try again shortly.");
}
export async function handle(request, env) {
  try {
    const u = new URL(request.url),
      path = u.pathname.replace(/^\/api\/?/, "").replace(/\/$/, ""),
      db = env.DB,
      s = u.searchParams,
      m = request.method;
    const owner = request.headers.get("oai-authenticated-user-id"),
      email = request.headers.get("oai-authenticated-user-email");
    const isCurator = Boolean(
      env.HOSTED &&
        owner &&
        email &&
        env.CURATOR_EMAIL &&
        email.toLowerCase() === env.CURATOR_EMAIL.toLowerCase(),
    );
    const origin = request.headers.get("origin");
    if (
      m !== "GET" &&
      origin &&
      origin !== u.origin &&
      origin !== env.FRONTEND_ORIGIN
    )
      fail(403, "Origin is not allowed.");
    if (path === "session" && m === "GET")
      return json({
        authenticated: !!owner,
        curator: isCurator,
        name: owner ? email || "Signed in" : null,
        hosted: !!env.HOSTED,
      });
    await initialize(db);
    if (m !== "GET")
      await limited(
        db,
        "write:" +
          String(owner || request.headers.get("cf-connecting-ip") || "local"),
        120,
      );
    if (path === "dashboard" && m === "GET") {
      const tech = await decodeRows(
        db,
        "SELECT record FROM technologies ORDER BY coalesce(released,announced) DESC,name",
      );
      const news = await decodeRows(
        db,
        "SELECT record FROM news ORDER BY date DESC,title LIMIT 5",
      );
      const trending = await decodeRows(
        db,
        "SELECT t.record FROM daily_views v JOIN technologies t ON t.id=v.tech WHERE v.day>=date('now','-6 days') GROUP BY t.id ORDER BY sum(v.views) DESC,t.name LIMIT 4",
      );
      const upcoming = tech.filter((t) =>
        ["Announced", "Beta", "Research Preview"].includes(t.status),
      );
      return json({
        launches: tech.filter(
          (t) => !["Announced", "Discontinued"].includes(t.status),
        ),
        news,
        upcoming,
        trending,
        recommended: [...tech]
          .filter((t) => ["Released", "Generally Available"].includes(t.status))
          .sort((a, b) => b.score - a.score)
          .slice(0, 6),
        categories: [...new Set(tech.map((t) => t.category))].sort(),
        collections: useCases(tech),
        counts: {
          technologies: tech.length,
          categories: new Set(tech.map((t) => t.category)).size,
        },
        choices: tech.map(({ id, name, category }) => ({ id, name, category })),
      });
    }
    if (
      ["technologies", "launches", "upcoming", "news"].includes(path) &&
      m === "GET"
    ) {
      if (path === "upcoming") s.set("upcoming", "yes");
      return json(await page(db, path === "news" ? "news" : "technologies", s));
    }
    if (path.startsWith("technologies/") && m === "GET") {
      const row = await first(
        db,
        "SELECT record FROM technologies WHERE id=?",
        path.slice(13),
      );
      if (!row) fail(404, "Technology not found.");
      const item = decode(row);
      return json({
        item,
        related: await decodeRows(
          db,
          "SELECT record FROM technologies WHERE category=? AND id<>? ORDER BY released DESC LIMIT 3",
          item.category,
          item.id,
        ),
      });
    }
    if (path === "views" && m === "POST") {
      const b = await body(request),
        id = str(b.id);
      if (!(await first(db, "SELECT id FROM technologies WHERE id=?", id)))
        fail(404, "Technology not found.");
      await stmt(
        db,
        "INSERT INTO daily_views(day,tech,views) VALUES(date('now'),?,1) ON CONFLICT(day,tech) DO UPDATE SET views=views+1",
        id,
      ).run();
      return json({ ok: true });
    }
    if (path.startsWith("news/") && m === "GET") {
      const row = await first(
        db,
        "SELECT record FROM news WHERE id=?",
        path.slice(5),
      );
      if (!row) fail(404, "Briefing not found.");
      return json(decode(row));
    }
    if (path === "search" && m === "GET") {
      if (!s.get("q")?.trim()) fail(422, "Enter a search term.");
      return json({
        technologies: await page(db, "technologies", s),
        news: await page(db, "news", s),
      });
    }
    if (path === "recommendations" && m === "GET") {
      const q = str(s.get("q"), 400);
      let items = await decodeRows(db, "SELECT record FROM technologies");
      if (s.get("pricing"))
        items = items.filter((t) => t.priceClass === s.get("pricing"));
      return json({ items: matchTask(q, items) });
    }
    if (path === "compare" && m === "GET") {
      const ids = (s.get("ids") || "").split(",");
      if (ids.length < 2 || ids.length > 3 || new Set(ids).size !== ids.length)
        fail(422, "Choose two or three different technologies.");
      const r = await Promise.all(
        ids.map((id) =>
          first(db, "SELECT record FROM technologies WHERE id=?", id),
        ),
      );
      if (r.some((x) => !x)) fail(404, "Technology not found.");
      return json({ items: r.map(decode) });
    }
    if (
      [
        "library",
        "bookmarks",
        "collections",
        "preferences",
        "follows",
      ].includes(path)
    ) {
      if (!owner) fail(401, "Sign in to access account storage.");
      if (m === "GET") return json(await library(db, owner));
      const allowed = {
        bookmarks: ["POST", "DELETE"],
        collections: ["POST", "PATCH", "DELETE"],
        preferences: ["PUT"],
        follows: ["POST", "DELETE"],
      };
      if (!allowed[path]?.includes(m)) fail(405, "Unsupported method.");
      return json(await updateLibrary(db, owner, path, m, await body(request)));
    }
    if (path === "ingestion/import" && m === "POST") {
      if (
        !isCurator &&
        (!env.FEED_IMPORT_TOKEN ||
          request.headers.get("authorization") !==
            "Bearer " + env.FEED_IMPORT_TOKEN)
      )
        fail(403, "Feed import access required.");
      const b = await body(request);
      if (
        !Object.hasOwn(feeds, b.source) ||
        !Array.isArray(b.items) ||
        b.items.length > 15
      )
        fail(422, "Unsupported feed batch.");
      const items = b.items.map((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          !safeUrl(item.url) ||
          !trustedSourceLink(b.source, item.url) ||
          !Number.isFinite(Date.parse(item.date))
        )
          fail(422, "Invalid publisher URL or date.");
        return {
          url: str(item.url, 1000),
          title: str(item.title, 300),
          date: str(item.date, 80),
          body: str(item.body || item.title, 1600),
        };
      });
      return json(await ingest(db, b.source, env, fetch, items));
    }
    if (path.startsWith("admin/")) {
      if (
        !isCurator &&
        (!env.INGEST_TOKEN ||
          request.headers.get("authorization") !== "Bearer " + env.INGEST_TOKEN)
      )
        fail(403, "Administrator access required.");
      if (path === "admin/ingestion" && m === "GET")
        return json({
          sources: Object.keys(feeds),
          logs: await rows(
            db,
            "SELECT * FROM ingestion_logs ORDER BY time DESC LIMIT 100",
          ),
          pending: (
            await rows(
              db,
              "SELECT id,record FROM review_queue WHERE state='pending' LIMIT 100",
            )
          ).map(decode),
        });
      if (path === "admin/ingestion" && m === "POST") {
        const b = await body(request);
        if (!Object.hasOwn(feeds, b.source)) fail(422, "Unknown source.");
        await limited(db, "feed:" + b.source, 1, 300);
        return json(await ingest(db, b.source, env));
      }
      if (path === "admin/review" && m === "PATCH") {
        const b = await body(request);
        if (!["approved", "rejected"].includes(b.action))
          fail(422, "Invalid review decision.");
        const edit = {};
        for (const k of ["summary", "title", "why"])
          if (b[k] !== undefined) edit[k] = str(b[k], 800);
        if (b.action === "approved" && !edit.why)
          fail(422, "Supply an editorial reason before publishing.");
        if (!(await review(db, str(b.id), b.action, edit)))
          fail(404, "Pending item not found.");
        return json({ ok: true });
      }
      if (path === "admin/technology" && m === "POST")
        return json(await createTechnology(db, await body(request)), 201);
      if (path === "admin/technology" && m === "PATCH") {
        const b = await body(request);
        const row = await first(
          db,
          "SELECT record FROM technologies WHERE id=?",
          str(b.id),
        );
        if (!row) fail(404, "Technology not found.");
        const t = decode(row);
        for (const k of [
          "summary",
          "description",
          "limitations",
          "pricing",
          "version",
          "why",
          "how",
          "difference",
          "audience",
        ])
          if (b[k] !== undefined) t[k] = str(b[k], 1500);
        for (const k of ["released", "announced", "expected", "verified"])
          if (b[k] !== undefined) {
            if (b[k] !== null && !validDate(b[k])) fail(422, "Invalid date.");
            t[k] = b[k];
          }
        for (const k of ["free", "api", "open"])
          if (b[k] !== undefined) {
            if (b[k] !== null && typeof b[k] !== "boolean")
              fail(422, "Invalid availability.");
            t[k] = b[k];
          }
        if (b.priceClass !== undefined) {
          if (!enumPrices.includes(b.priceClass))
            fail(422, "Invalid pricing class.");
          t.priceClass = b.priceClass;
        }
        if (b.status !== undefined) {
          if (!statuses.includes(b.status)) fail(422, "Invalid status.");
          t.status = b.status;
        }
        if (!safeUrl(b.sourceUrl))
          fail(422, "An HTTPS evidence URL is required.");
        t.sources = [
          ...t.sources.filter((s) => s.url !== b.sourceUrl),
          { url: b.sourceUrl, title: "Correction source" },
        ];
        await db.batch(techStatements(db, t, true));
        return json(t);
      }
    }
    fail(404, "Route not found.");
  } catch (e) {
    if (!(e instanceof ApiError)) console.error("SEEKR request failed", e.name);
    return json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "SEEKR could not complete this request.",
      },
      e instanceof ApiError ? e.status : 500,
    );
  }
}
