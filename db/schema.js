import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
const id = () => text("id").primaryKey();
export const companies = sqliteTable("companies", {
  name: text("name").primaryKey(),
});
export const categories = sqliteTable("categories", {
  name: text("name").primaryKey(),
});
export const technologies = sqliteTable(
  "technologies",
  {
    id: id(),
    name: text("name").notNull(),
    company: text("company")
      .notNull()
      .references(() => companies.name),
    category: text("category")
      .notNull()
      .references(() => categories.name),
    status: text("status").notNull(),
    announced: text("announced"),
    released: text("released"),
    priceClass: text("price_class"),
    record: text("record").notNull(),
  },
  (t) => [
    index("tech_category_idx").on(t.category),
    index("tech_release_idx").on(t.released),
    index("tech_status_idx").on(t.status),
  ],
);
export const sources = sqliteTable(
  "sources",
  {
    tech: text("tech")
      .notNull()
      .references(() => technologies.id),
    url: text("url").notNull(),
    title: text("title").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tech, t.url] })],
);
export const news = sqliteTable(
  "news",
  {
    id: id(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    category: text("category").notNull(),
    url: text("url").notNull().unique(),
    record: text("record").notNull(),
  },
  (t) => [index("news_date_idx").on(t.date)],
);
export const bookmarks = sqliteTable(
  "bookmarks",
  {
    owner: text("owner").notNull(),
    key: text("key").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    created: text("created").notNull(),
  },
  (t) => [primaryKey({ columns: [t.owner, t.key] })],
);
export const collections = sqliteTable(
  "collections",
  {
    owner: text("owner").notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.owner, t.id] }),
    uniqueIndex("collection_names").on(t.owner, t.name),
  ],
);
export const items = sqliteTable(
  "collection_items",
  {
    owner: text("owner").notNull(),
    collection: text("collection").notNull(),
    key: text("key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.owner, t.collection, t.key] })],
);
export const preferences = sqliteTable("preferences", {
  owner: text("owner").primaryKey(),
  value: text("value").notNull(),
});
export const follows = sqliteTable(
  "follows",
  { owner: text("owner").notNull(), topic: text("topic").notNull() },
  (t) => [primaryKey({ columns: [t.owner, t.topic] })],
);
export const metrics = sqliteTable(
  "daily_views",
  {
    day: text("day").notNull(),
    tech: text("tech").notNull(),
    views: integer("views").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.tech] })],
);
export const logs = sqliteTable("ingestion_logs", {
  id: id(),
  time: text("time").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  detail: text("detail").notNull(),
});
export const pending = sqliteTable("review_queue", {
  id: id(),
  url: text("url").notNull().unique(),
  record: text("record").notNull(),
  state: text("state").notNull(),
});
export const meta = sqliteTable("metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const limits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
