import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
export function openDB(file = ":memory:") {
  if (file !== ":memory:") mkdirSync(".local", { recursive: true });
  const conn = new DatabaseSync(file);
  conn.exec(
    "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS local_migrations(name TEXT PRIMARY KEY)",
  );
  for (const name of readdirSync("drizzle")
    .filter((s) => s.endsWith(".sql"))
    .sort()) {
    if (
      conn.prepare("SELECT name FROM local_migrations WHERE name=?").get(name)
    )
      continue;
    conn.exec("BEGIN");
    try {
      conn.exec(readFileSync("drizzle/" + name, "utf8"));
      conn.prepare("INSERT INTO local_migrations VALUES(?)").run(name);
      conn.exec("COMMIT");
    } catch (e) {
      conn.exec("ROLLBACK");
      throw e;
    }
  }
  const prepare = (sql, args = []) => ({
    bind: (...v) => prepare(sql, v),
    first: () => conn.prepare(sql).get(...args) || null,
    all: () => ({ results: conn.prepare(sql).all(...args) }),
    run: () => ({ meta: { changes: conn.prepare(sql).run(...args).changes } }),
  });
  return {
    prepare,
    batch: async (statements) => {
      conn.exec("BEGIN");
      try {
        const results = statements.map((s) => s.run());
        conn.exec("COMMIT");
        return results;
      } catch (e) {
        conn.exec("ROLLBACK");
        throw e;
      }
    },
    close: () => conn.close(),
  };
}
