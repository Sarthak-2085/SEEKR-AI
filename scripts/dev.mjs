import http from "node:http";
import { readFile } from "node:fs/promises";
import { refreshDue } from "../server/refresh.mjs";
import { openDB } from "../server/local.mjs";
import { handle } from "../server/api.mjs";
import { build } from "./build.mjs";
await build();
const db = openDB(".local/seekr.sqlite");
const arg = (name, def) =>
  process.argv.includes(name)
    ? process.argv[process.argv.indexOf(name) + 1]
    : def;
const host = arg("--host", "127.0.0.1"),
  port = Number(arg("--port", process.env.PORT || 4173));
const types = {
  gz: "application/gzip",
  js: "text/javascript",
  css: "text/css",
  svg: "image/svg+xml",
  webp: "image/webp",
  html: "text/html",
  woff2: "font/woff2",
};
http
  .createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://" + req.headers.host);
      if (u.pathname.startsWith("/api/")) {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers))
          if (v && !k.startsWith("oai-") && !k.startsWith("cf-"))
            headers.set(k, String(v));
        const chunks = [];
        let size = 0;
        for await (const part of req) {
          size += part.length;
          if (size > 40000) {
            res.writeHead(413);
            res.end();
            return;
          }
          chunks.push(part);
        }
        const r = await handle(
          new Request(u, {
            method: req.method,
            headers,
            body: ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
              ? Buffer.concat(chunks)
              : undefined,
          }),
          { ...process.env, DB: db, HOSTED: false },
        );
        res.writeHead(r.status, Object.fromEntries(r.headers));
        res.end(await r.text());
        return;
      }
      const path =
        u.pathname.startsWith("/assets/") &&
        /^\/assets\/[\w.-]+$/.test(u.pathname)
          ? u.pathname
          : "/index.html";
      const data = await readFile("dist/client" + path);
      res.writeHead(200, {
        "content-type":
          types[path.split(".").pop()] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, host, () =>
    console.log("SEEKR listening on http://" + host + ":" + port),
  );

const refresh = () =>
  refreshDue(db, process.env).catch(() =>
    console.error("Feed refresh unavailable"),
  );
void refresh();
setInterval(refresh, 3600000).unref();
