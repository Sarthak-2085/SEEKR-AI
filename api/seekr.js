import { createClient } from "@libsql/client/web";
import { handle } from "../server/api.mjs";
import { makeDatabase } from "../server/libsql.mjs";

let db;
export default {
  async fetch(request) {
    db ??= makeDatabase(createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }));
    const url = new URL(request.url);
    const route = url.searchParams.get("__seekr_route");
    if (route) url.pathname = "/api/" + route;
    url.searchParams.delete("__seekr_route");
    const headers = new Headers(request.headers);
    headers.delete("oai-authenticated-user-id");
    headers.delete("oai-authenticated-user-email");
    headers.delete("cf-connecting-ip");
    const ip = headers.get("x-vercel-forwarded-for");
    if (ip) headers.set("cf-connecting-ip",ip);
    const incoming = new Request(url, {method:request.method,headers,
      body:["GET","HEAD"].includes(request.method)?undefined:await request.arrayBuffer()});
    return handle(incoming,{...process.env,DB:db,HOSTED:false});
  },
};
