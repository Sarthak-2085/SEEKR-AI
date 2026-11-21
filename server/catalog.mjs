import seed from "../data/catalog.json" with { type: "json" };
export const enumPrices = [
  "Completely Free",
  "Free Tier",
  "Freemium",
  "Paid",
  "Enterprise",
];
export const statuses = [
  "Announced",
  "Research Preview",
  "Beta",
  "Released",
  "Generally Available",
  "Discontinued",
];
export const rows = async (db, sql, ...args) =>
  (
    await db
      .prepare(sql)
      .bind(...args)
      .all()
  ).results;
export const first = (db, sql, ...args) =>
  db
    .prepare(sql)
    .bind(...args)
    .first();
export const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);
export function techStatements(db, t, replace = false) {
  const write = replace
    ? "ON CONFLICT(id) DO UPDATE SET name=excluded.name,company=excluded.company,category=excluded.category,status=excluded.status,announced=excluded.announced,released=excluded.released,price_class=excluded.price_class,record=excluded.record"
    : "ON CONFLICT(id) DO NOTHING";
  return [
    stmt(db, "INSERT OR IGNORE INTO companies(name) VALUES(?)", t.company),
    stmt(db, "INSERT OR IGNORE INTO categories(name) VALUES(?)", t.category),
    stmt(
      db,
      "INSERT INTO technologies(id,name,company,category,status,announced,released,price_class,record) VALUES(?,?,?,?,?,?,?,?,?) " +
        write,
      t.id,
      t.name,
      t.company,
      t.category,
      t.status,
      t.announced,
      t.released,
      t.priceClass,
      JSON.stringify(t),
    ),
    ...(replace ? [stmt(db, "DELETE FROM sources WHERE tech=?", t.id)] : []),
    ...t.sources.map((s) =>
      stmt(
        db,
        "INSERT OR IGNORE INTO sources(tech,url,title) VALUES(?,?,?)",
        t.id,
        s.url,
        s.title,
      ),
    ),
  ];
}
export const newsStmt = (db, n) =>
  stmt(
    db,
    "INSERT OR IGNORE INTO news(id,title,date,category,url,record) VALUES(?,?,?,?,?,?)",
    n.id,
    n.title,
    n.date,
    n.category,
    n.url,
    JSON.stringify(n),
  );
export async function initialize(db) {
  if (await first(db, "SELECT value FROM metadata WHERE key=?", "catalog-v1"))
    return;
  const changes = seed.technologies
    .flatMap((t) => techStatements(db, t))
    .concat(seed.news.map((n) => newsStmt(db, n)));
  for (let i = 0; i < changes.length; i += 50)
    await db.batch(changes.slice(i, i + 50));
  await stmt(
    db,
    "INSERT OR IGNORE INTO metadata(key,value) VALUES(?,?)",
    "catalog-v1",
    "ready",
  ).run();
}
export const decode = (r) => JSON.parse(r.record);
export const normalize = (s) =>
  String(s || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const ignored = new Set(
  "a an i me my to need want for that can the help with in of is use and it tools tool technology technologies please something find build professional please project tools an can for that use find get also budget cost no completely as on with into want need".split(
    " ",
  ),
);
const groups = [
  [
    "generate images",
    "image generation",
    "text to image",
    "ai images",
    "image generator",
    "illustration",
    "artwork",
  ],
  [
    "coding assistant",
    "ai coding",
    "coding agent",
    "code completion",
    "pair programming",
    "coding assistants",
  ],
  [
    "handwritten",
    "handwriting",
    "document ocr",
    "optical character recognition",
    "ocr",
    "extract text",
  ],
  ["generate video", "video generation", "text to video", "video generator"],
  ["speech to text", "transcribe", "transcription", "audio transcription"],
  ["llm", "language model", "chatbot", "text generation", "llms"],
  ["run locally", "offline", "local inference", "on device", "self hosted"],
  ["developer api", "api access", "api"],
  ["machine learning", "train models", "ml framework"],
];
const directName = (name, query) => normalize(name) === query;
export function matchTask(q, records) {
  const query = normalize(q),
    tokens = [
      ...new Set(
        query
          .split(" ")
          .filter(
            (t) =>
              t.length > 1 &&
              !ignored.has(t) &&
              ![
                "free",
                "open",
                "source",
                "paid",
                "local",
                "locally",
                "run",
                "that",
              ].includes(t),
          ),
      ),
    ];
  const free = /\b(free|budget|no cost)\b/.test(query),
    open = /\bopen source\b/.test(query),
    local = /\b(locally|offline|local|self hosted)\b/.test(query);
  const requested = groups.filter(
    (g) => g.some((x) => query.includes(x)) && !g.includes("run locally"),
  );
  return records
    .flatMap((t) => {
      if (
        t.status === "Discontinued" ||
        t.status === "Announced" ||
        (free && t.free !== true) ||
        (open && t.open !== true)
      )
        return [];
      const hay = normalize(
        [
          t.name,
          t.company,
          t.category,
          t.summary,
          ...t.capabilities,
          ...t.features,
          t.audience,
        ].join(" "),
      );
      if (
        local &&
        !/\b(local|locally|offline|self hosted|on device)\b/.test(hay)
      )
        return [];
      const hits = tokens.filter((k) => hay.split(" ").includes(k)),
        matched = requested.filter((g) => g.some((x) => hay.includes(x)));
      if (requested.length && !matched.length) return [];
      if (
        !requested.length &&
        tokens.length &&
        !hits.length &&
        !directName(t.name, query)
      )
        return [];
      const direct = normalize(t.name) === query,
        score =
          (direct ? 30 : 0) +
          matched.length * 7 +
          hits.length * 2 +
          (free ? 1 : 0) +
          (open ? 1 : 0) +
          (local ? 2 : 0);
      if (
        !score ||
        (!hits.length && !matched.length && !free && !open && !local)
      )
        return [];
      const reasons = [
        ...matched.map((g) => g.find((x) => hay.includes(x))),
        ...(free ? ["verified free access"] : []),
        ...(open ? ["open-source licensing"] : []),
        ...(local ? ["local execution"] : []),
      ];
      return [
        {
          ...t,
          matchReason: reasons.length
            ? "Matches your request for " + reasons.join(", ") + "."
            : "The catalog lists " +
              hits.slice(0, 3).join(", ") +
              " in its name or capabilities.",
          matchScore: score,
        },
      ];
    })
    .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name))
    .slice(0, 12);
}
export function useCases(tech) {
  const specs = [
    [
      "free-dev",
      "Free developer tools",
      "Free tools for building and testing software.",
      (t) =>
        t.free && /developer|framework|coding|infrastructure/i.test(t.category),
    ],
    [
      "open-models",
      "Open-source AI",
      "Models and libraries with open-source licensing.",
      (t) =>
        t.open &&
        /model|machine learning|open.source|audio|image/i.test(t.category),
    ],
    [
      "research",
      "Research tools",
      "Explore, train and evaluate machine learning systems.",
      (t) =>
        /research|train|experiment/i.test(
          [t.audience, t.summary, ...t.capabilities].join(" "),
        ),
    ],
    [
      "creators",
      "Tools for creators",
      "Work with images, audio and video.",
      (t) => /image|video|audio/i.test(t.category),
    ],
  ];
  return specs
    .map(([id, name, description, filter]) => ({
      id,
      name,
      description,
      ids: tech.filter(filter).map((t) => t.id),
    }))
    .filter((c) => c.ids.length);
}
