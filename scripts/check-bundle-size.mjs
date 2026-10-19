// Performance budget: fails the build if what a first-time visitor downloads
// up front (everything index.html references, gzipped) grows past the limit.
// Lazy route/feature chunks aren't counted - they load on demand.
//
//   node scripts/check-bundle-size.mjs [distDir]      (limit: BUNDLE_BUDGET_KB, default 300)
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";
const budgetKb = Number(process.env.BUNDLE_BUDGET_KB ?? 300);

const indexPath = join(dist, "index.html");
if (!existsSync(indexPath)) {
  console.error(`No ${indexPath} - run the build first.`);
  process.exit(2);
}

const html = readFileSync(indexPath, "utf8");
const assets = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);

let total = 0;
for (const asset of assets) {
  const kb = gzipSync(readFileSync(join(dist, asset))).length / 1024;
  total += kb;
  console.log(`  ${kb.toFixed(1).padStart(7)} KB  ${asset}`);
}
console.log(`Initial load: ${total.toFixed(1)} KB gzipped (budget ${budgetKb} KB)`);

if (total > budgetKb) {
  console.error(`FAIL: over budget by ${(total - budgetKb).toFixed(1)} KB. Lazy-load the new code or raise the budget deliberately.`);
  process.exit(1);
}
