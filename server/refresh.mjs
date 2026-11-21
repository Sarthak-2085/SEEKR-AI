import { first, initialize } from "./catalog.mjs";
import { feeds, ingest } from "./ingest.mjs";
export async function refreshDue(db, env, remote = fetch, now = Date.now()) {
  if (env.SEEKR_AUTO_INGEST === "0") return { started: false };
  await initialize(db);
  const key = "official-feed-refresh-after",
    current = await first(db, "SELECT value FROM metadata WHERE key=?", key);
  if (Number(current?.value || 0) > now) return { started: false };
  const claim = await first(
    db,
    "INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(metadata.value AS INTEGER)<=? RETURNING value",
    key,
    String(now + 86400000),
    now,
  );
  if (!claim) return { started: false };
  const results = [];
  for (const source of Object.keys(feeds))
    results.push(await ingest(db, source, env, remote));
  return { started: true, results };
}
