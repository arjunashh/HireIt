/**
 * scripts/copy-zoom-assets.cjs
 * Copies the Zoom Meeting SDK static assets into public/zoom-lib
 * so the embedded Zoom client can load them at runtime.
 *
 * Runs automatically after `npm install` via the postinstall hook.
 */

const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../node_modules/@zoom/meetingsdk/dist/lib");
const dest = path.resolve(__dirname, "../public/zoom-lib");

if (!fs.existsSync(src)) {
  console.warn("[zoom-assets] @zoom/meetingsdk dist/lib not found — skipping copy.");
  process.exit(0);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from)) {
    const s = path.join(from, entry);
    const d = path.join(to, entry);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

copyDir(src, dest);
console.log("[zoom-assets] Copied Zoom SDK assets to public/zoom-lib");
