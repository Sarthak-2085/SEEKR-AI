import { handle } from "./api.mjs";
import { refreshDue } from "./refresh.mjs";
import assets from "seekr:assets";
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshDue(env.DB, env));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (ctx && req.method === "GET" && url.pathname === "/api/dashboard")
      ctx.waitUntil(
        refreshDue(env.DB, env).catch(() =>
          console.error("Feed refresh unavailable"),
        ),
      );
    if (url.pathname.startsWith("/api/"))
      return handle(req, { ...env, DB: env.DB, HOSTED: true });
    if (req.method !== "GET" && req.method !== "HEAD")
      return new Response("Method not allowed", { status: 405 });
    const a =
      assets[
        url.pathname.startsWith("/assets/") ? url.pathname : "/index.html"
      ];
    if (!a) return new Response("File not found", { status: 404 });
    const headers = {
      "content-type": a.type,
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "cache-control": "no-cache",
      "content-security-policy":
        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    };
    return new Response(
      req.method === "HEAD"
        ? null
        : Uint8Array.from(atob(a.content), (c) => c.charCodeAt(0)),
      { headers },
    );
  },
};
