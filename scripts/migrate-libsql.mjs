import {readdir,readFile} from "node:fs/promises";
import {createClient} from "@libsql/client";
const db=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
try {
  await db.execute("CREATE TABLE IF NOT EXISTS seekr_migrations(name TEXT PRIMARY KEY)");
  for(const file of (await readdir("drizzle")).filter(p=>p.endsWith(".sql")).sort()){
    if((await db.execute({sql:"SELECT name FROM seekr_migrations WHERE name=?",args:[file]})).rows.length)continue;
    const statements=(await readFile("drizzle/"+file,"utf8")).split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean);
    await db.batch([...statements,{sql:"INSERT INTO seekr_migrations VALUES(?)",args:[file]}],"write");
    console.log("Applied",file);
  }
}finally{db.close()}
