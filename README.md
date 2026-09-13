# PDFHope

**Every PDF tool you need.**

PDFHope is a local-first PDF utility website built with React, TypeScript, Vite, `pdf-lib`, and PDF.js. Existing PDF tools process selected files in the browser. Word to PDF and PDF to Word use a narrowly scoped Cloudflare Worker endpoint backed by ConvertAPI because high-fidelity document conversion requires a server conversion engine.

## Implemented tools

- Merge PDF
- Split PDF by page, fixed interval, or custom groups
- Extract, delete, reorder, and rotate pages
- JPG, PNG, WebP, and mixed images to PDF
- PDF to JPG and PDF to PNG
- Best-effort PDF size breakdown
- Add page numbers and text watermarks
- Clean standard PDF metadata
- PDF Health Check
- Blank Page Detector
- Page Size Analyzer
- Orientation Analyzer
- Duplicate Page Finder
- Interleave and de-interleave PDFs
- 2-up and 4-up PDF handouts
- PDF contact sheets
- Word (DOC/DOCX) to PDF through ConvertAPI
- PDF to editable DOCX with automatic OCR through ConvertAPI

Inspection results such as blank pages, scanned pages, and duplicate candidates are explicitly labeled as heuristics. Password removal, encryption, OCR, compression, and permanent redaction are not faked; see [the roadmap](docs/ROADMAP.md).

## Technology

- React 19 and React Router
- TypeScript and Vite
- Official Cloudflare Vite plugin and Workers Static Assets
- `pdf-lib` for PDF creation and modification
- PDF.js for rendering, text checks, and page analysis
- `fflate` for in-browser ZIP creation
- Vitest and ESLint

The homepage and informational pages are route-split from the heavier tool workspace. PDF.js and its worker are loaded only by tool workflows that need page rendering.

## Local development

Prerequisites: Node.js 22+ and pnpm 10+.

```bash
pnpm install
pnpm dev
```

Set `CONVERTAPI_TOKEN` in `.dev.vars` to exercise document conversion locally. If the Cloudflare local runtime cannot write its registry on a restricted workstation, use the plain Vite preview mode (the conversion API is unavailable in this mode):

```powershell
$env:PDFHOPE_PLAIN_VITE='1'
pnpm dev
```

Open the local URL printed by Vite. No environment variables or backend services are required for the current tools.

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Tests cover page selection, Unicode filename safety, merge, split, extract, reorder, rotate, numbering, metadata cleaning, page dimensions, blank-page rules, and duplicate signature similarity.

## Production build

```bash
pnpm build
```

The official Cloudflare Vite plugin writes the production client bundle and generated deployment configuration to `dist/`. SPA routing is configured through `assets.not_found_handling: "single-page-application"` in `wrangler.jsonc`.

## Deploy to Cloudflare Workers

### Command line

1. Authenticate once with `pnpm wrangler login`.
2. Add the production token with `pnpm wrangler secret put CONVERTAPI_TOKEN`.
3. Run `pnpm deploy` from the repository root.
4. In the Cloudflare dashboard, attach the `pdfhope.com` custom domain to the deployed `pdfhope` Worker.

The deployment script runs a fresh Vite build before `wrangler deploy`.

### Git integration

Use these settings when connecting the GitHub repository in Cloudflare:

- Framework preset: **Vite** (or no preset)
- Root directory: `/`
- Build command: `pnpm build`
- Deploy command: `pnpm wrangler deploy`
- Build output directory: leave unset; the Cloudflare Vite plugin supplies the generated Workers configuration
- Node version: 22 or newer

Do not configure deprecated Workers Sites. This repository uses current Workers Static Assets behavior.

## Privacy architecture

- Existing local-tool file bytes stay in browser memory.
- `/api/convert/word-to-pdf` and `/api/convert/pdf-to-word` accept one validated file up to 20 MB, apply Cloudflare rate limiting, and stream it to ConvertAPI.
- ConvertAPI is called with `StoreFile=false`; source and result bytes are processed in memory and no R2 bucket is used.
- Theme, favorite tools, and recent tool routes use localStorage.
- Processed filenames are not persisted by default.
- PDF metadata is rendered through React text nodes rather than injected HTML.
- CSP, Permissions Policy, `nosniff`, referrer policy, and immutable asset caching are configured in `public/_headers`.
- The application does not execute embedded PDF JavaScript.

Local processing reduces server exposure but is not protection against a compromised device, browser, extension, or modified build. The site copy states that boundary directly.

## Project structure

```text
src/
  components/      Shared layout, upload, and page controls
  data/            Tool catalog and crawlable route content
  hooks/           SEO and WebMCP lifecycle hooks
  lib/pdf/         PDF operations, rendering, and heuristics
  pages/           Homepage, catalog, tool workspace, and policy pages
  styles/          Responsive visual system
  types/           Tool and browser API types
public/            Favicon, manifest, sitemap, robots, headers, redirects
docs/              Product roadmap and implementation boundaries
```

## Deployment notes

`wrangler.jsonc` is the source configuration. `vite build` emits `dist/wrangler.json`, which references the final client assets. Cloudflare’s SPA fallback serves `index.html` for navigation requests that do not match a static asset, allowing React Router routes to load directly.

## License

No open-source license has been selected yet. All rights are reserved unless the repository owner adds a license.
