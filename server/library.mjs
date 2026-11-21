import { rows, first, stmt } from "./catalog.mjs";
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, msg) => {
  throw new ApiError(status, msg);
};
export const str = (v, max = 160) => {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    fail(422, "Enter a valid value (up to " + max + " characters).");
  return v.trim();
};
export async function library(db, owner) {
  const [saved, collections, items, follows, prefs] = await Promise.all([
    rows(
      db,
      "SELECT key,kind,title,created FROM bookmarks WHERE owner=? ORDER BY created DESC",
      owner,
    ),
    rows(
      db,
      "SELECT id,name FROM collections WHERE owner=? ORDER BY name",
      owner,
    ),
    rows(
      db,
      "SELECT collection,key FROM collection_items WHERE owner=?",
      owner,
    ),
    rows(db, "SELECT topic FROM follows WHERE owner=? ORDER BY topic", owner),
    first(db, "SELECT value FROM preferences WHERE owner=?", owner),
  ]);
  return {
    saved,
    collections: collections.map((c) => ({
      ...c,
      keys: items.filter((x) => x.collection === c.id).map((x) => x.key),
    })),
    follows: follows.map((x) => x.topic),
    preferences: prefs ? JSON.parse(prefs.value) : { pricing: "" },
  };
}
export async function resolveBookmark(db, key) {
  const [type, id] = key.split(":");
  if (!id || key.split(":").length !== 2) fail(422, "Invalid item.");
  if (type === "compare") {
    const ids = id.split(",");
    if (ids.length < 2 || ids.length > 3 || new Set(ids).size !== ids.length)
      fail(422, "Choose two or three different technologies.");
    const records = await Promise.all(
      ids.map((i) => first(db, "SELECT name FROM technologies WHERE id=?", i)),
    );
    if (records.some((x) => !x)) fail(404, "Technology not found.");
    return { kind: type, title: records.map((r) => r.name).join(" vs ") };
  }
  const sql =
    type === "tech"
      ? "SELECT name AS title FROM technologies WHERE id=?"
      : type === "news"
        ? "SELECT title FROM news WHERE id=?"
        : null;
  if (!sql) fail(422, "Unsupported item type.");
  const row = await first(db, sql, id);
  if (!row) fail(404, "Item not found.");
  return { kind: type, title: row.title };
}
export async function updateLibrary(db, owner, path, method, b) {
  if (path === "bookmarks") {
    const key = str(b.key, 240);
    if (method === "DELETE")
      await db.batch([
        stmt(
          db,
          "DELETE FROM collection_items WHERE owner=? AND key=?",
          owner,
          key,
        ),
        stmt(db, "DELETE FROM bookmarks WHERE owner=? AND key=?", owner, key),
      ]);
    else {
      const item = await resolveBookmark(db, key);
      await stmt(
        db,
        "INSERT OR IGNORE INTO bookmarks(owner,key,kind,title,created) VALUES(?,?,?,?,?)",
        owner,
        key,
        item.kind,
        item.title,
        new Date().toISOString(),
      ).run();
    }
  } else if (path === "collections") {
    if (method === "POST") {
      const name = str(b.name, 80);
      if (
        await first(
          db,
          "SELECT id FROM collections WHERE owner=? AND name=?",
          owner,
          name,
        )
      )
        fail(409, "A collection already uses this name.");
      await stmt(
        db,
        "INSERT INTO collections(owner,id,name) VALUES(?,?,?)",
        owner,
        crypto.randomUUID(),
        name,
      ).run();
    } else {
      const id = str(b.id, 80);
      if (
        !(await first(
          db,
          "SELECT id FROM collections WHERE owner=? AND id=?",
          owner,
          id,
        ))
      )
        fail(404, "Collection not found.");
      if (method === "DELETE")
        await db.batch([
          stmt(
            db,
            "DELETE FROM collection_items WHERE owner=? AND collection=?",
            owner,
            id,
          ),
          stmt(db, "DELETE FROM collections WHERE owner=? AND id=?", owner, id),
        ]);
      else if (b.name !== undefined) {
        const name = str(b.name, 80);
        if (
          await first(
            db,
            "SELECT id FROM collections WHERE owner=? AND name=? AND id<>?",
            owner,
            name,
            id,
          )
        )
          fail(409, "A collection already uses this name.");
        await stmt(
          db,
          "UPDATE collections SET name=? WHERE owner=? AND id=?",
          name,
          owner,
          id,
        ).run();
      } else {
        const key = str(b.key, 240);
        if (typeof b.add !== "boolean") fail(422, "Choose add or remove.");
        if (
          b.add &&
          !(await first(
            db,
            "SELECT key FROM bookmarks WHERE owner=? AND key=?",
            owner,
            key,
          ))
        )
          fail(422, "Save this item first.");
        await (
          b.add
            ? stmt(
                db,
                "INSERT OR IGNORE INTO collection_items(owner,collection,key) SELECT c.owner,c.id,b.key FROM collections c JOIN bookmarks b ON b.owner=c.owner WHERE c.owner=? AND c.id=? AND b.key=?",
                owner,
                id,
                key,
              )
            : stmt(
                db,
                "DELETE FROM collection_items WHERE owner=? AND collection=? AND key=?",
                owner,
                id,
                key,
              )
        ).run();
      }
    }
  } else if (path === "follows") {
    const topic = str(b.topic);
    if (!/^(Company|Category|Technology): .+/.test(topic))
      fail(422, "Invalid follow target.");
    await (
      method === "DELETE"
        ? stmt(
            db,
            "DELETE FROM follows WHERE owner=? AND topic=?",
            owner,
            topic,
          )
        : stmt(
            db,
            "INSERT OR IGNORE INTO follows(owner,topic) VALUES(?,?)",
            owner,
            topic,
          )
    ).run();
  } else if (path === "preferences") {
    if (
      ![
        "",
        "Completely Free",
        "Free Tier",
        "Freemium",
        "Paid",
        "Enterprise",
      ].includes(b.pricing)
    )
      fail(422, "Invalid price filter.");
    await stmt(
      db,
      "INSERT INTO preferences(owner,value) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET value=excluded.value",
      owner,
      JSON.stringify({ pricing: b.pricing }),
    ).run();
  }
  return library(db, owner);
}
