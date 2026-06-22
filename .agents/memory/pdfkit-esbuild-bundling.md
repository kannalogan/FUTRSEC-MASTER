---
name: pdfkit + esbuild bundling
description: Why pdfkit/fontkit crash when bundled by the api-server esbuild build, and the fix
---

# pdfkit / fontkit under esbuild (api-server)

The api-server bundles to a single ESM file via `artifacts/api-server/build.mjs`. pdfkit (and its dep fontkit) do NOT survive bundling for two separate reasons:

1. **fontkit → `@swc/helpers/cjs/_define_property.cjs`**: fontkit's compiled cjs does a runtime `require('@swc/helpers/...')`. esbuild's default `external: ["@swc/*"]` leaves it as a runtime require resolved relative to `dist/index.mjs`, which fails (MODULE_NOT_FOUND) and **crashes the worker on the request that renders a PDF** (lazy load — server boots & healthz=200, only PDF routes 500).
2. **pdfkit `.afm` font metrics**: pdfkit reads builtin font metrics with `fs.readFileSync(__dirname + '/data/Helvetica.afm')`. Bundled, `__dirname` = `dist/`, so it looks for `dist/data/Helvetica.afm` which does not exist → ENOENT at render time.

**Fix that works:** add `"pdfkit"` to the esbuild `external` list in `build.mjs`. Externalizing pdfkit makes it (and fontkit) load natively from `node_modules`, so pdfkit's real `__dirname` finds its `data/*.afm`, and fontkit's `@swc/helpers` require resolves from fontkit's own dir.

**Why:** the `external` list exists exactly for packages that use path traversal to read sibling files (sharp, canvas, @google-cloud/*). pdfkit belongs there. Fighting it with pnpm hoist tricks (`public-hoist-pattern[]=@swc/helpers`) does not reliably fix the bundled-require path.

**How to apply:** any new server dep that reads its own package files at runtime via `__dirname`/`fs` (fonts, .proto, .wasm, native addons) should be added to `external` in `build.mjs` rather than bundled. Symptom signature: server healthz fine but a specific route 500s with `MODULE_NOT_FOUND` for a transitive helper, or `ENOENT` for a file under `dist/`.
