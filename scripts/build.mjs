import { build as bundle } from "esbuild";
import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  cp,
  readdir,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
export async function build() {
  await mkdir("dist/client/assets", { recursive: true });
  await mkdir("dist/server", { recursive: true });
  await mkdir("dist/.openai", { recursive: true });
  await bundle({
    entryPoints: ["src/main.tsx"],
    bundle: true,
    minify: true,
    target: "es2022",
    jsx: "automatic",
    outfile: "dist/client/assets/app.js",
    define: { "process.env.NODE_ENV": '"production"' },
    external: ["/assets/*"],
  });
  await copyFile("src/index.html", "dist/client/index.html");
  for (const name of ["compass.svg", "terrain.svg"])
    await copyFile("src/" + name, "dist/client/assets/" + name);
  await cp("src/covers", "dist/client/assets", { recursive: true });
  execFileSync("tar", [
    "-czf",
    "dist/client/assets/seekr-source.tar.gz",
    "src",
    "server",
    "scripts",
    "tests",
    "data",
    "db",
    "drizzle",
    ".openai",
    ".gitignore",
    ".env.example",
    "README.md",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "drizzle.config.js",
  ]);
  const assets = {},
    types = {
      js: "application/javascript",
      css: "text/css",
      svg: "image/svg+xml",
      webp: "image/webp",
      gz: "application/gzip",
      html: "text/html; charset=utf-8",
    };
  for (const path of [
    "/index.html",
    ...(await readdir("dist/client/assets")).map((name) => "/assets/" + name),
  ])
    assets[path] = {
      type: types[path.split(".").pop()],
      content: (await readFile("dist/client" + path)).toString("base64"),
    };
  await bundle({
    entryPoints: ["server/worker.mjs"],
    bundle: true,
    minify: true,
    format: "esm",
    target: "es2022",
    platform: "browser",
    outfile: "dist/server/index.js",
    plugins: [
      {
        name: "assets",
        setup(b) {
          b.onResolve({ filter: /^seekr:assets$/ }, () => ({
            path: "assets",
            namespace: "seekr",
          }));
          b.onLoad({ filter: /.*/, namespace: "seekr" }, () => ({
            contents: JSON.stringify(assets),
            loader: "json",
          }));
        },
      },
    ],
  });
  await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
  await cp("drizzle", "dist/drizzle", { recursive: true });
  console.log("Built the SEEKR client and Worker.");
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  await build();
