import { readFile } from "node:fs/promises";
import { openDB } from "../server/local.mjs";
import { initialize, rows } from "../server/catalog.mjs";
import { ingest, feeds, review } from "../server/ingest.mjs";
import { createTechnology } from "../server/curation.mjs";
const db = openDB(".local/seekr.sqlite");
await initialize(db);
const [action, arg, reason] = process.argv.slice(2);
try {
  if (action === "fetch") {
    const keys = arg ? [arg] : Object.keys(feeds);
    for (const key of keys) {
      if (!Object.hasOwn(feeds, key)) throw Error("Unknown source");
      const result = await ingest(db, key, process.env);
      console.log(key, result);
      if (result.status === "failed") process.exitCode = 1;
    }
  } else if (action === "pending") {
    console.log(
      JSON.stringify(
        (
          await rows(
            db,
            "SELECT record FROM review_queue WHERE state='pending' ORDER BY rowid DESC",
          )
        ).map((r) => JSON.parse(r.record)),
        null,
        2,
      ),
    );
  } else if (action === "approve" || action === "reject") {
    if (!arg || (action === "approve" && !reason?.trim()))
      throw Error("Supply the record ID and an editorial reason for approval.");
    if (
      !(await review(
        db,
        arg,
        action === "approve" ? "approved" : "rejected",
        action === "approve" ? { why: reason.trim() } : {},
      ))
    )
      throw Error("Pending item not found.");
    console.log("Review saved.");
  } else if (action === "add" && arg) {
    const record = await createTechnology(
      db,
      JSON.parse(await readFile(arg, "utf8")),
    );
    console.log("Added " + record.name);
  } else if (action === "logs")
    console.log(
      await rows(
        db,
        "SELECT time,source,status,detail FROM ingestion_logs ORDER BY time DESC LIMIT 25",
      ),
    );
  else
    throw Error(
      "Use fetch [source], pending, approve ID REASON, reject ID, add FILE, or logs.",
    );
} finally {
  db.close();
}
