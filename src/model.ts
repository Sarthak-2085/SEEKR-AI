export interface Tech {
  id: string;
  name: string;
  company: string;
  category: string;
  summary: string;
  description: string;
  why: string;
  how: string;
  difference: string;
  audience: string;
  limitations: string;
  features: string[];
  capabilities: string[];
  pricing: string;
  priceClass: string | null;
  free: boolean | null;
  api: boolean | null;
  open: boolean | null;
  website: string;
  docs: string;
  sources: { title: string; url: string }[];
  announced: string | null;
  released: string | null;
  expected: string | null;
  status: string;
  verified: string;
  version: string | null;
  changes: string[];
  score: number;
  rationale: string;
  mark: string;
  matchReason?: string;
}
export interface News {
  id: string;
  title: string;
  summary: string;
  date: string;
  publisher: string;
  url: string;
  category: string;
  why: string;
  type: string;
}
export interface Saved {
  key: string;
  kind: string;
  title: string;
  created: string;
}
export interface Shelf {
  id: string;
  name: string;
  keys: string[];
}
export interface Library {
  saved: Saved[];
  collections: Shelf[];
  follows: string[];
  preferences: { pricing: string };
}
export interface Session {
  curator?: boolean;
  authenticated: boolean;
  hosted: boolean;
  name: string | null;
}
export interface Curated {
  id: string;
  name: string;
  description: string;
  ids: string[];
}
export interface Dashboard {
  launches: Tech[];
  news: News[];
  upcoming: Tech[];
  trending: Tech[];
  recommended: Tech[];
  categories: string[];
  choices: { name: string; id: string; category: string }[];
  collections: Curated[];
  counts: { technologies: number; categories: number };
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export const prices = [
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
export function date(s: string | null, short = false) {
  return s
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        ...(!short ? { year: "numeric" as const } : {}),
        timeZone: "UTC",
      }).format(new Date(s))
    : "Not verified";
}
export const yes = (v: boolean | null) =>
  v === null ? "Not verified" : v ? "Yes" : "No";
export const address = (key: string) => {
  const [k, v] = key.split(":");
  return k === "compare"
    ? "/compare?ids=" + encodeURIComponent(v)
    : k === "tech"
      ? "/technology/" + v
      : "/briefing/" + v;
};
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch("/api/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "Request failed.");
  return data;
}
export function go(path: string) {
  history.pushState(null, "", path);
  dispatchEvent(new Event("seekr:navigate"));
}
