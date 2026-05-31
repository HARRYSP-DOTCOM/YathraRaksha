/**
 * Vercel build: copy static PWA assets into public/ (required output directory).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "public");

const COPY = [
  "index.html",
  "offline.html",
  "manifest.json",
  "sw.js",
  "css",
  "js",
  "icons",
  "data",
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (fs.existsSync(out)) {
  fs.rmSync(out, { recursive: true, force: true });
}
fs.mkdirSync(out, { recursive: true });

for (const item of COPY) {
  const src = path.join(root, item);
  if (!fs.existsSync(src)) {
    console.warn(`[build-public] skip missing: ${item}`);
    continue;
  }
  copyRecursive(src, path.join(out, item));
  console.log(`[build-public] copied ${item}`);
}

console.log("[build-public] done → public/");
