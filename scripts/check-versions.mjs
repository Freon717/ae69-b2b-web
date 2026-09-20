#!/usr/bin/env node
// Guards against the cache-busting drift described in ARCHITECTURE_REVIEW.md
// 3.3: styles.css/app.js in index.html and the static lib.js import in
// app.js each carry their own "?v=N" literal (no bundler to compute one
// from a single source of truth), so a partial bump silently ships stale
// cached code to phones. Fails CI if any of them disagree.
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appJs = readFileSync(new URL("../app.js", import.meta.url), "utf8");

const found = [];
for (const m of html.matchAll(/(styles\.css|app\.js)\?v=([\w.-]+)/g)) {
  found.push([`index.html:${m[1]}`, m[2]]);
}
const libImport = appJs.match(/from\s+"\.\/lib\.js\?v=([\w.-]+)"/);
if (libImport) found.push(["app.js:lib.js import", libImport[1]]);

if (found.length < 3) {
  console.error("check-versions: expected 3 cache-bust literals, found", found);
  process.exit(1);
}

const versions = new Set(found.map(([, v]) => v));
if (versions.size > 1) {
  console.error("check-versions: cache-bust literals are out of sync:");
  for (const [where, v] of found) console.error(`  ${where} -> v=${v}`);
  process.exit(1);
}

console.log(`check-versions: all cache-bust literals agree on v=${[...versions][0]}`);
