#!/usr/bin/env node
/**
 * Drift check between the source OpenAPI document (platform's
 * `@footstepai/api-spec` package) and the copy committed under
 * `api/openapi.json` in this repo.
 *
 * Why this exists: the two files have drifted in the past (predict
 * schemas existed only in the committed copy, not the source). This
 * script catches that automatically so customer docs can't silently
 * drift from the canonical service contract.
 *
 * Path resolution:
 *   - Committed copy: `api/openapi.json` relative to this script.
 *   - Source: tries `node_modules/@footstepai/api-spec/openapi.json`
 *     first (when installed), then falls back to the monorepo
 *     sibling path `../platform/packages/api-spec/openapi.json` so
 *     local development works without a GitHub Packages auth dance.
 *
 * Run:                    pnpm check:openapi
 * Wire into CI as a required check on PRs to prevent regressions.
 *
 * If this fails, the fix is almost always one of:
 *   - port the change into `platform/packages/api-spec/openapi.json`
 *     (the canonical source) rather than editing the committed copy
 *     in this repo, then re-run `pnpm install` to sync, OR
 *   - if you intentionally need a doc-only annotation that doesn't
 *     belong in the runtime contract, put it in the MDX rather than
 *     hand-editing the OpenAPI copy.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const COMMITTED = resolve(root, "api/openapi.json");

const SOURCE_CANDIDATES = [
  // Installed via pnpm (production / CI with registry auth set up):
  resolve(root, "node_modules/@footstepai/api-spec/openapi.json"),
  // Local development fallback — the monorepo sibling path:
  resolve(root, "../platform/packages/api-spec/openapi.json"),
];

const source = SOURCE_CANDIDATES.find(existsSync);
if (!source) {
  console.error(
    "ERROR: api-spec source not found. Tried:\n" +
      SOURCE_CANDIDATES.map((p) => `  - ${p}`).join("\n"),
  );
  process.exit(2);
}
if (!existsSync(COMMITTED)) {
  console.error(`ERROR: committed spec not found at ${COMMITTED}`);
  process.exit(2);
}

const committed = JSON.parse(readFileSync(COMMITTED, "utf-8"));
const sourceDoc = JSON.parse(readFileSync(source, "utf-8"));

// Compare semantically by canonicalising key order. The two files are
// edited and re-serialised by different tools, so byte-equality would
// flag formatting churn (key order, whitespace) as drift even when the
// schemas are content-identical.
const canonicalise = (value) => {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = canonicalise(value[k]);
        return acc;
      }, {});
  }
  return value;
};

const committedStr = JSON.stringify(canonicalise(committed));
const sourceStr = JSON.stringify(canonicalise(sourceDoc));

if (committedStr === sourceStr) {
  console.log(
    `openapi: committed copy matches source api-spec ✓ (source: ${source})`,
  );
  process.exit(0);
}

// Drift detected — summarise the differences by structural keys so the
// failure message points at the right thing instead of dumping a giant
// JSON diff.
const committedPaths = new Set(Object.keys(committed.paths ?? {}));
const sourcePaths = new Set(Object.keys(sourceDoc.paths ?? {}));
const committedSchemas = new Set(
  Object.keys(committed.components?.schemas ?? {}),
);
const sourceSchemas = new Set(
  Object.keys(sourceDoc.components?.schemas ?? {}),
);

const pathsOnlyCommitted = [...committedPaths].filter(
  (p) => !sourcePaths.has(p),
);
const pathsOnlySource = [...sourcePaths].filter(
  (p) => !committedPaths.has(p),
);
const schemasOnlyCommitted = [...committedSchemas].filter(
  (s) => !sourceSchemas.has(s),
);
const schemasOnlySource = [...sourceSchemas].filter(
  (s) => !committedSchemas.has(s),
);

console.error("openapi drift detected:");
console.error(`  committed: ${COMMITTED}`);
console.error(`  source:    ${source}`);

if (pathsOnlyCommitted.length) {
  console.error("  paths only in committed copy:", pathsOnlyCommitted);
}
if (pathsOnlySource.length) {
  console.error("  paths only in source:", pathsOnlySource);
}
if (schemasOnlyCommitted.length) {
  console.error("  schemas only in committed copy:", schemasOnlyCommitted);
}
if (schemasOnlySource.length) {
  console.error("  schemas only in source:", schemasOnlySource);
}

if (
  pathsOnlyCommitted.length === 0 &&
  pathsOnlySource.length === 0 &&
  schemasOnlyCommitted.length === 0 &&
  schemasOnlySource.length === 0
) {
  console.error(
    "  Paths + schemas match by name but content differs somewhere. " +
      "Diff the two files to find the divergent field.",
  );
}

console.error(
  "\nTo fix: port the change to the canonical source " +
    "(platform/packages/api-spec/openapi.json) and re-sync, " +
    "OR move the change to an MDX file if it's doc-only.",
);
process.exit(1);
