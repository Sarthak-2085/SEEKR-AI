// Fetch only allowlisted official sources and transfer candidates into editorial review.
import { feeds, fetchEntries } from "../server/ingest.mjs";
const origin = new URL(process.env.SEEKR_SITE_URL || "http://127.0.0.1:4173");
if (
  origin.protocol !== "https:" &&
  !["127.0.0.1", "localhost"].includes(origin.hostname)
)
  throw Error("Use HTTPS for a remote Site.");
if (!process.env.FEED_IMPORT_TOKEN)
  throw Error("Set FEED_IMPORT_TOKEN for the destination.");
const selected = process.argv.slice(2);
for (const key of selected.length ? selected : Object.keys(feeds)) {
  if (!Object.hasOwn(feeds, key)) throw Error("Unknown feed");
  try {
    const records = await fetchEntries(key);
    const items = records
      .map((x) => ({
        title: String(x.title || "").slice(0, 300),
        url: x.url,
        date: x.date,
        body: String(x.body || x.title || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 1500),
      }))
      .filter((x) => x.title && x.url && x.date);
    const response = await fetch(new URL("/api/ingestion/import", origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.FEED_IMPORT_TOKEN,
        ...(process.env.SEEKR_SITE_ACCESS
          ? {
              "OAI-Sites-Authorization":
                "Bearer " + process.env.SEEKR_SITE_ACCESS,
            }
          : {}),
      },
      body: JSON.stringify({ source: key, items }),
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw Error("Destination returned HTTP " + response.status);
    const result = await response.json();
    console.log(key, result.detail);
    if (result.status !== "ok") process.exitCode = 1;
  } catch (e) {
    console.error(key, e.message);
    process.exitCode = 1;
  }
}
