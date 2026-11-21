// The browser suite sends real requests to the built Worker with a fresh SQLite database.
import { createInterface } from "node:readline";
import worker from "../dist/server/index.js";
import { openDB } from "../server/local.mjs";
import { initialize, stmt } from "../server/catalog.mjs";
const db = openDB();
await initialize(db);
const candidate = {
  id: "review-example",
  title: "Editorial test briefing",
  summary: "Summary awaiting review.",
  date: "2026-11-21",
  publisher: "SEEKR test",
  url: "https://example.test/source",
  category: "Developer Tools",
  type: "Original announcement",
  why: null,
};
await stmt(
  db,
  "INSERT INTO review_queue(id,url,record,state) VALUES(?,?,?,?)",
  candidate.id,
  candidate.url,
  JSON.stringify(candidate),
  "pending",
).run();
for await (const line of createInterface({ input: process.stdin })) {
  const q = JSON.parse(line);
  const res = await worker.fetch(
    new Request(q.url, {
      method: q.method,
      headers: q.headers,
      body: q.body || undefined,
    }),
    { DB: db, CURATOR_EMAIL: "curator@seekr.test" },
  );
  console.log(
    JSON.stringify({
      status: res.status,
      headers: Object.fromEntries(res.headers),
      body: Buffer.from(await res.arrayBuffer()).toString("base64"),
    }),
  );
}
