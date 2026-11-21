import { enumPrices, statuses, techStatements, first } from "./catalog.mjs";
import { str, fail } from "./library.mjs";
export function safeLink(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
const day = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
export function validateTechnology(t) {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(str(t.id, 80)))
    fail(422, "Use a lowercase technology slug.");
  for (const k of [
    "name",
    "company",
    "category",
    "summary",
    "description",
    "why",
    "how",
    "difference",
    "audience",
    "limitations",
    "pricing",
    "rationale",
    "mark",
  ])
    str(t[k], 1600);
  for (const k of ["announced", "released", "expected"])
    if (t[k] !== null && !day(t[k]))
      fail(422, "Use a verified ISO date or null.");
  if (
    !day(t.verified) ||
    !Number.isInteger(t.score) ||
    t.score < 1 ||
    t.score > 10
  )
    fail(422, "Provide verification date and editorial score.");
  if (
    !statuses.includes(t.status) ||
    (t.priceClass !== null && !enumPrices.includes(t.priceClass))
  )
    fail(422, "Unsupported release or price status.");
  if (t.version !== null) str(t.version, 100);
  for (const k of ["free", "api", "open"])
    if (t[k] !== null && typeof t[k] !== "boolean")
      fail(422, "Use true, false, or null for availability.");
  for (const k of ["features", "changes", "capabilities"])
    if (
      !Array.isArray(t[k]) ||
      t[k].length > 40 ||
      t[k].some((v) => typeof v !== "string" || !v.trim() || v.length > 1400)
    )
      fail(422, "Invalid " + k + " list.");
  if (
    !safeLink(t.website) ||
    !safeLink(t.docs) ||
    !Array.isArray(t.sources) ||
    !t.sources.length ||
    t.sources.length > 20 ||
    t.sources.some(
      (s) => !safeLink(s.url) || typeof s.title !== "string" || !s.title.trim(),
    )
  )
    fail(422, "Provide official HTTPS URLs and named evidence sources.");
  return t;
}
export async function createTechnology(db, t) {
  validateTechnology(t);
  if (await first(db, "SELECT id FROM technologies WHERE id=?", t.id))
    fail(409, "Technology already exists.");
  await db.batch(techStatements(db, t));
  return t;
}
